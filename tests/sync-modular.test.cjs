/**
 * tests/sync-modular.test.cjs
 * 
 * Verificación de la sincronización modular por partes (USB):
 * - Selección de módulos: config, enrollments, grades, attendance, all.
 * - Exportación de Dirección hacia Secretaría (para-secretaria/).
 * - Aislamiento estricto entre categorías de datos (las notas no viajan en lotes de asistencia).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const Network = require('../scripts/institutional-network.cjs');
const { SYNC_MODULES, matchesSyncModule, classifyOperations } = require('../scripts/sync-modules.cjs');

const artifactsDir = path.join(__dirname, '../dev-sandbox/data/sync-modular', require('node:crypto').randomUUID());

test('Fase 3: Sincronización Modular por Partes (USB)', async (t) => {
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(artifactsDir, { recursive: true });
  const usbDir = path.join(artifactsDir, 'pendrive-simulado');
  fs.mkdirSync(usbDir, { recursive: true });

  const hubDir = path.join(artifactsDir, 'hub-direccion');
  const secDir = path.join(artifactsDir, 'satelite-secretaria');
  const docDir = path.join(artifactsDir, 'satelite-docente');

  fs.mkdirSync(hubDir, { recursive: true });
  fs.mkdirSync(secDir, { recursive: true });
  fs.mkdirSync(docDir, { recursive: true });

  const hubCore = new OfflineCore(hubDir);
  hubCore.setup({
    name: 'Lic. Eloy Valerio Paredes Feliciano',
    username: 'eloy.paredes',
    password: 'Password123!',
    institutionName: 'CETPRO MICAELA BASTIDAS'
  });
  const director = hubCore.users().find((u) => u.username === 'eloy.paredes');

  // Crear cuentas de secretaria y docente en el Hub
  const secUser = {
    id: 'user-sec-01',
    username: 'carmen.vilca',
    name: 'Carmen Vilca',
    role: 'SECRETARIA',
    active: true,
    assignments: [],
    version: 1
  };
  hubCore.putUser(secUser);

  const docUser = {
    id: 'user-doc-01',
    username: 'alejandrina.ayna',
    name: 'Alejandrina Ayna',
    role: 'DOCENTE',
    active: true,
    assignments: [{ groupId: 'GRP-001', section: 'A', periodId: '2026-I', programId: 'PROG-001', moduleId: 'MOD-001', units: ['UD1'] }],
    version: 1
  };
  hubCore.putUser(docUser);

  // Crear grupo y módulo en el Hub
  hubCore.putRecord('programs', { id: 'PROG-001', name: 'Computación e Informática' });
  hubCore.putRecord('modules', { id: 'MOD-001', name: 'Ofimática', programId: 'PROG-001', periodId: '2026-I', units: ['UD1'] });
  hubCore.putRecord('groups', { id: 'GRP-001', name: 'Aula 101', programId: 'PROG-001', moduleId: 'MOD-001', periodId: '2026-I', section: 'A', units: ['UD1'] });

  // Emitir kits de enlace para Secretaria y Docente
  const kitSec = Network.createKit(hubCore, director, { userId: secUser.id });
  const kitDoc = Network.createKit(hubCore, director, { userId: docUser.id });

  const secCore = new OfflineCore(secDir);
  const docCore = new OfflineCore(docDir);

  const secInvitation = JSON.parse(fs.readFileSync(path.join(kitSec.kitDirectory, 'invitacion.cetpro-invitacion'), 'utf8'));
  const docInvitation = JSON.parse(fs.readFileSync(path.join(kitDoc.kitDirectory, 'invitacion.cetpro-invitacion'), 'utf8'));

  Network.acceptInvitationAndLink(secCore, { invitation: secInvitation });
  Network.acceptInvitationAndLink(docCore, { invitation: docInvitation });

  await t.test('1. matchesSyncModule clasifica correctamente las entidades', () => {
    assert.equal(matchesSyncModule('programs', null, SYNC_MODULES.CONFIG), true);
    assert.equal(matchesSyncModule('grades', null, SYNC_MODULES.CONFIG), false);

    assert.equal(matchesSyncModule('students', null, SYNC_MODULES.ENROLLMENTS), true);
    assert.equal(matchesSyncModule('enrollments', null, SYNC_MODULES.ENROLLMENTS), true);
    assert.equal(matchesSyncModule('grades', null, SYNC_MODULES.ENROLLMENTS), false);

    assert.equal(matchesSyncModule('grades', null, SYNC_MODULES.GRADES), true);
    assert.equal(matchesSyncModule('attendance', null, SYNC_MODULES.GRADES), false);

    assert.equal(matchesSyncModule('attendance', null, SYNC_MODULES.ATTENDANCE), true);
    assert.equal(matchesSyncModule('students', null, SYNC_MODULES.ATTENDANCE), false);
  });

  await t.test('2. Exportación masiva de Dirección genera paquetes para Docente Y para Secretaría (para-secretaria/)', () => {
    const exportResult = Network.prepareBatchExport(hubCore, director, {
      usbDrivePath: usbDir,
      passphrase: 'Synthetic-transfer-123',
      syncModule: 'config'
    });

    assert.ok(exportResult.success, 'La exportación masiva debe ser exitosa');
    assert.ok(exportResult.packages.length >= 2, 'Debe haber paquetes para secretaria y docente');

    const secPkg = exportResult.packages.find((p) => p.recipientRole === 'SECRETARIA');
    assert.ok(secPkg, 'Debe existir un paquete específico para Secretaría');
    assert.equal(secPkg.targetFolder, 'para-secretaria');
    assert.ok(fs.existsSync(secPkg.filePath), 'El archivo .cetpro de secretaría debe existir físicamente en el USB');

    const docPkg = exportResult.packages.find((p) => p.recipientRole === 'DOCENTE');
    assert.ok(docPkg, 'Debe existir un paquete específico para el Docente');
    assert.ok(fs.existsSync(docPkg.filePath), 'El archivo .cetpro del docente debe existir en el USB');
  });

  await t.test('3. Exportación modular selectiva del Docente: Solo envía Notas (grades)', () => {
    const actorDocente = docCore.user(docUser.id);

    // Asegurar que el docente tenga el grupo en su BD local
    docCore.putRecord('groups', {
      id: 'GRP-001',
      name: 'Aula 101',
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      periodId: '2026-I',
      section: 'A',
      units: ['UD1']
    });

    // El docente registra operaciones de calificación y de asistencia en su cola de operaciones
    docCore.transaction(() => {
      const dev = docCore.setting('device');
      // Registrar operación de notas
      const gradeBody = {
        id: 'op-grade-01',
        entity: 'grades',
        recordId: 'GRD-TEST-001',
        actor: { id: actorDocente.id, name: actorDocente.name, role: actorDocente.role },
        value: { id: 'GRD-TEST-001', groupId: 'GRP-001', unit: 'UD1', value: 18, rev: 1 }
      };
      docCore.db.prepare('INSERT INTO operations VALUES (?, ?, 0)').run(
        gradeBody.id,
        JSON.stringify({ body: gradeBody, signature: 'mock-sig' })
      );

      // Registrar operación de asistencia
      const attBody = {
        id: 'op-att-01',
        entity: 'attendance',
        recordId: 'ATT-TEST-001',
        actor: { id: actorDocente.id, name: actorDocente.name, role: actorDocente.role },
        value: { id: 'ATT-TEST-001', groupId: 'GRP-001', unit: 'UD1', value: 'P', rev: 1 }
      };
      docCore.db.prepare('INSERT INTO operations VALUES (?, ?, 0)').run(
        attBody.id,
        JSON.stringify({ body: attBody, signature: 'mock-sig' })
      );
    });

    // El docente exporta al USB seleccionando ÚNICAMENTE el módulo de NOTAS ('grades')
    const exportNotes = Network.prepareBatchExport(docCore, actorDocente, {
      usbDrivePath: usbDir,
      passphrase: 'Synthetic-transfer-123',
      syncModule: 'grades'
    });

    assert.ok(exportNotes.success);
    assert.equal(exportNotes.packages.length, 1);
    const notesPkgPath = exportNotes.packages[0].filePath;

    // Leer el paquete exportado y verificar que contiene notas pero NO contiene asistencias
    const pkgContent = JSON.parse(fs.readFileSync(notesPkgPath, 'utf8'));
    assert.equal(pkgContent.body.syncModule, 'grades', 'El paquete debe estar marcado con syncModule grades');

    // Desellar operaciones
    const crypto = require('node:crypto');
    const envelope=pkgContent.body.envelope;
    const decipher=crypto.createDecipheriv('aes-256-gcm',crypto.scryptSync('Synthetic-transfer-123',envelope.salt,32),Buffer.from(envelope.iv,'hex'));
    decipher.setAuthTag(Buffer.from(envelope.tag,'hex'));
    const unsealed=JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString());

    const entitiesInPackage = unsealed.operations.map((o) => o.body.entity);
    assert.ok(entitiesInPackage.includes('grades'), 'El paquete debe incluir las calificaciones');
    assert.ok(!entitiesInPackage.includes('attendance'), 'El paquete de notas NO debe contener asistencias');
  });

  hubCore.close();
  secCore.close();
  docCore.close();
});
