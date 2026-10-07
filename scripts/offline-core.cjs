// Servicio local: autoridad, persistencia transaccional e intercambio entre equipos.
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const DocumentSettings = require('./offline-documents.cjs');
const {policyFor,groupName,enrollmentCode}=require('./role-policy.cjs');
const APP = 'CETPRO_OFFLINE', VERSION = 1;
const canonical = value => JSON.stringify(value ?? null);
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
const pem = (key, type) => key.export({ type, format: 'pem' });
const pair = algorithm => { const k = crypto.generateKeyPairSync(algorithm); return { public: pem(k.publicKey, 'spki'), private: pem(k.privateKey, 'pkcs8') }; };
const sign = (value, key) => crypto.sign(null, Buffer.from(canonical(value)), key).toString('base64');
const verify = (value, signature, key) => crypto.verify(null, Buffer.from(canonical(value)), key, Buffer.from(signature, 'base64'));
const publicUser = u => ({ id: u.id, username: u.username, name: u.name,description:u.description||'', role: u.role, assignments: u.assignments || [], active: u.active,archived:!!u.archived, version: u.version });
const ADMIN = ['DIRECTOR', 'SECRETARIA'];
const TEMPLATES = {
  DIRECTOR: Array.from({ length: 21 }, (_, n) => `TMPL-${String(n + 1).padStart(2, '0')}`),
  SECRETARIA: ['TMPL-01', 'TMPL-02', 'TMPL-03', 'TMPL-18', 'TMPL-19', 'TMPL-20'],
  DOCENTE: Array.from({ length: 15 }, (_, n) => `TMPL-${String(n + 4).padStart(2, '0')}`)
};
function passwordRecord(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) fail('La contraseña debe tener entre 10 y 200 caracteres.');
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, digest: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function passwordMatches(password, u) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const digest = crypto.scryptSync(password, u?.salt || 'invalid-user-salt', 64);
  const expected = Buffer.from(u?.digest || '00'.repeat(64), 'hex');
  return expected.length === digest.length && crypto.timingSafeEqual(digest, expected) && !!u;
}
function tableEnvelope(value,password,decode=false){
  if(typeof password!=='string'||password.length<8||password.length>200)fail('La clave de intercambio debe tener entre 8 y 200 caracteres.');
  if(decode){try{if(!/^[a-f0-9]{32}$/.test(value.salt)||!/^[a-f0-9]{24}$/.test(value.iv)||!/^[a-f0-9]{32}$/.test(value.tag))throw Error();const key=crypto.scryptSync(password,value.salt,32),cipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(value.iv,'hex'));cipher.setAuthTag(Buffer.from(value.tag,'hex'));return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.data,'base64')),cipher.final()]).toString());}catch{fail('Clave de intercambio incorrecta o archivo dañado.');}}
  const salt=crypto.randomBytes(16).toString('hex'),iv=crypto.randomBytes(12),key=crypto.scryptSync(password,salt,32),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.from(canonical(value));if(bytes.length>20*1024*1024)fail('El intercambio supera el tamaño permitido. Exporte un grupo por separado.');
  return {salt,iv:iv.toString('hex'),tag:null,data:Buffer.concat([cipher.update(bytes),cipher.final()]).toString('base64'),...{tag:cipher.getAuthTag().toString('hex')}};
}
function seal(payload, recipient) {
  const ephemeral = pair('x25519');
  const shared = crypto.diffieHellman({ privateKey: crypto.createPrivateKey(ephemeral.private), publicKey: crypto.createPublicKey(recipient) });
  const key = crypto.createHash('sha256').update(shared).digest();
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(canonical(payload)), cipher.final()]);
  return { ephemeral: ephemeral.public, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}
function unseal(envelope, privateKey) {
  const shared = crypto.diffieHellman({ privateKey: crypto.createPrivateKey(privateKey), publicKey: crypto.createPublicKey(envelope.ephemeral) });
  const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(shared).digest(), Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString());
}

class OfflineCore {
  constructor(directory, backupFile = null) {
    this.directory = path.resolve(directory);
    fs.mkdirSync(this.directory, { recursive: true });
    this.db = new DatabaseSync(path.join(this.directory, 'cetpro.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records (entity TEXT, id TEXT, value TEXT NOT NULL, PRIMARY KEY(entity,id));
      CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, value TEXT NOT NULL, acknowledged INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, received TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deliveries (deviceId TEXT, operationId TEXT, acknowledged INTEGER DEFAULT 0, PRIMARY KEY(deviceId,operationId));
      CREATE TABLE IF NOT EXISTS conflicts (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    this.backupFile = backupFile;
    this.sessions = new Map(); this.attempts = new Map();
    if (!this.setting('device')) this.setting('device', { id: id(), signing: pair('ed25519'), encryption: pair('x25519') });
  }
  close() { this.db.close(); }
  setting(key, value) {
    if (value !== undefined) this.db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key, canonical(value));
    const row = this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);
    return row ? JSON.parse(row.value) : null;
  }
  transaction(fn) {const nested=(this.transactionDepth||0)>0,savepoint='batch_'+(this.transactionDepth||0);this.db.exec(nested?`SAVEPOINT ${savepoint}`:'BEGIN IMMEDIATE');this.transactionDepth=(this.transactionDepth||0)+1;try{const result=fn();this.db.exec(nested?`RELEASE ${savepoint}`:'COMMIT');return result;}catch(e){this.db.exec(nested?`ROLLBACK TO ${savepoint}`:'ROLLBACK');if(nested)this.db.exec(`RELEASE ${savepoint}`);throw e;}finally{this.transactionDepth--;}}
  audit(action, user, detail) { this.db.prepare('INSERT INTO audit VALUES (?,?)').run(id(), canonical({ action, userId: user?.id, at: now(), detail })); }
  users() { return this.db.prepare('SELECT value FROM users').all().map(r => JSON.parse(r.value)); }
  user(userId) { return this.users().find(u => u.id === userId); }
  putUser(u) { this.db.prepare('INSERT OR REPLACE INTO users VALUES (?,?,?)').run(u.id, u.username, canonical(u)); }
  records(entity) { return this.db.prepare('SELECT value FROM records WHERE entity=?').all(entity).map(r => JSON.parse(r.value)); }
  record(entity, recordId) { const row = this.db.prepare('SELECT value FROM records WHERE entity=? AND id=?').get(entity, recordId); return row ? JSON.parse(row.value) : null; }
  putRecord(entity, value) { this.db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?)').run(entity, value.id, canonical(value)); }
  operations() { return this.db.prepare('SELECT value FROM operations').all().map(r => JSON.parse(r.value)); }
  status() {
    const institution = this.setting('institution');
    return { initialized: !!institution, institutionName: institution?.name, deviceId: this.setting('device').id,demonstration:this.setting('documentDemo')===true,
      authority: !!this.setting('authorityPrivate'), fingerprint: institution ? hash(institution.publicKey) : null,
      validUntil: this.setting('certificate')?.body.validUntil, baselineAvailable: !!this.backupFile && fs.existsSync(this.backupFile) };
  }
  requireRole(user, roles) { if (!user?.active || !roles.includes(user.role)) fail('Esta función no pertenece a su cuenta.', 403); }
  assignment(user, groupId, unit = null) {
    if (!user?.active) return false;
    if (user.role !== 'DOCENTE') return true;
    const group = this.record('groups', groupId);
    return (user.assignments || []).some(a => a.groupId === groupId && (!a.periodId || a.periodId === group?.periodId) && (!unit || (a.units || []).includes(unit)));
  }
  requireGroup(user, groupId, unit = null) { if (!this.record('groups', groupId) || !this.assignment(user, groupId, unit)) fail('No tiene acceso a este grupo o unidad.', 403); }
  certificate(user, device) {
    const body = { institutionId: this.setting('institution').id, deviceId: device.id, signingKey: device.signingKey || device.signing.public,
      encryptionKey: device.encryptionKey || device.encryption.public, user: publicUser(user), validUntil: new Date(Date.now() + 90 * 86400000).toISOString() };
    return { body, signature: sign(body, this.setting('authorityPrivate')) };
  }
  setup(input) {
    if (this.status().initialized) fail('El equipo ya está configurado.', 409);
    const credential = passwordRecord(input.password);
    const username = this.username(input.username);
    if (!String(input.name || '').trim()) fail('Ingrese el nombre del director.');
    return this.transaction(() => {
      const authority = pair('ed25519'), device = this.setting('device');
      this.setting('authorityPrivate', authority.private);
      this.setting('institution', { id: id(), name: String(input.institutionName || 'CETPRO').trim(), publicKey: authority.public, hub: { id: device.id, encryptionKey: device.encryption.public } });
      const user = { id: id(), username, name: input.name.trim(), role: 'DIRECTOR', active: true, assignments: [], version: 1, ...credential };
      this.putUser(user); this.setting('certificate', this.certificate(user, device));
      this.setting('devices', [{ id: device.id, userId: user.id, signingKey: device.signing.public, encryptionKey: device.encryption.public }]);
      const catalogFile = path.join(__dirname, '..', 'app', 'operational', 'catalog-seed.json');
      if (fs.existsSync(catalogFile)) { const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8')); for (const [entity, entries] of [['programs', catalog.programas], ['modules', catalog.modulos]]) for (const entry of entries) this.write(user, entity, { ...entry }); }
      if (input.importBaseline && this.backupFile && fs.existsSync(this.backupFile)) this.importLegacy(user, JSON.parse(fs.readFileSync(this.backupFile, 'utf8')), true);
      this.audit('SETUP', user, { institutionId: this.setting('institution').id });
      return { success: true, fingerprint: this.status().fingerprint };
    });
  }
  username(value) { const v = String(value || '').trim().toLowerCase(); if (!/^[a-z0-9._-]{3,60}$/.test(v)) fail('Usuario: 3 a 60 letras, números, puntos, guiones o guiones bajos.'); return v; }
  login(input, address = 'local') {
    if (!this.setting('authorityPrivate') && this.status().validUntil && this.status().validUntil < now()) fail('La autorización offline venció. Dirección debe renovar la vinculación de este equipo.', 403);
    const username=String(input.username||'').trim().toLowerCase();
    const user=this.users().find(u=>u.username===username);
    const key=`${address}:${username}`,cached=this.attempts.get(key);
    // Una recuperación autorizada debe permitir entrar con la clave nueva sin esperar el bloqueo anterior.
    const attempts=cached&&cached.version===(user?.version||null)?cached:{count:0,until:0,version:user?.version||null};
    if (attempts.until > Date.now()) fail('Demasiados intentos. Espere cinco minutos.', 429);
    if (!passwordMatches(input.password, user) || !user.active) {
      attempts.count++; if (attempts.count >= 5) { attempts.until = Date.now() + 300000; attempts.count = 0; }
      this.attempts.set(key, attempts); fail('Usuario o contraseña incorrectos.', 401);
    }
    this.attempts.delete(key);
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, { userId: user.id, expires: Date.now() + 8 * 3600000, version: user.version });
    this.audit('LOGIN', user, {}); return { token, user: publicUser(user) };
  }
  authenticate(token) {
    const s = this.sessions.get(token), user = s && this.user(s.userId);
    if (!s || s.expires < Date.now() || !user?.active || user.version !== s.version || (!this.setting('authorityPrivate') && this.status().validUntil < now())) { this.sessions.delete(token); fail('Inicie sesión nuevamente.', 401); }
    return user;
  }
  logout(token) { this.sessions.delete(token); return { success: true }; }
  listUsers(actor){this.requireRole(actor,ADMIN);const profiles=this.setting('authorityPrivate')?this.users().map(publicUser):this.records('userDirectory');return actor.role==='SECRETARIA'?profiles.filter(u=>u.role==='DOCENTE'):profiles;}
  saveUser(actor, input,credential=null) {
    this.requireRole(actor, ADMIN);
    if(actor.role==='SECRETARIA'&&(input.role!=='DOCENTE'||(input.id&&(this.user(input.id)||this.record('userDirectory',input.id))?.role!=='DOCENTE')))fail('Secretaría solo registra y administra docentes. Dirección administra los demás roles.',403);
    if(!this.setting('authorityPrivate'))return this.requestUserRegistration(actor,input);
    const current = input.id ? this.user(input.id) : null;
    if (input.id && !current) fail('Cuenta no encontrada.', 404);
    if(current&&input.version!==undefined&&Number(input.version)!==current.version)fail('La cuenta cambió. Recargue antes de actualizarla.',409);
    if (!['DIRECTOR', 'SECRETARIA', 'DOCENTE'].includes(input.role)) fail('Rol inválido.');
    if (current?.role === 'DIRECTOR' && (input.role !== 'DIRECTOR' || input.active === false) && this.users().filter(u => u.active && u.role === 'DIRECTOR').length <= 1) fail('Debe conservar un director activo.');
    const assignments = input.role === 'DOCENTE' ? input.assignments || [] : [];
    if (input.role === 'DOCENTE' && !assignments.length) fail('Asigne al menos un grupo y sus unidades.');
    for (const a of assignments) {
      const group = this.record('groups', a.groupId);
      if (!group || !Array.isArray(a.units) || !a.units.length || a.units.some(u => !(group.units || []).includes(u))) fail('Asignación inválida: configure primero las unidades del grupo.');
      a.periodId = group.periodId; a.programId = group.programId; a.moduleId = group.moduleId;
    }
    const username = this.username(input.username);
    if (this.users().some(u => u.username === username && u.id !== current?.id)) fail('El usuario ya existe.', 409);
    const user = { ...current, id: current?.id || id(), username, name: String(input.name || '').trim(),description:String(input.description||'').trim().slice(0,600), role: input.role, active: input.active !== false,
      assignments,archived:input.archived===undefined?!!current?.archived:!!input.archived, version: (current?.version || 0) + 1, ...(credential|| (input.password ? passwordRecord(input.password) : {})) };
    if (!user.name || !user.digest) fail('Nombre y contraseña inicial obligatorios.');
    this.transaction(() => { this.putUser(user);this.write(actor,'userDirectory',publicUser(user),this.record('userDirectory',user.id)?.rev||null);this.audit('USER_UPDATE', actor, publicUser(user)); });
    return publicUser(user);
  }
  requestUserRegistration(actor,input){
    this.requireRole(actor,['SECRETARIA']);if(input.role!=='DOCENTE')fail('En este equipo solo administra docentes.',403);
    const username=this.username(input.username),name=String(input.name||'').trim();if(!name||!input.assignments?.length)fail('Nombre, carrera y grupo son obligatorios.');
    for(const a of input.assignments){const g=this.record('groups',a.groupId);if(!g||!a.units?.length||a.units.some(u=>!g.units.includes(u)))fail('Asignación docente inválida.');}
    const current=input.id?this.record('userDirectory',input.id):null;if(this.records('userDirectory').some(u=>u.username===username&&u.id!==input.id)||this.records('accountRequests').some(r=>r.username===username&&r.status==='REQUESTED'))fail('Ese usuario ya existe o tiene una solicitud pendiente.',409);if(input.id&&(!current||current.role!=='DOCENTE'))fail('Docente no encontrado.');if(current&&input.version!==undefined&&Number(input.version)!==current.version)fail('La cuenta cambió. Actualice el directorio.',409);
    const credentials=input.password?passwordRecord(input.password):null;if(!current&&!credentials)fail('Ingrese una contraseña inicial.');const value={id:id(),status:'REQUESTED',action:current?'UPDATE':'CREATE',userId:current?.id,expectedVersion:current?.version,active:input.active!==false,archived:!!input.archived,username,name,description:String(input.description||'').slice(0,600),role:'DOCENTE',assignments:input.assignments,requestedBy:actor.id,createdAt:now(),encryptedCredential:credentials?seal(credentials,this.setting('institution').hub.encryptionKey):null};
    return this.transaction(()=>this.write(actor,'accountRequests',value));
  }
  acceptRegistrationRequest(actor,input){this.requireRole(actor,ADMIN);if(!this.setting('authorityPrivate'))fail('Consolide las altas en el equipo institucional.');const r=this.record('accountRequests',input.id);if(!r||r.status!=='REQUESTED')fail('La solicitud ya fue procesada o no existe.');const current=r.userId?this.user(r.userId):null;if(r.userId&&current?.version!==r.expectedVersion)fail('La cuenta cambió desde la solicitud; revise su actualización.',409);const credential=r.encryptedCredential?unseal(r.encryptedCredential,this.setting('device').encryption.private):null;if(credential&&(!/^[a-f0-9]{32}$/.test(credential.salt)||!/^[a-f0-9]{128}$/.test(credential.digest)))fail('Credencial de solicitud inválida.');return this.transaction(()=>{const u=this.saveUser(actor,{id:r.userId,version:r.expectedVersion,username:r.username,name:r.name,description:r.description,role:'DOCENTE',active:r.active!==false,archived:!!r.archived,assignments:r.assignments},credential);const done=this.write(actor,'accountRequests',{...r,status:'ACCEPTED',createdUserId:u.id,processedAt:now()},r.rev);return {user:u,request:done};});}
  archiveUser(actor,input){this.requireRole(actor,ADMIN);const u=this.user(input.id)||this.record('userDirectory',input.id);if(!u)fail('Usuario no encontrado.');if(u.id===actor.id)fail('No puede eliminar la cuenta con la que está trabajando.');if(actor.role==='SECRETARIA'&&u.role!=='DOCENTE')fail('Secretaría solo administra docentes.',403);if(!String(input.reason||'').trim())fail('Indique el motivo de eliminación.');const result=this.saveUser(actor,{...publicUser(u),version:input.version,active:false,archived:true});this.audit('USER_ARCHIVED',actor,{id:u.id,reason:input.reason});return result;}
  archiveStudent(actor,input){this.requireRole(actor,ADMIN);const s=this.record('students',input.id);if(!s||s.rev!==input.rev)fail('El estudiante cambió. Recargue antes de eliminar.',409);if(!String(input.reason||'').trim())fail('Indique el motivo de eliminación.');this.createBackup(actor,'antes-eliminar-estudiante');return this.transaction(()=>{for(const e of this.records('enrollments').filter(e=>e.studentId===s.id&&e.active))this.retireEnrollment(actor,{id:e.id,rev:e.rev,date:input.date,reason:input.reason});const result=this.saveStudent(actor,{...s,rev:s.rev,active:false,archived:true});this.audit('STUDENT_ARCHIVED',actor,{id:s.id,reason:input.reason});return result;});}
  changePassword(user, input) {
    if (!passwordMatches(input.currentPassword, user)) fail('Contraseña actual incorrecta.', 403);
    this.putUser({ ...user, ...passwordRecord(input.password), version: user.version + 1 });
    this.audit('PASSWORD_CHANGE', user, {}); return { success: true };
  }
  scoped(user, entity) {
    const all = this.records(entity);
    if(entity==='userDirectory')return this.listUsers(user);
    if(entity==='accountRequests')return ADMIN.includes(user.role)?all.filter(r=>user.role==='DIRECTOR'||r.requestedBy===user.id):[];
    if(entity==='studentRequests')return user.role==='DOCENTE'?all.filter(r=>r.requestedBy===user.id&&this.assignment(user,r.groupId)):all;
    if(entity==='documentSettings')return all.filter(r=>DocumentSettings.visible(this,user,r));
    if(entity==='documentSubmissions')return user.role==='DOCENTE'?all.filter(r=>r.authorId===user.id&&this.assignment(user,r.groupId,r.unit)):all;
    if (user.role !== 'DOCENTE') return all;
    if (entity === 'groups') return all.filter(r => this.assignment(user, r.id));
    if (entity === 'enrollments') return all.filter(r => this.assignment(user, r.groupId));
    if (entity === 'students') { const allowed = new Set(this.scoped(user, 'enrollments').map(e => e.studentId)); return all.filter(s => allowed.has(s.id)); }
    if (['grades', 'attendance'].includes(entity)) return all.filter(r => this.assignment(user, r.groupId, r.unit));
    if (entity === 'programs') { const allowed = new Set(this.scoped(user, 'groups').map(g => g.programId)); return all.filter(p => allowed.has(p.id)); }
    if (entity === 'modules') { const allowed = new Set(this.scoped(user, 'groups').map(g => g.moduleId)); return all.filter(m => allowed.has(m.id)); }
    return [];
  }
  dashboard(user) {
    const entities = ['students', 'enrollments', 'groups', 'programs', 'modules', 'grades', 'attendance'];
    const result = Object.fromEntries(entities.map(e => [e, this.scoped(user, e)]));
    result.groups=result.groups.map(g=>({...g,rawName:g.name,name:groupName(this,g)}));
    return { ...result, user: publicUser(user),policy:policyFor(user),accountRequests:this.scoped(user,'accountRequests').map(({encryptedCredential,...r})=>r),studentRequests:this.scoped(user,'studentRequests'), status: this.status(), templates: TEMPLATES[user.role], lastSync: this.setting('lastSync'),
      pending: this.pendingCount(user),
      conflicts: user.role === 'DIRECTOR' ? this.db.prepare('SELECT value FROM conflicts').all().map(r => JSON.parse(r.value)).filter(c => !c.resolved).map(c => ({ ...c, observedDuringImport: c.current, current: this.record(c.operation.body.entity, c.operation.body.recordId) })) : [],
      migrationReport: user.role === 'DIRECTOR' ? this.setting('migrationReport') : null,
      submissions:this.scoped(user,'documentSubmissions').map(({pdf,...r})=>r),
      devices: ADMIN.includes(user.role) ? (this.setting('devices') || []).map(d => ({ ...d, name: this.user(d.userId)?.name })) : [] };
  }
  pendingCount(user) {
    if (!this.setting('authorityPrivate')) return this.db.prepare('SELECT value FROM operations WHERE acknowledged=0').all().map(r => JSON.parse(r.value)).filter(op => op.body.actor.id === user.id).length;
    const delivered = new Set(this.db.prepare('SELECT deviceId,operationId FROM deliveries WHERE acknowledged=1').all().map(d => `${d.deviceId}:${d.operationId}`));
    let count = 0;
    for (const device of (this.setting('devices') || []).filter(d => d.id !== this.status().deviceId)) {
      const target = this.user(device.userId); if (!target?.active) continue;
      count += this.operations().filter(op => this.operationVisible(target, op.body) && !delivered.has(`${device.id}:${op.body.id}`)).length;
    }
    return count;
  }
  write(actor, entity, value, expectedRevision = null, migration = false) {
    const old = this.record(entity, value.id);
    if (old && old.rev !== expectedRevision) fail('El registro cambió en otra ventana. Recargue antes de guardar.', 409);
    const result = { ...value, rev: id(), updatedAt: now(), updatedBy: actor.id };
    const certificate = this.setting('authorityPrivate') ? this.certificate(actor, this.setting('device')) : this.setting('certificate');
    const body = { id: id(), institutionId: this.setting('institution').id, entity, recordId: result.id, baseRev: old?.rev || null, value: result, actor: publicUser(actor), certificate, at: now(), migration };
    const op = { body, signature: sign(body, this.setting('device').signing.private) };
    this.putRecord(entity, result);
    this.db.prepare('INSERT INTO operations (id,value) VALUES (?,?)').run(body.id, canonical(op));
    this.audit('WRITE', actor, { entity, before: old, after: result }); return result;
  }
  saveStudent(actor, input) {
    this.requireRole(actor, ADMIN);
    const current = input.id ? this.record('students', input.id) : null;
    const value = { ...current,archived:input.archived===undefined?!!current?.archived:!!input.archived, id: current?.id || id(), document: String(input.document || '').trim(), name: String(input.name || '').trim(), active: input.active !== false };
    for(const key of ['lastName1','lastName2','firstNames','sex','birthDate','documentType'])if(input[key]!==undefined)value[key]=String(input[key]).trim();
    if(value.sex&&!['H','M'].includes(value.sex))fail('Seleccione sexo H o M, según la plantilla.');
    if(value.birthDate&&(!validDate(value.birthDate)||value.birthDate>new Date().toISOString().slice(0,10)))fail('Fecha de nacimiento inválida.');
    if (!value.name || !value.document) fail('Nombre y documento son obligatorios.');
    if (this.records('students').some(s => s.document === value.document && s.id !== value.id)) fail('Ya existe un estudiante con ese documento.', 409);
    return this.transaction(() => {const saved=this.write(actor,'students',value,input.rev);if(current&&current.document!==saved.document)for(const e of this.records('enrollments').filter(e=>e.studentId===saved.id))this.write(actor,'enrollments',{...e,previousCode:e.code||null,code:enrollmentCode(this,e.studentId,e.id)},e.rev);return saved;});
  }
  saveGroup(actor, input) {
    this.requireRole(actor, ['DIRECTOR']);
    const current = input.id ? this.record('groups', input.id) : { id: `G-${id()}`, name: String(input.name || '').trim(), programId: input.programId, units: [], closed: false };
    if (!current || !this.record('programs', current.programId) || (!input.id && !current.name)) fail('Seleccione programa y nombre del nuevo grupo.');
    const module = this.record('modules', input.moduleId);
    if (!module || module.programaId !== current.programId) fail('El módulo debe pertenecer al programa del grupo.');
    const units = [...new Set((input.units || []).map(u => String(u).trim()).filter(Boolean))];
    if (!String(input.periodId || '').trim() || !units.length) fail('Periodo y unidades son obligatorios.');
    if (this.records('grades').concat(this.records('attendance')).some(r => r.groupId === current.id) && ((current.periodId && current.periodId !== input.periodId) || (current.moduleId && current.moduleId !== input.moduleId) || current.units.some(u => !units.includes(u)))) fail('El grupo ya tiene registros. Conserve su estructura; cree un periodo/grupo nuevo.');
    return this.transaction(() => {
      const group = this.write(actor, 'groups', { ...current,...(input.name?{name:String(input.name).trim()}:{}), periodId: input.periodId.trim(), moduleId: input.moduleId, units }, input.rev);
      for (const entity of ['enrollments', 'grades', 'attendance']) for (const r of this.records(entity).filter(r => r.groupId === group.id && (!r.periodId || !r.moduleId))) this.write(actor, entity, { ...r, periodId: r.periodId || group.periodId, moduleId: r.moduleId || group.moduleId }, r.rev, true);
      return group;
    });
  }
  enroll(actor, input) {
    this.requireRole(actor, ADMIN);
    const group = this.record('groups', input.groupId), student = this.record('students', input.studentId);
    if (!group?.periodId || !group.moduleId || !student?.active) fail('Seleccione un estudiante activo y un grupo con periodo/módulo configurados.');
    if (!validDate(input.startDate)) fail('Fecha de ingreso inválida.');
    if (this.records('enrollments').some(e => e.studentId === student.id && e.groupId === group.id && e.active)) fail('El estudiante ya está matriculado en este grupo.', 409);
    const value = { id: id(),createdAt:now(), studentId: student.id, groupId: group.id, periodId: group.periodId, moduleId: group.moduleId, startDate: input.startDate, active: true };
    value.code=enrollmentCode(this,student.id,value.id);
    return this.transaction(() => this.write(actor, 'enrollments', value));
  }
  retireEnrollment(actor, input) {
    this.requireRole(actor, ADMIN); const current = this.record('enrollments', input.id);
    if (!current || !current.active || !String(input.reason || '').trim() || !validDate(input.date)) fail('Matrícula activa, fecha y motivo obligatorios.');
    return this.transaction(() => {
      const retired = this.write(actor, 'enrollments', { ...current, active: false, endDate: input.date, reason: input.reason.trim() }, input.rev);
      if (input.targetGroupId) this.enrollWithinTransaction(actor, current.studentId, input.targetGroupId, input.date);
      return retired;
    });
  }
  enrollWithinTransaction(actor, studentId, groupId, startDate) {
    const group = this.record('groups', groupId);
    if (!group?.periodId || !group.moduleId || this.records('enrollments').some(e => e.studentId === studentId && e.groupId === groupId && e.active)) fail('Grupo destino inválido o matrícula duplicada.');
    const recordId=id();return this.write(actor,'enrollments',{id:recordId,createdAt:now(),studentId,groupId,periodId:group.periodId,moduleId:group.moduleId,startDate,active:true,code:enrollmentCode(this,studentId,recordId)});
  }
  requestStudentRegistration(actor,input){this.requireRole(actor,['DOCENTE']);this.requireGroup(actor,input.groupId);if(!String(input.document||'').trim()||!String(input.name||'').trim())fail('Documento y nombre son obligatorios.');const existing=this.records('studentRequests').find(r=>r.status==='REQUESTED'&&r.document===input.document&&r.groupId===input.groupId&&r.requestedBy===actor.id);if(existing)return existing;return this.transaction(()=>this.write(actor,'studentRequests',{id:id(),requestedBy:actor.id,requestedByName:actor.name,status:'REQUESTED',groupId:input.groupId,document:String(input.document).trim(),name:String(input.name).trim(),documentType:input.documentType||'DNI',lastName1:input.lastName1||'',lastName2:input.lastName2||'',firstNames:input.firstNames||'',sex:input.sex||'',birthDate:input.birthDate||'',startDate:input.startDate||'',createdAt:now()}));}
  acceptStudentRequest(actor,input){this.requireRole(actor,ADMIN);const r=this.record('studentRequests',input.id);if(!r||r.status!=='REQUESTED')fail('Solicitud no disponible.');if(input.accept===false)return this.transaction(()=>this.write(actor,'studentRequests',{...r,status:'REJECTED',reason:String(input.reason||'')},r.rev));return this.transaction(()=>{let student=this.records('students').find(s=>s.document===r.document);if(!student)student=this.saveStudent(actor,{document:r.document,name:r.name,documentType:r.documentType,lastName1:r.lastName1,lastName2:r.lastName2,firstNames:r.firstNames,sex:r.sex,birthDate:r.birthDate});let enrollment=this.records('enrollments').find(e=>e.studentId===student.id&&e.groupId===r.groupId&&e.active);if(!enrollment)enrollment=this.enroll(actor,{studentId:student.id,groupId:r.groupId,startDate:r.startDate});const request=this.write(actor,'studentRequests',{...r,status:'ACCEPTED',studentId:student.id,enrollmentId:enrollment.id,processedBy:actor.id,processedAt:now()},r.rev);return {student,enrollment,request};});}
  saveAcademic(actor, entity, input) {
    this.requireRole(actor, ['DOCENTE']); this.requireGroup(actor, input.groupId, input.unit);
    const group = this.record('groups', input.groupId);
    if (!group.periodId || !group.moduleId || !(group.units || []).includes(input.unit)) fail('Configure periodo, módulo y unidad antes de registrar.');
    if (group.closed) fail('Registro cerrado. Solicite reapertura a dirección.', 409);
    if (!Array.isArray(input.rows) || !input.rows.length || input.rows.length > 12000) fail('Seleccione registros para guardar.');
    if (entity === 'attendance' && (!validDate(input.date) || !String(input.session || '').trim())) fail('Fecha y sesión obligatorias.');
    if (entity === 'grades' && !String(input.indicator || '').trim() && input.rows.some(r=>!String(r.indicator||'').trim())) fail('Indicador obligatorio.');
    return this.transaction(() => input.rows.map(row => {
      const enrollment = this.record('enrollments', row.enrollmentId);
      if (!enrollment?.active || enrollment.groupId !== group.id) fail('La matrícula no pertenece al aula.');
      if (entity === 'attendance' && enrollment.startDate && input.date < enrollment.startDate) fail('La sesión es anterior al ingreso del estudiante.');
      const pending = row.value === null && row.clear === true;
      if (entity === 'grades' && !pending && (row.value === '' || row.value === null || typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value < 0 || row.value > 20)) fail('La nota debe estar entre 0 y 20. Una nota pendiente se deja sin guardar.');
      if (entity === 'attendance' && !pending && !['P', 'F', 'J', 'T'].includes(row.value)) fail('Estado de asistencia inválido.');
      const indicator=String(row.indicator||input.indicator||'').trim();
      const recordId = hash([entity, enrollment.id, input.unit, entity === 'grades' ? indicator : [input.date, input.session.trim()]]);
      const value = { id: recordId, enrollmentId: enrollment.id, groupId: group.id, periodId: group.periodId, moduleId: group.moduleId, unit: input.unit, value: row.value,
        ...(entity === 'grades' ? { indicator } : { date: input.date, session: input.session.trim() }), pending, observation: String(row.observation || '').slice(0, 2000) };
      return this.write(actor, entity, value, row.rev);
    }));
  }
  closure(actor, input) {
    this.requireRole(actor, ['DIRECTOR']); const group = this.record('groups', input.groupId);
    if (!group || !String(input.reason || '').trim()) fail('Grupo y motivo obligatorios.');
    return this.transaction(() => this.write(actor, 'groups', { ...group, closed: !!input.closed, closureReason: input.reason.trim() }, input.rev));
  }
  requestDevice() { const d = this.setting('device'); return { app: APP, type: 'DEVICE_REQUEST', version: VERSION, id: d.id, signingKey: d.signing.public, encryptionKey: d.encryption.public }; }
  provision(actor, input) {
    this.requireRole(actor, ['DIRECTOR']); const request = input.request, user = this.user(input.userId);
    if (!this.setting('authorityPrivate') || request?.app !== APP || request.type !== 'DEVICE_REQUEST' || !user?.active) fail('Solicitud o cuenta inválida.');
    if (user.role === 'DIRECTOR') fail('Dirección opera en el equipo institucional. Vincule secretaría o docente.');
    crypto.createPublicKey(request.signingKey); crypto.createPublicKey(request.encryptionKey);
    const certificate = this.certificate(user, request);
    const sequence = (this.setting(`provisionSequence-${request.id}`) || 0) + 1;
    const body = { app: APP, type: 'PROVISION', version: VERSION, to: request.id, sequence, institution: this.setting('institution'),
      envelope: seal({ user, certificate }, request.encryptionKey) };
    const devices = (this.setting('devices') || []).filter(d => d.id !== request.id);
    devices.push({ id: request.id, userId: user.id, signingKey: request.signingKey, encryptionKey: request.encryptionKey });
    this.setting('devices', devices); this.setting(`provisionSequence-${request.id}`, sequence); this.audit('DEVICE_PROVISION', actor, { deviceId: request.id, userId: user.id });
    return { body, signature: sign(body, this.setting('authorityPrivate')), fingerprint: hash(body.institution.publicKey) };
  }
  acceptProvision(input) {
    const pkg = input.package, d = this.setting('device');
    if (pkg?.body?.type !== 'PROVISION' || pkg.body.app !== APP || pkg.body.version !== VERSION || pkg.body.to !== d.id || input.fingerprint !== hash(pkg.body.institution.publicKey)) fail('Vinculación inválida o huella institucional distinta.');
    if (!verify(pkg.body, pkg.signature, pkg.body.institution.publicKey)) fail('Firma institucional inválida.');
    if (this.status().initialized && (this.setting('authorityPrivate') || pkg.body.institution.id !== this.setting('institution').id || pkg.body.institution.publicKey !== this.setting('institution').publicKey || pkg.body.sequence <= (this.setting('provisionSequence') || 0))) fail('La renovación no pertenece a esta institución o ya fue aplicada.', 409);
    const { user, certificate } = unseal(pkg.body.envelope, d.encryption.private);
    if (!verify(certificate.body, certificate.signature, pkg.body.institution.publicKey) || certificate.body.deviceId !== d.id || certificate.body.signingKey !== d.signing.public || certificate.body.user.id !== user.id) fail('Certificado inválido.');
    const previousUserId = this.setting('certificate')?.body.user.id;
    if (previousUserId && previousUserId !== user.id) fail('No reasigne este equipo a otra persona sin una instalación separada.', 403);
    this.transaction(() => { this.setting('institution', pkg.body.institution); this.setting('certificate', certificate); this.setting('provisionSequence', pkg.body.sequence); this.putUser(user); this.audit('DEVICE_LINKED', user, { deviceId: d.id }); });
    return { success: true };
  }
  exchangePackage(actor,input={}){
    if(!actor.active)fail('Cuenta inactiva.',403);const groups=this.scoped(actor,'groups').filter(g=>!input.groupId||g.id===input.groupId);if(!groups.length)fail('Seleccione un grupo permitido.');
    const groupIds=new Set(groups.map(g=>g.id)),programs=new Set(groups.map(g=>g.programId)),modules=new Set(groups.map(g=>g.moduleId)),enrollments=this.scoped(actor,'enrollments').filter(e=>groupIds.has(e.groupId)),studentIds=new Set(enrollments.map(e=>e.studentId)),enrollmentIds=new Set(enrollments.map(e=>e.id));
    const operations=this.operations().filter(op=>{const b=op.body,v=b.value;if(!this.operationVisible(actor,b))return false;if(b.entity==='groups')return groupIds.has(v.id);if(b.entity==='programs')return programs.has(v.id);if(b.entity==='modules')return modules.has(v.id);if(b.entity==='students')return studentIds.has(v.id);if(['enrollments','grades','attendance'].includes(b.entity))return groupIds.has(v.groupId);if(b.entity==='studentRequests')return groupIds.has(v.groupId)&&(actor.role==='DOCENTE'||input.includeAccounts===true);if(b.entity==='documentSettings'){const scope=v.scope;return scope.kind==='institution'||groupIds.has(scope.target)||enrollmentIds.has(scope.target)||programs.has(scope.target)||modules.has(scope.target);}return ['accountRequests','userDirectory'].includes(b.entity)&&ADMIN.includes(actor.role)&&input.includeAccounts===true;});
    const device=this.setting('device'),body={app:APP,type:'GROUP_EXCHANGE',version:VERSION,id:id(),institutionId:this.setting('institution').id,from:device.id,at:now(),certificate:this.setting('authorityPrivate')?this.certificate(actor,device):this.setting('certificate'),envelope:tableEnvelope({operations,acknowledgements:[],groups:groups.map(g=>({id:g.id,name:groupName(this,g)}))},input.passphrase)};
    this.audit('EXCHANGE_EXPORTED',actor,{groups:[...groupIds],operations:operations.length});return {body,signature:sign(body,device.signing.private)};
  }
  packageFor(actor, deviceId) {
    const institution = this.setting('institution'), d = this.setting('device'), hub = !!this.setting('authorityPrivate');
    let target, targetUser;
    if (hub) {
      this.requireRole(actor, ADMIN); target = (this.setting('devices') || []).find(t => t.id === deviceId);
      targetUser = target && this.user(target.userId); if (!targetUser) fail('Seleccione un equipo vinculado.');
    } else {
      target = { ...institution.hub }; targetUser = null;
    }
    const resolved = this.db.prepare('SELECT value FROM conflicts').all().map(r => JSON.parse(r.value)).filter(c => c.resolved);
    const rejected = new Set(resolved.filter(c => c.resolution?.action === 'KEEP_LOCAL').map(c => c.id));
    const confirmed = hub ? new Set(this.db.prepare('SELECT operationId FROM deliveries WHERE deviceId=? AND acknowledged=1').all(target.id).map(d => d.operationId))
      : new Set(this.db.prepare('SELECT id FROM operations WHERE acknowledged=1').all().map(o => o.id));
    const candidates = this.operations().filter(op => !confirmed.has(op.body.id) && !rejected.has(op.body.id) && (hub ? targetUser.active && this.operationVisible(targetUser, op.body) : op.body.actor.id === actor.id && this.operationVisible(actor, op.body)));
    const operations=[];let packageBytes=0;
    for(const op of candidates){const bytes=Buffer.byteLength(canonical(op));if(bytes>16*1024*1024)fail('Una operación supera el tamaño del lote de sincronización.');if(packageBytes+bytes>16*1024*1024)break;operations.push(op);packageBytes+=bytes;}
    const acknowledgements = hub ? this.operations().map(op => op.body.id) : this.operations().filter(op => op.body.actor.id !== actor.id).map(op => op.body.id);
    const account = hub ? { user: publicUser(targetUser), certificate: this.certificate(targetUser, { id: target.id, signingKey: target.signingKey, encryptionKey: target.encryptionKey }) } : null;
    const body = { app: APP, type: 'SYNC', version: VERSION, id: id(), institutionId: institution.id, from: d.id, to: target.id, at: now(),
      certificate: hub ? this.certificate(actor, d) : this.setting('certificate'), envelope: seal({ operations, acknowledgements, account,
        resolutions: hub ? resolved.filter(c => targetUser.active && this.operationVisible(targetUser, c.operation.body)).map(c => ({ operationId: c.id, entity: c.operation.body.entity, proposedRev: c.operation.body.value.rev, value: c.retained, decision: c.resolution })) : [] }, target.encryptionKey) };
    if (hub) for (const op of operations) this.db.prepare('INSERT OR IGNORE INTO deliveries (deviceId,operationId) VALUES (?,?)').run(target.id, op.body.id);
    return { body, signature: sign(body, d.signing.private) };
  }
  operationVisible(user, body) {
    if(body.entity==='userDirectory')return user.role==='DIRECTOR'||(user.role==='SECRETARIA'&&body.value.role==='DOCENTE');
    if(body.entity==='accountRequests')return ADMIN.includes(user.role)&&(user.role==='DIRECTOR'||body.value.requestedBy===user.id);
    if(body.entity==='studentRequests')return user.role!=='DOCENTE'||(body.value.requestedBy===user.id&&user.assignments.some(a=>a.groupId===body.value.groupId));
    if(body.entity==='documentSettings')return DocumentSettings.visible(this,user,body.value);
    if(body.entity==='documentSubmissions')return user.role!=='DOCENTE'||(body.value.authorId===user.id&&user.assignments.some(a=>a.groupId===body.value.groupId&&(!body.value.unit||a.units.includes(body.value.unit))));
    if (user.role !== 'DOCENTE') return !['grades', 'attendance'].includes(body.entity) || ADMIN.includes(user.role);
    const v = body.value;
    if (body.entity === 'students') return this.scoped(user, 'enrollments').some(e => e.studentId === v.id);
    if (['enrollments', 'grades', 'attendance'].includes(body.entity)) return this.assignment(user, v.groupId, v.unit);
    if (body.entity === 'groups') return user.assignments.some(a => a.groupId === v.id);
    if (body.entity === 'programs') return user.assignments.some(a => a.programId === v.id);
    if (body.entity === 'modules') return user.assignments.some(a => a.moduleId === v.id);
    return false;
  }
  validateOperation(op, importingUser, hub, allowedStudents = new Set(),incomingEnrollments=new Map()) {
    const b = op?.body, cert = b?.certificate;
    if (!b || !['students', 'enrollments', 'groups', 'grades', 'attendance', 'programs', 'modules','documentSettings','documentSubmissions','userDirectory','accountRequests','studentRequests'].includes(b.entity) || b.institutionId !== this.setting('institution').id || !b.id || b.recordId !== b.value?.id || !b.value.rev || !cert) fail('Operación inválida.');
    if (!verify(cert.body, cert.signature, this.setting('institution').publicKey) || cert.body.institutionId !== b.institutionId || cert.body.user.id !== b.actor.id || !verify(b, op.signature, cert.body.signingKey)) fail('Emisor o firma de operación inválidos.');
    const received = this.db.prepare('SELECT value FROM operations WHERE id=?').get(b.id);
    if (received) { if (received.value !== canonical(op)) fail('Una operación recibida fue alterada.'); return b; }
    const actor = hub ? this.user(b.actor.id) : cert.body.user;
    if (!actor?.active || actor.role !== b.actor.role) fail('La cuenta emisora cambió o fue desactivada.', 403);
    if(b.entity==='userDirectory'){
      if(!ADMIN.includes(actor.role)||(actor.role==='SECRETARIA'&&b.value.role!=='DOCENTE'))fail('Directorio de usuarios fuera de su responsabilidad.',403);
      if(b.value.salt||b.value.digest||b.value.password)fail('No se comparten claves en el directorio.');
    }else if(b.entity==='accountRequests'){
      if(!ADMIN.includes(actor.role)||b.value.role!=='DOCENTE'||(actor.role==='SECRETARIA'&&b.value.requestedBy!==actor.id))fail('Alta de usuario no autorizada.',403);
    }else if(b.entity==='studentRequests'){
      if(actor.role==='DOCENTE'){if(b.value.requestedBy!==actor.id||b.value.status!=='REQUESTED')fail('Propuesta de estudiante no autorizada.',403);if(hub)this.requireGroup(actor,b.value.groupId);else if(!actor.assignments?.some(a=>a.groupId===b.value.groupId))fail('Propuesta fuera de su aula.',403);}
      else if(!ADMIN.includes(actor.role))fail('Validación de estudiante no autorizada.',403);
    }else if(b.entity==='documentSubmissions'){
      const v=b.value;const pdf=Buffer.from(v.pdf||'','base64');if(pdf.length>8*1024*1024||pdf.subarray(0,5).toString()!=='%PDF-'||hash(pdf.toString('base64'))!==v.pdfHash)fail('Documento entregado inválido.');
      if(!b.baseRev){if(v.authorId!==actor.id||!TEMPLATES[actor.role]?.includes(v.templateId))fail('Entrega fuera de su función.',403);if(hub)this.requireGroup(actor,v.groupId,v.unit);}
      else if(!ADMIN.includes(actor.role)||!['RECIBIDO','OBSERVADO','REVISADO'].includes(v.status))fail('Revisión documental no autorizada.',403);
    }else if(b.entity==='documentSettings'){
      if(b.value.id!==DocumentSettings.idFor(b.value.scope))fail('Identificador de configuración documental inválido.');
      if(hub)DocumentSettings.validateSettings(this,actor,b.value,false);
      else for(const key of Object.keys(b.value.fields||{}))if(!DocumentSettings.SETTINGS_FIELDS[b.value.scope?.kind]?.some(f=>f.key===key&&f.roles.includes(actor.role)))fail('Parámetro documental no autorizado.',403);
    }else if (['grades', 'attendance'].includes(b.entity)) {
      const trustedMigration = b.migration === true && actor.role === 'DIRECTOR' && cert.body.deviceId === this.setting('institution').hub.id;
      if (actor.role !== 'DOCENTE' && !trustedMigration) fail('Solo el docente origina notas/asistencia.', 403);
      if (!trustedMigration && hub) this.requireGroup(actor, b.value.groupId, b.value.unit);
      else if (!trustedMigration && !(actor.assignments || []).some(a => a.groupId === b.value.groupId && a.units.includes(b.value.unit))) fail('Asignación del emisor inválida.', 403);
      if (b.entity === 'grades' && !(b.value.value === null && b.value.pending === true) && (!Number.isFinite(b.value.value) || b.value.value < 0 || b.value.value > 20)) fail('Calificación inválida.');
      if (b.entity === 'attendance' && !(b.value.value === null && b.value.pending === true) && (!validDate(b.value.date) || !['P', 'F', 'J', 'T'].includes(b.value.value))) fail('Asistencia inválida.');
      const expectedId = hash([b.entity, b.value.enrollmentId, b.value.unit, b.entity === 'grades' ? b.value.indicator : [b.value.date, b.value.session]]);
      if (expectedId !== b.recordId) fail('Identificador académico inválido.');
    } else if (!ADMIN.includes(actor.role) || (['groups', 'programs', 'modules'].includes(b.entity) && actor.role !== 'DIRECTOR')) fail('Operación administrativa no autorizada.', 403);
    if (!hub && importingUser.role === 'DOCENTE') {
      const visible = b.entity==='documentSettings'?DocumentSettings.visible(this,importingUser,b.value,incomingEnrollments):b.entity === 'students' ? allowedStudents.has(b.value.id)
        : ['enrollments', 'grades', 'attendance'].includes(b.entity) ? importingUser.assignments.some(a => a.groupId === b.value.groupId && (!b.value.unit || a.units.includes(b.value.unit)))
        : this.operationVisible(importingUser, b);
      if (!visible) fail('El paquete contiene información fuera de su asignación.', 403);
    }
    return b;
  }
  importPackage(actor, pkg, apply = false,passphrase=null) {
    const b = pkg?.body, institution = this.setting('institution'), device = this.setting('device'), hub = !!this.setting('authorityPrivate');
    const portable=b?.type==='GROUP_EXCHANGE';
    if (!b || b.app !== APP || !['SYNC','GROUP_EXCHANGE'].includes(b.type) || b.version !== VERSION || b.institutionId !== institution.id || (!portable&&b.to !== device.id)) fail('Paquete de otra institución, equipo o versión. Vincule primero ambos equipos a la misma institución.');
    const cert = b.certificate;
    if (!cert || !verify(cert.body, cert.signature, institution.publicKey) || cert.body.deviceId !== b.from || !verify(b, pkg.signature, cert.body.signingKey)) fail('Firma de paquete inválida.');
    if (hub) {
      const trusted = (this.setting('devices') || []).find(d => d.id === b.from);
      const sender = trusted && this.user(portable?cert.body.user.id:trusted.userId);
      if (!sender?.active || trusted.signingKey !== cert.body.signingKey || (!portable&&sender.id !== cert.body.user.id) || (portable&&b.from!==institution.hub.id&&trusted.userId!==sender.id) || sender.version !== cert.body.user.version) fail('Equipo o cuenta emisora no autorizados.', 403);
      if(!portable)this.requireRole(actor, ADMIN);
    } else if (!portable&&(b.from !== institution.hub.id || !ADMIN.includes(cert.body.user.role))) fail('Reciba las actualizaciones del equipo institucional.', 403);
    if(portable&&(!cert.body.user.active||cert.body.validUntil<now()))fail('La autorización del emisor venció o está inactiva.',403);
    const data = portable?tableEnvelope(b.envelope,passphrase,true):unseal(b.envelope, device.encryption.private);
    if (!Array.isArray(data.operations) || data.operations.length > 100000) fail('Contenido de paquete inválido.');
    if (!hub && data.account && (!verify(data.account.certificate.body, data.account.certificate.signature, institution.publicKey) || data.account.user.id !== actor.id || data.account.certificate.body.deviceId !== device.id)) fail('Actualización de cuenta inválida.');
    const effectiveUser = !hub && data.account ? data.account.user : actor;
    // El registro de cuenta actualizado se usa para el alcance, antes de aplicar datos.
    const allowedStudents = new Set(this.scoped(effectiveUser, 'enrollments').map(e => e.studentId));
    for (const op of data.operations) if (op.body?.entity === 'enrollments' && (effectiveUser.role !== 'DOCENTE' || effectiveUser.assignments.some(a => a.groupId === op.body.value?.groupId))) allowedStudents.add(op.body.value.studentId);
    const incomingEnrollments=new Map(data.operations.filter(op=>op.body?.entity==='enrollments').map(op=>[op.body.value.id,op.body.value]));
    const changes = data.operations.map(op => {const body=this.validateOperation(op,effectiveUser,hub,allowedStudents,incomingEnrollments);if(portable&&effectiveUser.role==='DOCENTE'){const visible=body.entity==='students'?allowedStudents.has(body.value.id):body.entity==='documentSettings'?DocumentSettings.visible(this,effectiveUser,body.value,incomingEnrollments):this.operationVisible(effectiveUser,body);if(!visible)fail('El archivo contiene un grupo o unidad que no le pertenece.',403);}return {op,body};});
    const report = { packageId: b.id, total: changes.length, newRecords: 0, updates: 0, duplicates: 0, conflicts: 0, pending: 0, applied: false };
    if (this.db.prepare('SELECT id FROM receipts WHERE id=?').get(b.id)) return { ...report, duplicatePackage: true };
    const simulate = new Map(), applied = new Set(this.operations().map(op => op.body.id));
    const decisions = [];
    for (const change of changes) {
      const c = change.body, key = `${c.entity}:${c.recordId}`, current = simulate.has(key) ? simulate.get(key) : this.record(c.entity, c.recordId);
      if (applied.has(c.id)) { report.duplicates++; continue; }
      let state = 'apply';
      if (current && current.rev !== c.baseRev && current.rev !== c.value.rev) state = 'conflict';
      if (!current && c.baseRev) state = 'pending';
      if (['grades', 'attendance'].includes(c.entity)) {
        const enrollment = simulate.get(`enrollments:${c.value.enrollmentId}`) || this.record('enrollments', c.value.enrollmentId);
        const group = simulate.get(`groups:${c.value.groupId}`) || this.record('groups', c.value.groupId);
        if (!enrollment || !group) state = 'pending';
        else if (enrollment.groupId !== c.value.groupId || group.periodId !== c.value.periodId || !(group.units || []).includes(c.value.unit) || group.closed || (c.entity === 'attendance' && enrollment.startDate && c.value.date < enrollment.startDate)) state = 'conflict';
      }
      if (c.entity === 'enrollments') {
        const student = simulate.get(`students:${c.value.studentId}`) || this.record('students', c.value.studentId);
        const group = simulate.get(`groups:${c.value.groupId}`) || this.record('groups', c.value.groupId);
        if (!student || !group) state = 'pending';
        if (!c.migration && this.records('enrollments').concat([...simulate.entries()].filter(([key]) => key.startsWith('enrollments:')).map(([,v]) => v)).some(e => e.id !== c.value.id && e.active && c.value.active && e.studentId === c.value.studentId && e.groupId === c.value.groupId)) state = 'conflict';
      }
      if (c.entity === 'students') {
        const duplicate = this.records('students').concat([...simulate.entries()].filter(([key]) => key.startsWith('students:')).map(([,v]) => v)).find(s => s.document === c.value.document && s.id !== c.value.id);
        const authoritativeMigration = c.migration === true && c.actor.role === 'DIRECTOR' && c.certificate.body.deviceId === institution.hub.id;
        if (duplicate && !authoritativeMigration) state = 'conflict';
      }
      if (state === 'apply') { current ? report.updates++ : report.newRecords++; simulate.set(key, c.value); applied.add(c.id); }
      else report[state === 'pending' ? 'pending' : 'conflicts']++;
      decisions.push({ ...change, state, current });
    }
    if (!apply) return report;
    this.createBackup(actor, 'antes-sincronizar');
    this.transaction(() => {
      for (const decision of decisions) {
        const c = decision.body;
        if (decision.state === 'apply') {
          this.putRecord(c.entity, c.value);if(c.entity==='documentSettings'&&c.value.scope.kind==='institution'&&c.value.fields.nombre)this.setting('institution',{...this.setting('institution'),name:c.value.fields.nombre});this.db.prepare('INSERT OR IGNORE INTO operations (id,value,acknowledged) VALUES (?,?,?)').run(c.id, canonical(decision.op), hub || c.actor.id !== actor.id ? 1 : 0);
          this.db.prepare('DELETE FROM conflicts WHERE id=?').run(c.id);
          this.audit('SYNC_APPLY', actor, { operationId: c.id, before: decision.current, after: c.value });
        } else this.db.prepare('INSERT OR REPLACE INTO conflicts VALUES (?,?)').run(c.id, canonical({ id: c.id, kind: decision.state, operation: decision.op, current: decision.current, resolved: false }));
      }
      for (const ack of data.acknowledgements || []) {
        if (hub) this.db.prepare('UPDATE deliveries SET acknowledged=1 WHERE deviceId=? AND operationId=?').run(b.from, ack);
        else this.db.prepare('UPDATE operations SET acknowledged=1 WHERE id=?').run(ack);
      }
      if (!hub) for (const resolution of data.resolutions || []) {
        const current = this.record(resolution.entity, resolution.value?.id);
        if (!resolution.value || !this.operationVisible(effectiveUser, { entity: resolution.entity, value: resolution.value })) fail('Resolución fuera del alcance.', 403);
        if (current?.rev === resolution.proposedRev) { this.putRecord(resolution.entity, resolution.value); this.audit('RESOLUTION_RECEIVED', actor, { before: current, resolution }); }
      }
      // Los paquetes con dependencias/conflictos pueden volver a importarse tras resolverlos.
      if (!report.pending && !report.conflicts) this.db.prepare('INSERT INTO receipts VALUES (?,?)').run(b.id, now());
      if (!hub && data.account) { const local = this.user(actor.id); this.putUser({ ...local, ...data.account.user }); this.setting('certificate', data.account.certificate); }
      this.setting('lastSync', { at: now(), ...report });
    });
    return { ...report, applied: true };
  }
  resolve(actor, input) {
    this.requireRole(actor, ['DIRECTOR']);
    const raw = this.db.prepare('SELECT value FROM conflicts WHERE id=?').get(input.id);
    if (!raw || !String(input.reason || '').trim() || !['KEEP_LOCAL', 'ACCEPT_INCOMING'].includes(input.action)) fail('Conflicto, decisión y motivo obligatorios.');
    const conflict = JSON.parse(raw.value), c = conflict.operation.body;
    if (conflict.resolved) fail('El conflicto ya se resolvió.', 409);
    const before = this.record(c.entity, c.recordId);
    if (!before && input.action === 'KEEP_LOCAL') fail('No existe un registro local para conservar. Reciba primero las dependencias.');
    if ((input.currentRev || null) !== (before?.rev || null)) fail('El registro cambió mientras revisaba el conflicto. Recargue antes de decidir.', 409);
    if (input.action === 'ACCEPT_INCOMING' && ['grades', 'attendance'].includes(c.entity)) {
      const e = this.record('enrollments', c.value.enrollmentId), g = this.record('groups', c.value.groupId);
      if (!e || !g || e.groupId !== g.id || g.closed || c.value.periodId !== g.periodId || !(g.units || []).includes(c.value.unit)) fail('Resuelva la matrícula, contexto o reapertura antes de aceptar.');
    }
    this.createBackup(actor, 'antes-resolver-conflicto');
    this.transaction(() => {
      if (input.action === 'ACCEPT_INCOMING') this.putRecord(c.entity, c.value);
      this.db.prepare('INSERT OR IGNORE INTO operations (id,value,acknowledged) VALUES (?,?,1)').run(c.id, canonical(conflict.operation));
      conflict.resolved = true; conflict.retained = this.record(c.entity, c.recordId); conflict.resolution = { action: input.action, reason: input.reason, userId: actor.id, at: now() };
      this.db.prepare('UPDATE conflicts SET value=? WHERE id=?').run(canonical(conflict), c.id);
      this.audit('CONFLICT_RESOLVED', actor, { ...conflict, retainedBefore: before });
    }); return { success: true };
  }
  createBackup(actor, label = 'manual') {
    const backup = { app: APP, version: VERSION, at: now(), settings: this.db.prepare('SELECT * FROM settings').all(), users: this.db.prepare('SELECT * FROM users').all(),
      records: this.db.prepare('SELECT * FROM records').all(), operations: this.db.prepare('SELECT * FROM operations').all(), receipts: this.db.prepare('SELECT * FROM receipts').all(), deliveries: this.db.prepare('SELECT * FROM deliveries').all(), conflicts: this.db.prepare('SELECT * FROM conflicts').all(), audit: this.db.prepare('SELECT * FROM audit').all() };
    const directory = path.join(this.directory, 'backups'); fs.mkdirSync(directory, { recursive: true });
    const filename = `${now().replace(/[:.]/g, '-')}-${label}.json`;
    // Incluye credenciales y claves; permanece en la carpeta privada del servicio.
    fs.writeFileSync(path.join(directory, filename), canonical({ backup, checksum: hash(backup) }), { mode: 0o600, flag: 'wx' });
    return { filename, counts: { records: backup.records.length, operations: backup.operations.length } };
  }
  importLegacy(actor, pkg, insideTransaction = false) {
    this.requireRole(actor, ['DIRECTOR']);
    const stores = pkg.stores; if (!stores || !Array.isArray(stores.estudiantes) || !Array.isArray(stores.matriculas)) fail('El respaldo no contiene estudiantes y matrículas.');
    const run = () => {
      const report = { imported: 0, preserved: 0, conflicts: [] };
      const ingest = (entity, value) => {
        const existing = this.record(entity, value.id);
        if (existing) { report.preserved++; if (existing.legacy && hash(existing.legacy) !== hash(value.legacy)) report.conflicts.push({ entity, id: value.id }); return; }
        if (entity === 'students' && this.records('students').some(s => s.document === value.document && s.id !== value.id)) report.conflicts.push({ entity, id: value.id, reason: 'Documento duplicado en la fuente histórica: ambos identificadores y matrículas conservados; requiere conciliación' });
        if (entity === 'enrollments' && !this.record('students', value.studentId)) { report.conflicts.push({ entity, id: value.id, reason: 'Estudiante pendiente de conciliación' }); return; }
        this.write(actor, entity, value, null, true); report.imported++;
      };
      for (const p of stores.programas || []) ingest('programs', { ...p, legacy: p });
      for (const m of stores.modulos || []) ingest('modules', { ...m, legacy: m });
      for (const s of stores.estudiantes) ingest('students', { id: s.id, name: s.nombresCompletoOriginal || [s.apellidoPaterno, s.apellidoMaterno, s.nombres].filter(Boolean).join(' '), document: String(s.numeroDocumento || ''), active: s.estado !== 'INACTIVO', legacy: s });
      const knownGroups = new Map((stores.grupos_academicos || []).map(g => [g.sourceGroupCode || g.grupoCode || g.id, g]));
      for (const e of stores.matriculas) {
        const code = e.grupoCode || String(e.grupoId || '').replace(/^GAC-V1-/, ''); const source = knownGroups.get(code);
        if (!code) { report.conflicts.push({ entity: 'enrollments', id: e.id, reason: 'Sin grupo' }); continue; }
        if (!this.record('groups', code)) ingest('groups', { id: code, name: code, programId: e.programaId, moduleId: source?.moduloId || e.moduloId || null,
          periodId: source?.periodoId || e.periodoId || null, units: [], closed: false, turno: e.turno, legacy: source || { grupoCode: code } });
        ingest('enrollments', { id: e.id, studentId: e.estudianteId, groupId: code, periodId: e.periodoId, moduleId: e.moduloId, startDate: null, active: e.estado !== 'ANULADA', legacy: e });
      }
      const canonicalGroup = groupId => String(groupId || '').replace(/^GAC-V1-/, '');
      const resolveEnrollment = (reference, groupId) => {
        const direct = this.record('enrollments', reference);
        if (direct && (!groupId || direct.groupId === groupId)) return direct;
        const possible = this.records('enrollments').filter(e => e.studentId === reference && (!groupId || e.groupId === groupId));
        return possible.length === 1 ? possible[0] : null;
      };
      const importAcademic = (entity, reference, groupId, unit, dimension, value, source) => {
        const enrollment = resolveEnrollment(reference, groupId);
        if (!enrollment || !unit || (entity === 'grades' ? !Number.isFinite(Number(value)) || value === '' || value == null || Number(value) < 0 || Number(value) > 20 : !dimension.date || !['P','F','J','T'].includes(value))) {
          report.conflicts.push({ entity, id: reference, reason: 'Referencia, fecha, unidad o valor requiere revisión', source }); return;
        }
        const group = this.record('groups', enrollment.groupId);
        if (group && !group.units.includes(unit)) this.write(actor, 'groups', { ...group, units: [...group.units, unit] }, group.rev);
        const periodId = enrollment.periodId || group?.periodId || null;
        const academicId = hash([entity, enrollment.id, unit, entity === 'grades' ? dimension.indicator : [dimension.date, dimension.session]]);
        ingest(entity, { id: academicId, enrollmentId: enrollment.id, groupId: enrollment.groupId, periodId, moduleId: enrollment.moduleId || group?.moduleId || null, unit,
          value: entity === 'grades' ? Number(value) : value, ...dimension, observation: source.observacion || source.observaciones || '', legacy: source });
      };
      for (const grade of stores.evaluacion || []) importAcademic('grades', grade.matriculaId, canonicalGroup(grade.grupoCode || grade.groupId || grade.grupoId), grade.unidadId, { indicator: grade.indicadorId || 'RESULTADO_UD' }, grade.nota, grade);
      const attendanceCode = value => ({ PRESENTE: 'P', ASISTIO: 'P', AUSENTE: 'F', FALTA: 'F', FALTA_INJUSTIFICADA: 'F', JUSTIFICADA: 'J', JUSTIFICADO: 'J', FALTA_JUSTIFICADA: 'J', TARDANZA: 'T', TARDE: 'T' }[value] || value);
      for (const mark of stores.asistencia || []) importAcademic('attendance', mark.matriculaId, canonicalGroup(mark.grupoCode || mark.groupId || mark.grupoId), mark.unidadId, { date: mark.fecha, session: String(mark.sesionId || '1') }, attendanceCode(mark.estadoRegistro || mark.estado), mark);
      for (const [key, payload] of Object.entries(pkg.etapa2 || {})) {
        const match = /^CETPRO_ETAPA2_(ATT|EVAL)_(.+)_UD(\d+)$/.exec(key);
        if (!match) continue;
        const groupId = canonicalGroup(match[2]), unit = `UD${match[3]}`;
        if (match[1] === 'EVAL') for (const [reference, evaluation] of Object.entries(payload.evaluationsByEnrollment || payload.evaluacionesByEnrollment || {})) {
          for (const [index, ev] of (evaluation.evaluations || []).entries()) for (const component of ['ia1','ia2','ia3','score','recovery']) {
            if (ev[component] != null && ev[component] !== '') importAcademic('grades', reference, groupId, unit, { indicator: `IL${index + 1}${component === 'score' ? '' : '.' + component.toUpperCase()}` }, ev[component], ev);
          }
          if (evaluation.finalLogro != null || evaluation.finalResult != null) importAcademic('grades', reference, groupId, unit, { indicator: 'RESULTADO_UD' }, evaluation.finalLogro ?? evaluation.finalResult, evaluation);
        }
        else for (const [reference, attendance] of Object.entries(payload.marksByEnrollment || {})) for (const [index, mark] of (attendance.marks || []).entries()) {
          const session = (payload.sessions || []).find(s => s.sessionId === mark.sessionId) || payload.sessions?.[index];
          importAcademic('attendance', reference, groupId, unit, { date: session?.fecha, session: String(session?.sessionId || mark.sessionId || index + 1) }, attendanceCode(mark.estadoRegistro || mark.state), { ...mark, session });
        }
      }
      // Mantener todas las fuentes originales, incluso aquellas que requieren normalización posterior.
      this.setting(`legacy-${id()}`, { importedAt: now(), stores, etapa2: pkg.etapa2 || {} });
      this.setting('migrationReport', report); this.audit('LEGACY_IMPORT', actor, report); return report;
    };
    if (insideTransaction) return run();
    this.createBackup(actor, 'antes-migrar'); return this.transaction(run);
  }
  document(actor, input) {
    if (!TEMPLATES[actor.role]?.includes(input.templateId)) fail('Este documento no pertenece a su función.', 403);
    this.requireGroup(actor, input.groupId);
    const group = this.record('groups', input.groupId), roster = this.scoped(actor, 'enrollments').filter(e => e.groupId === group.id && e.active && !this.record('students',e.studentId)?.archived);
    const curricularUnits=group.units.filter(u=>u!=='EFSRT');
    const n = Number(input.templateId.slice(5)), unit = n >= 5 && n <= 10 ? (input.unit||curricularUnits[n - 5]) : n >= 11 && n <= 17 ? curricularUnits[n - 11] : n===18?'EFSRT':input.unit;
    if(unit && unit !== 'EFSRT' && !group.units.includes(unit))fail('Seleccione una unidad del grupo.');
    if (actor.role === 'DOCENTE' && unit) this.requireGroup(actor, group.id, unit);
    const students = roster.map(e => ({ enrollment: e, student: this.record('students', e.studentId) }));
    const legacyInstitutions = this.db.prepare("SELECT value FROM settings WHERE key LIKE 'legacy-%'").all().map(r => JSON.parse(r.value)).flatMap(s => s.stores.institucion || []);
    if (input.enrollmentId && !roster.some(e => e.id === input.enrollmentId)) fail('La matrícula no pertenece a su alcance.', 403);
    if ([2,20,21].includes(n) && !input.enrollmentId) fail('Seleccione una matrícula para este documento individual.');
    if (n >= 5 && n <= 17 && !unit) fail('La unidad de esta plantilla no está configurada en el grupo.');
    const base={ institution: { ...legacyInstitutions[0], name: this.setting('institution').name, nombre: this.setting('institution').name }, group, unit, templateId: input.templateId, official: false,
      program: this.record('programs', group.programId), module: this.record('modules', group.moduleId), students: input.enrollmentId ? students.filter(s => s.enrollment.id === input.enrollmentId) : students,
      grades: this.scoped(actor, 'grades').filter(r => r.groupId === group.id && (!unit || r.unit === unit) && (!input.enrollmentId || r.enrollmentId === input.enrollmentId)),
      attendance: this.scoped(actor, 'attendance').filter(r => r.groupId === group.id && (!unit || r.unit === unit) && (!input.enrollmentId || r.enrollmentId === input.enrollmentId)) };
    return DocumentSettings.enrich(this,actor,base);
  }
  submitDocument(actor,doc,pdf){
    if(!doc.preflight.complete)fail('Complete los parámetros pendientes antes de entregar el documento.',422);
    if(pdf.length>8*1024*1024)fail('El PDF supera el tamaño máximo de una entrega.');
    const value={id:id(),groupId:doc.group.id,unit:doc.unitCode||null,templateId:doc.templateId,authorId:actor.id,authorName:actor.name,status:'ENTREGADO',createdAt:now(),fingerprint:doc.fingerprint,pdf:pdf.toString('base64'),pdfHash:hash(pdf.toString('base64')),parameters:doc.preflight.fields};
    return this.transaction(()=>{const saved=this.write(actor,'documentSubmissions',value);const {pdf,...publicSubmission}=saved;return publicSubmission;});
  }
  submissionPDF(actor,submissionId){const s=this.scoped(actor,'documentSubmissions').find(s=>s.id===submissionId);if(!s)fail('Entrega no permitida.',403);return Buffer.from(s.pdf,'base64');}
  reviewDocument(actor,input){
    this.requireRole(actor,ADMIN);const s=this.record('documentSubmissions',input.id);if(!s||!['RECIBIDO','OBSERVADO','REVISADO'].includes(input.status)||!String(input.reason||'').trim())fail('Seleccione una entrega, estado y motivo.');
    if(input.status==='REVISADO')this.requireRole(actor,['DIRECTOR']);
    return this.transaction(()=>{const r=this.write(actor,'documentSubmissions',{...s,status:input.status,reviewedBy:actor.id,reviewReason:input.reason,reviewedAt:now()},input.rev);const {pdf,...publicSubmission}=r;return publicSubmission;});
  }
}
module.exports = { OfflineCore, APP, VERSION, hash, publicUser, fail };
