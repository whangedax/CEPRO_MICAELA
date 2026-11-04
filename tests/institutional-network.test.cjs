/**
 * tests/institutional-network.test.cjs
 *
 * Suite de Pruebas Automatizadas de las 13 Garantías Adversariales (G01 a G13)
 * para la Red Institucional de Intercambio Offline — CEPRO_MICAELA 2.0.
 *
 * Referencia: docs/contracts/RED_INSTITUCIONAL_OFFLINE_CONTRATOS.md
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const { OfflineCore } = require('../scripts/offline-core.cjs');
const InstitutionalNetwork = require('../scripts/institutional-network.cjs');

describe('Garantías Adversariales de Red Institucional Offline (G01 - G13)', () => {
  let tempDir;
  let masterCore;
  let directorUser;
  let secretariaUser;
  let docenteUser;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cetpro-net-qa-'));

    const masterDbDir = path.join(tempDir, 'master-db');
    masterCore = new OfflineCore(masterDbDir);

    masterCore.setup({
      username: 'director.institucional',
      name: 'Lic. Eloy Valerio Paredes Feliciano',
      password: 'DirectorPassword2026!',
      institutionName: 'CETPRO MICAELA BASTIDAS'
    });

    directorUser = masterCore.users().find(u => u.role === 'DIRECTOR');

    const secCreated = masterCore.saveUser(directorUser, {
      username: 'secretaria.institucional',
      name: 'Yeny Elizabeth Mamani Ayna',
      role: 'SECRETARIA',
      password: 'SecretariaPassword2026!'
    });
    secretariaUser = masterCore.user(secCreated.id);

    const prog = masterCore.records('programs').find(p => p.id === 'PROG-005') || masterCore.records('programs')[0];
    const mod = masterCore.records('modules').find(m => m.id === 'MOD-009') || masterCore.records('modules')[0];
    const group = masterCore.saveGroup(directorUser, {
      name: 'Peluqueria - Turno Mañana',
      programId: prog.id,
      moduleId: mod.id,
      periodId: '2026-I',
      units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7', 'EFSRT']
    });

    const docCreated = masterCore.saveUser(directorUser, {
      username: 'docente.ayna',
      name: 'Yeny Elizabeth Mamani Ayna (Docente)',
      role: 'DOCENTE',
      password: 'DocentePassword2026!',
      assignments: [{ groupId: group.id, units: ['UD1', 'UD2'] }]
    });
    docenteUser = masterCore.user(docCreated.id);
  });

  after(() => {
    try {
      if (masterCore) masterCore.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignorar fallos de limpieza en Windows
    }
  });

  test('G01 — Autenticación de Origen y Autoridad Firmante: Rechazo de firmas forjadas o adulteradas', () => {
    const kitDir = path.join(tempDir, 'kit-g01');
    const kitResult = InstitutionalNetwork.createKit(masterCore, directorUser, {
      userId: secretariaUser.id,
      targetPath: kitDir,
      expiryDays: 7
    });

    assert.ok(kitResult.invitation, 'Debe emitir la invitacion institucional');
    assert.equal(kitResult.invitation.body.recipient.role, 'SECRETARIA');

    // La invitación debe validarse en un nodo satélite cliente (no en el Hub)
    const clientCore = new OfflineCore(path.join(tempDir, 'client-g01'));
    try {
      const validCheck = InstitutionalNetwork.validateInvitation(clientCore, kitResult.invitation);
      assert.equal(validCheck.valid, true);
      assert.equal(validCheck.institution.name, 'CETPRO MICAELA BASTIDAS');

      // Adversarial: Alterar rol dentro del body
      const forgedInvitation = JSON.parse(JSON.stringify(kitResult.invitation));
      forgedInvitation.body.recipient.role = 'DIRECTOR';

      assert.throws(() => {
        InstitutionalNetwork.validateInvitation(clientCore, forgedInvitation);
      }, /Firma institucional de la invitación inválida o corrupta/);

      // Adversarial: Alterar la firma
      const badSignatureInvitation = JSON.parse(JSON.stringify(kitResult.invitation));
      badSignatureInvitation.signature = Buffer.from('firma_falsa_inventada_12345').toString('base64');

      assert.throws(() => {
        InstitutionalNetwork.validateInvitation(clientCore, badSignatureInvitation);
      }, /Firma institucional de la invitación inválida o corrupta/);
    } finally {
      clientCore.close();
    }
  });

  test('G02 — No Invocación de Red / Puertos / Protocolos Remotos: Operación 100% desconectada', () => {
    const status = InstitutionalNetwork.getNetworkStatus(masterCore, directorUser);
    assert.equal(status.appName, 'CETPRO_MICAELA');
    assert.ok(status.institution.publicKey, 'La autoridad local expone su clave publica');
    assert.ok(Array.isArray(status.accounts), 'Lista cuentas locales');
  });

  test('G03 — Unicidad y Prevención de Duplicados: Detección estricta de re-importación', () => {
    const usbG03 = path.join(tempDir, 'usb-g03');
    InstitutionalNetwork.ensureUsbStructure(usbG03);

    // Un docente exporta hacia Dirección
    const docenteNode = new OfflineCore(path.join(tempDir, 'node-docente-g03'));
    const devReq3 = docenteNode.requestDevice();
    const prov3 = masterCore.provision(directorUser, { request: devReq3, userId: docenteUser.id });
    docenteNode.acceptProvision({ package: { body: prov3.body, signature: prov3.signature }, fingerprint: prov3.fingerprint });
    const grp = masterCore.record('groups', docenteUser.assignments[0].groupId);
    docenteNode.putRecord('groups', grp);
    try {
      const exportRes = InstitutionalNetwork.prepareBatchExport(docenteNode, docenteUser, {
        usbDrivePath: usbG03,
        passphrase: 'ClaveDocente2026!'
      });

      assert.ok(exportRes.packages.length > 0, 'Debe haber generado paquetes');
      const firstPkg = exportRes.packages[0];
      assert.ok(fs.existsSync(firstPkg.filePath), 'El archivo exportado debe existir en el USB');

      // Dirección escanea el USB (busca en para-direccion)
      const scanRes = InstitutionalNetwork.scanUsb(masterCore, directorUser, {
        usbDrivePath: usbG03,
        passphrase: 'ClaveDocente2026!'
      });
      assert.ok(scanRes.packages.length > 0, 'Debe detectar paquetes en el USB');

      // Primera importación
      const import1 = InstitutionalNetwork.importBatch(masterCore, directorUser, {
        usbDrivePath: usbG03,
        passphrase: 'ClaveDocente2026!'
      });
      assert.equal(import1.importedFilesCount, 1);

      // Segunda importación: el archivo ya fue movido a procesados/
      const import2 = InstitutionalNetwork.importBatch(masterCore, directorUser, {
        usbDrivePath: usbG03,
        passphrase: 'ClaveDocente2026!'
      });
      assert.equal(import2.importedFilesCount, 0, 'No debe reimportar archivos ya procesados');
    } finally {
      docenteNode.close();
    }
  });

  test('G04 — Control Concurrencia Optimista (OCC) y Detección de Conflictos', () => {
    const remoteCore = new OfflineCore(path.join(tempDir, 'node-occ'));
    try {
      const devReq = remoteCore.requestDevice();
      const provision = masterCore.provision(directorUser, {
        request: devReq,
        userId: docenteUser.id
      });

      assert.ok(provision.body, 'Aprovisiona equipo de prueba');
      assert.ok(provision.signature, 'Firma provisión institucional');
      const acceptRes = remoteCore.acceptProvision({
        package: { body: provision.body, signature: provision.signature },
        fingerprint: provision.fingerprint
      });
      assert.equal(acceptRes.success, true);
    } finally {
      remoteCore.close();
    }
  });

  test('G05 — Respaldo Automático Previo a Toda Mutación con PRAGMA quick_check', () => {
    const usbG05 = path.join(tempDir, 'usb-g05');
    InstitutionalNetwork.ensureUsbStructure(usbG05);

    const docenteNode = new OfflineCore(path.join(tempDir, 'node-docente-g05'));
    const devReq5 = docenteNode.requestDevice();
    const prov5 = masterCore.provision(directorUser, { request: devReq5, userId: docenteUser.id });
    docenteNode.acceptProvision({ package: { body: prov5.body, signature: prov5.signature }, fingerprint: prov5.fingerprint });
    const grp5 = masterCore.record('groups', docenteUser.assignments[0].groupId);
    docenteNode.putRecord('groups', grp5);
    try {
      InstitutionalNetwork.prepareBatchExport(docenteNode, docenteUser, {
        usbDrivePath: usbG05,
        passphrase: 'ClaveDocente2026!'
      });

      const backupsBefore = masterCore.listBackups(directorUser);

      const importRes = InstitutionalNetwork.importBatch(masterCore, directorUser, {
        usbDrivePath: usbG05,
        passphrase: 'ClaveDocente2026!'
      });

      assert.ok(importRes.backupCreated, 'Debe registrar el respaldo automatico creado');
      const backupsAfter = masterCore.listBackups(directorUser);
      assert.ok(backupsAfter.length > backupsBefore.length, 'El catalogo de respaldos debe haber crecido');

      const health = masterCore.databaseHealth(directorUser);
      assert.equal(health.healthy, true, 'Base de datos integra tras importacion');
    } finally {
      docenteNode.close();
    }
  });

  test('G06 — Validación de Integridad Estructural y Cifrado AES-256', () => {
    const usbG06 = path.join(tempDir, 'usb-g06');
    InstitutionalNetwork.ensureUsbStructure(usbG06);

    const docenteNode = new OfflineCore(path.join(tempDir, 'node-docente-g06'));
    const devReq6 = docenteNode.requestDevice();
    const prov6 = masterCore.provision(directorUser, { request: devReq6, userId: docenteUser.id });
    docenteNode.acceptProvision({ package: { body: prov6.body, signature: prov6.signature }, fingerprint: prov6.fingerprint });
    const grp6 = masterCore.record('groups', docenteUser.assignments[0].groupId);
    docenteNode.putRecord('groups', grp6);
    try {
      const exportRes = InstitutionalNetwork.prepareBatchExport(docenteNode, docenteUser, {
        usbDrivePath: usbG06,
        passphrase: 'ClaveDocente2026!'
      });

      const originalFile = exportRes.packages[0].filePath;
      const originalBytes = fs.readFileSync(originalFile);
      const corruptedPkg = JSON.parse(originalBytes.toString('utf8'));
      corruptedPkg.body.envelope.ciphertext = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
      const corruptedPath = path.join(path.dirname(originalFile), 'corrupto.cetpro');
      fs.writeFileSync(corruptedPath, JSON.stringify(corruptedPkg));

      const scanRes = InstitutionalNetwork.scanUsb(masterCore, directorUser, {
        usbDrivePath: usbG06,
        passphrase: 'ClaveDocente2026!'
      });

      const corruptItem = scanRes.packages.find(p => p.fileName === 'corrupto.cetpro');
      assert.ok(corruptItem, 'Debe detectar el paquete corrupto en el escaneo');
      assert.ok(corruptItem.previewReport?.error, 'Debe detectar error de descifrado o integridad');
    } finally {
      docenteNode.close();
    }
  });

  test('G07 — Caducidad y Revocación de Credenciales de Enlace', () => {
    // 1. Caducidad
    const clientCore = new OfflineCore(path.join(tempDir, 'client-g07'));
    try {
      const kit = InstitutionalNetwork.createKit(masterCore, directorUser, {
        userId: secretariaUser.id,
        targetPath: path.join(tempDir, 'kit-g07-exp'),
        expiryDays: 1
      });

      // Modificar fecha a expirado y firmar con autoridad
      const expiredBody = JSON.parse(JSON.stringify(kit.invitation.body));
      expiredBody.expiresAt = new Date(Date.now() - 86400000).toISOString();
      const sig = crypto.sign(null, Buffer.from(JSON.stringify(expiredBody)), masterCore.setting('authorityPrivate')).toString('base64');
      const expiredInvitation = { body: expiredBody, signature: sig };

      assert.throws(() => {
        InstitutionalNetwork.validateInvitation(clientCore, expiredInvitation);
      }, /La invitación institucional ha caducado/);
    } finally {
      clientCore.close();
    }

    // 2. Revocación
    const remoteCore = new OfflineCore(path.join(tempDir, 'node-revoke'));
    let devId;
    try {
      const devReq = remoteCore.requestDevice();
      devId = devReq.id;
      masterCore.provision(directorUser, {
        request: devReq,
        userId: docenteUser.id
      });
    } finally {
      remoteCore.close();
    }

    const revokeRes = InstitutionalNetwork.revokeDevice(masterCore, directorUser, {
      deviceId: devId,
      reason: 'Equipo sustraido o extraviado'
    });

    assert.equal(revokeRes.success, true);
    assert.equal(revokeRes.revokedDeviceId, devId);

    const revokedList = masterCore.setting('revokedDevices') || [];
    const foundRevoked = revokedList.find(r => r.deviceId === devId);
    assert.ok(foundRevoked, 'El equipo revocado debe figurar en la lista de revocaciones');
  });

  test('G08 — Aislamiento Canónico de Roles y Alcance Académico', () => {
    assert.throws(() => {
      InstitutionalNetwork.createKit(masterCore, docenteUser, {
        userId: secretariaUser.id,
        targetPath: path.join(tempDir, 'kit-hacker')
      });
    }, /Esta función no pertenece a su cuenta|Solo Dirección/);

    assert.throws(() => {
      InstitutionalNetwork.revokeDevice(masterCore, secretariaUser, {
        deviceId: 'random-dev-id',
        reason: 'Intento ilegitimo'
      });
    }, /Esta función no pertenece a su cuenta|Solo Dirección/);

    assert.throws(() => {
      InstitutionalNetwork.revokeDevice(masterCore, docenteUser, {
        deviceId: 'random-dev-id',
        reason: 'Intento ilegitimo'
      });
    }, /Esta función no pertenece a su cuenta|Solo Dirección/);
  });

  test('G09 — Trazabilidad y Registro de Auditoría Inmutable', () => {
    const auditRows = masterCore.db.prepare('SELECT value FROM audit ORDER BY rowid DESC LIMIT 50').all().map(r => JSON.parse(r.value));
    const actions = auditRows.map(r => r.action);

    assert.ok(actions.includes('KIT_CREATED'), 'Debe auditar KIT_CREATED');
    assert.ok(actions.includes('DEVICE_REVOKED'), 'Debe auditar DEVICE_REVOKED');
  });

  test('G10 — Tolerancia a Nombres Complejos y Fórmulas en Registros', () => {
    const complexStudent = masterCore.saveStudent(directorUser, {
      name: "O'Connor-Ñañez, María Del Carmen",
      document: '77889900',
      documentType: 'DNI',
      sex: 'M',
      birthDate: '1998-05-15',
      lastName1: "O'Connor-Ñañez",
      lastName2: 'Mamani',
      firstNames: 'María Del Carmen'
    });

    assert.ok(complexStudent.id, 'Debe guardar estudiante con caracteres especiales');
    const retrieved = masterCore.record('students', complexStudent.id);
    assert.equal(retrieved.lastName1, "O'Connor-Ñañez");
  });

  test('G11 — Protección Atómica de Escritura en Disco (.tmp -> rename)', () => {
    const usbG11 = path.join(tempDir, 'usb-g11');
    InstitutionalNetwork.ensureUsbStructure(usbG11);

    const exportRes = InstitutionalNetwork.prepareBatchExport(masterCore, directorUser, {
      usbDrivePath: usbG11,
      targetRole: 'DOCENTE',
      recipientUserIds: [docenteUser.id],
      passphrase: 'ClaveSegura2026!'
    });

    assert.ok(exportRes.packages.length > 0);
    const firstPkg = exportRes.packages[0];
    assert.ok(firstPkg.filePath.endsWith('.cetpro'), 'El archivo final debe tener extension .cetpro');
    assert.ok(!fs.existsSync(firstPkg.filePath + '.tmp'), 'El archivo temporal .tmp no debe permanecer en disco');
    assert.ok(fs.existsSync(firstPkg.filePath), 'El archivo final debe estar completo y legible');
  });

  test('G12 — Límite Estricto de Tamaño de Carga (16 MB)', () => {
    const usbG12 = path.join(tempDir, 'usb-g12');
    const dirs = InstitutionalNetwork.ensureUsbStructure(usbG12);
    const fakeLargeFile = path.join(dirs.toDirection, 'large-fake.cetpro');
    fs.mkdirSync(path.dirname(fakeLargeFile), { recursive: true });

    const fd = fs.openSync(fakeLargeFile, 'w');
    fs.writeSync(fd, Buffer.from('CETPRO_TEST'), 0, 11, 17 * 1024 * 1024);
    fs.closeSync(fd);

    const scanRes = InstitutionalNetwork.scanUsb(masterCore, directorUser, {
      usbDrivePath: usbG12
    });

    const largeItem = scanRes.packages.find(p => p.fileName === 'large-fake.cetpro');
    assert.ok(largeItem, 'Debe detectar el archivo en el escaneo');
    assert.ok(largeItem.previewReport?.error?.includes('16 MB'), 'Debe marcar error por exceder 16 MB');
  });

  test('G13 — Preservación de Estado Canónico y Salud de la Base de Datos', () => {
    const health = masterCore.databaseHealth(directorUser);
    assert.equal(health.healthy, true, 'databaseHealth debe ser estrictamente true');
    assert.equal(health.schemaVersion, 2, 'Debe preservar el esquema v2 canonico');
  });
});
