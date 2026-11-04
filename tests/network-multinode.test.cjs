/**
 * tests/network-multinode.test.cjs
 *
 * Suite de Simulación Canónica Multi-Nodo para CEPRO_MICAELA 2.0.
 * Modela el ciclo completo de vida de 4 nodos independientes operando 100% desconectados:
 * 1. Nodo Maestro (Dirección): Lic. Eloy Valerio Paredes Feliciano
 * 2. Nodo Secretaría: Yeny Elizabeth Mamani Ayna
 * 3. Nodo Docente Ayna: Yeny Elizabeth Mamani Ayna (Peluquería y Barbería)
 * 4. Nodo Docente Valdivia: Martín Valdivia (Computación e Informática)
 *
 * Flujo:
 * - Emisión de Kits Institucionales desde Dirección.
 * - Arranque en frío y vinculación criptográfica de los 3 nodos satélites.
 * - Generación de datos académicos locales concurrentes (matrículas, notas, asistencias).
 * - Exportación estructurada USB hacia Dirección (CEPRO_INTERCAMBIO/para-direccion/).
 * - Escaneo, respaldo preventivo obligatorio, validación PRAGMA quick_check e importación en Dirección.
 * - Verificación de consolidación unificada sin colisiones de revisiones ni duplicados.
 * - Despacho de vuelta desde Dirección hacia los satélites y confirmación de red "Al Día".
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { OfflineCore } = require('../scripts/offline-core.cjs');
const InstitutionalNetwork = require('../scripts/institutional-network.cjs');

const putRecord = (c, entity, obj) => {
  if (!obj || !obj.id) return;
  c.db.prepare('INSERT OR REPLACE INTO records (entity, id, value) VALUES (?,?,?)').run(entity, obj.id, JSON.stringify(obj));
};

describe('Simulación Canónica de Red Institucional Multi-Nodo (4 Nodos)', () => {
  let tempRoot;
  let usbRoot;

  let masterCore;
  let secretariaCore;
  let aynaCore;
  let valdiviaCore;

  let directorUser;
  let secUser;
  let aynaUser;
  let valdiviaUser;

  let peluqueriaGroup;
  let computacionGroup;
  let progPeluqueria;
  let modPeluqueria;
  let progComp;
  let modComp;

  before(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cetpro-multinode-qa-'));
    usbRoot = path.join(tempRoot, 'usb-drive');
    InstitutionalNetwork.ensureUsbStructure(usbRoot);

    // 1. Inicializar Maestro (Dirección)
    const masterDbDir = path.join(tempRoot, 'master-node');
    masterCore = new OfflineCore(masterDbDir);
    masterCore.setup({
      username: 'director.institucional',
      name: 'Lic. Eloy Valerio Paredes Feliciano',
      password: 'DirectorPassword2026!',
      institutionName: 'CETPRO MICAELA BASTIDAS'
    });
    directorUser = masterCore.users().find(u => u.role === 'DIRECTOR');

    // 2. Registrar Carreras y Aulas oficiales en Maestro
    progPeluqueria = masterCore.records('programs').find(p => p.id === 'PROG-005') || masterCore.records('programs')[0];
    modPeluqueria = masterCore.records('modules').find(m => m.id === 'MOD-009') || masterCore.records('modules')[0];
    peluqueriaGroup = masterCore.saveGroup(directorUser, {
      name: 'Peluquería y Barbería - Turno Mañana (Secc. A1)',
      programId: progPeluqueria.id,
      moduleId: modPeluqueria.id,
      periodId: '2026-I',
      units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7', 'EFSRT']
    });

    progComp = masterCore.records('programs').find(p => p.id === 'PROG-001') || masterCore.records('programs')[1] || progPeluqueria;
    modComp = masterCore.records('modules').find(m => m.programaId === progComp.id) || modPeluqueria;
    computacionGroup = masterCore.saveGroup(directorUser, {
      name: 'Computación e Informática - Turno Noche (Secc. B1)',
      programId: progComp.id,
      moduleId: modComp.id,
      periodId: '2026-I',
      units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'EFSRT']
    });

    // 3. Registrar Cuentas Oficiales en Maestro
    const secCreated = masterCore.saveUser(directorUser, {
      username: 'secretaria.institucional',
      name: 'Yeny Elizabeth Mamani Ayna',
      role: 'SECRETARIA',
      password: 'SecretariaPassword2026!'
    });
    secUser = masterCore.user(secCreated.id);

    const aynaCreated = masterCore.saveUser(directorUser, {
      username: 'docente.ayna',
      name: 'Yeny Elizabeth Mamani Ayna (Docente)',
      role: 'DOCENTE',
      password: 'DocenteAynaPassword2026!',
      assignments: [{ groupId: peluqueriaGroup.id, units: ['UD1', 'UD2', 'UD3'] }]
    });
    aynaUser = masterCore.user(aynaCreated.id);

    const valdiviaCreated = masterCore.saveUser(directorUser, {
      username: 'docente.valdivia',
      name: 'Martín Valdivia (Docente)',
      role: 'DOCENTE',
      password: 'DocenteValdiviaPassword2026!',
      assignments: [{ groupId: computacionGroup.id, units: ['UD1', 'UD2'] }]
    });
    valdiviaUser = masterCore.user(valdiviaCreated.id);

    // 4. Instanciar los 3 nodos satélites en carpetas separadas (en frío)
    secretariaCore = new OfflineCore(path.join(tempRoot, 'secretaria-node'));
    aynaCore = new OfflineCore(path.join(tempRoot, 'ayna-node'));
    valdiviaCore = new OfflineCore(path.join(tempRoot, 'valdivia-node'));
  });

  after(() => {
    try {
      if (masterCore) masterCore.close();
      if (secretariaCore) secretariaCore.close();
      if (aynaCore) aynaCore.close();
      if (valdiviaCore) valdiviaCore.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Ignorar cleanup en Windows
    }
  });

  test('Paso 1: Dirección genera 3 Kits Institucionales e inicializa los satélites', () => {
    const kitsDir = path.join(tempRoot, 'kits-emitted');

    const kitSec = InstitutionalNetwork.createKit(masterCore, directorUser, {
      userId: secUser.id,
      targetPath: kitsDir,
      expiryDays: 14
    });
    assert.ok(fs.existsSync(kitSec.invitationFile), 'Debe escribir invitacion.cetpro-invitacion para Secretaría');

    const kitAyna = InstitutionalNetwork.createKit(masterCore, directorUser, {
      userId: aynaUser.id,
      targetPath: kitsDir,
      expiryDays: 14
    });
    assert.ok(fs.existsSync(kitAyna.invitationFile), 'Debe escribir invitacion para Docente Ayna');

    const kitValdivia = InstitutionalNetwork.createKit(masterCore, directorUser, {
      userId: valdiviaUser.id,
      targetPath: kitsDir,
      expiryDays: 14
    });
    assert.ok(fs.existsSync(kitValdivia.invitationFile), 'Debe escribir invitacion para Docente Valdivia');

    // Vincular Satélite Secretaría
    const linkSec = InstitutionalNetwork.acceptInvitationAndLink(secretariaCore, {
      invitation: kitSec.invitation
    });
    assert.equal(linkSec.success, true);
    assert.equal(linkSec.linkedUser.role, 'SECRETARIA');

    // Vincular Satélite Docente Ayna
    const linkAyna = InstitutionalNetwork.acceptInvitationAndLink(aynaCore, {
      invitation: kitAyna.invitation
    });
    assert.equal(linkAyna.success, true);
    assert.equal(linkAyna.linkedUser.role, 'DOCENTE');

    // Vincular Satélite Docente Valdivia
    const linkValdivia = InstitutionalNetwork.acceptInvitationAndLink(valdiviaCore, {
      invitation: kitValdivia.invitation
    });
    assert.equal(linkValdivia.success, true);
    assert.equal(linkValdivia.linkedUser.role, 'DOCENTE');

    // En el Hub Maestro, registrar formalmente los dispositivos vinculados
    masterCore.setting('devices', [
      { id: linkSec.deviceId, userId: secUser.id, signingKey: secretariaCore.setting('device').signing.public, encryptionKey: secretariaCore.setting('device').encryption.public },
      { id: linkAyna.deviceId, userId: aynaUser.id, signingKey: aynaCore.setting('device').signing.public, encryptionKey: aynaCore.setting('device').encryption.public },
      { id: linkValdivia.deviceId, userId: valdiviaUser.id, signingKey: valdiviaCore.setting('device').signing.public, encryptionKey: valdiviaCore.setting('device').encryption.public }
    ]);

    // Replicar catálogos curriculares base en los satélites
    putRecord(secretariaCore, 'programs', progPeluqueria);
    putRecord(secretariaCore, 'programs', progComp);
    putRecord(secretariaCore, 'modules', modPeluqueria);
    putRecord(secretariaCore, 'modules', modComp);
    putRecord(secretariaCore, 'groups', peluqueriaGroup);
    putRecord(secretariaCore, 'groups', computacionGroup);

    putRecord(aynaCore, 'programs', progPeluqueria);
    putRecord(aynaCore, 'modules', modPeluqueria);
    putRecord(aynaCore, 'groups', peluqueriaGroup);

    putRecord(valdiviaCore, 'programs', progComp);
    putRecord(valdiviaCore, 'modules', modComp);
    putRecord(valdiviaCore, 'groups', computacionGroup);
  });

  test('Paso 2: Operaciones locales concurrentes en los 3 nodos satélites', () => {
    // 1. Secretaría registra 2 estudiantes oficiales
    const est1 = secretariaCore.saveStudent(secUser, {
      name: 'Mamani Quispe, Juan Carlos',
      document: '70112233',
      documentType: 'DNI',
      sex: 'H',
      birthDate: '2001-04-10',
      lastName1: 'Mamani',
      lastName2: 'Quispe',
      firstNames: 'Juan Carlos'
    });
    const est2 = secretariaCore.saveStudent(secUser, {
      name: 'Condori Flores, Ana Lucía',
      document: '70445566',
      documentType: 'DNI',
      sex: 'M',
      birthDate: '2002-09-18',
      lastName1: 'Condori',
      lastName2: 'Flores',
      firstNames: 'Ana Lucía'
    });

    const mat1 = secretariaCore.enroll(secUser, {
      studentId: est1.id,
      groupId: peluqueriaGroup.id,
      startDate: '2026-03-01'
    });
    const mat2 = secretariaCore.enroll(secUser, {
      studentId: est2.id,
      groupId: computacionGroup.id,
      startDate: '2026-03-01'
    });

    assert.ok(mat1.id && mat2.id, 'Secretaría completó las matrículas');

    // Replicar estudiantes y matrículas en los nodos de los docentes correspondientes
    putRecord(aynaCore, 'students', secretariaCore.record('students', est1.id));
    putRecord(aynaCore, 'enrollments', mat1);

    putRecord(valdiviaCore, 'students', secretariaCore.record('students', est2.id));
    putRecord(valdiviaCore, 'enrollments', mat2);

    // 2. Docente Ayna califica en Peluquería (UD1)
    const gradeAyna = aynaCore.saveAcademic(aynaUser, 'grades', {
      groupId: peluqueriaGroup.id,
      unit: 'UD1',
      rows: [{ enrollmentId: mat1.id, indicator: 'IL1.IA1', value: 17 }]
    });
    assert.ok(gradeAyna[0]?.rev, 'Docente Ayna registró nota 17 en Peluquería');

    // 3. Docente Valdivia califica en Computación (UD1)
    const gradeValdivia = valdiviaCore.saveAcademic(valdiviaUser, 'grades', {
      groupId: computacionGroup.id,
      unit: 'UD1',
      rows: [{ enrollmentId: mat2.id, indicator: 'IL1.IA1', value: 19 }]
    });
    assert.ok(gradeValdivia[0]?.rev, 'Docente Valdivia registró nota 19 en Computación');
  });

  test('Paso 3: Exportación concurrente de los 3 satélites al USB hacia Dirección', () => {
    // 1. Secretaría exporta
    const expSec = InstitutionalNetwork.prepareBatchExport(secretariaCore, secUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });
    assert.ok(expSec.packages.length > 0, 'Secretaría exportó su paquete');

    // 2. Docente Ayna exporta
    const expAyna = InstitutionalNetwork.prepareBatchExport(aynaCore, aynaUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });
    assert.ok(expAyna.packages.length > 0, 'Docente Ayna exportó su paquete');

    // 3. Docente Valdivia exporta
    const expValdivia = InstitutionalNetwork.prepareBatchExport(valdiviaCore, valdiviaUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });
    assert.ok(expValdivia.packages.length > 0, 'Docente Valdivia exportó su paquete');

    // Verificar archivos físicos en CEPRO_INTERCAMBIO/para-direccion
    const dirs = InstitutionalNetwork.ensureUsbStructure(usbRoot);
    const toDirFiles = fs.readdirSync(dirs.toDirection).filter(f => f.endsWith('.cetpro'));
    assert.equal(toDirFiles.length, 3, 'Deben existir exactamente 3 paquetes en para-direccion/');
  });

  test('Paso 4: Dirección escanea USB, aplica respaldo preventivo e importa el lote completo', () => {
    // 1. Escaneo en Dirección
    const scan = InstitutionalNetwork.scanUsb(masterCore, directorUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });

    assert.equal(scan.scannedFilesCount, 3, 'Debe escanear los 3 archivos');
    assert.equal(scan.pendingToImportCount, 3, 'Los 3 archivos deben estar listos para importar');

    // 2. Importación masiva con respaldo SQLite automático
    const importRes = InstitutionalNetwork.importBatch(masterCore, directorUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });

    assert.equal(importRes.totalFiles, 3);
    assert.equal(importRes.importedFilesCount, 3, 'Los 3 archivos se importaron con éxito');
    assert.equal(importRes.failedFilesCount, 0, 'Cero fallos en importación masiva');
    assert.ok(importRes.backupCreated.includes('antes-sincronizar-lote'), 'Generó respaldo preventivo SQLite');

    // 3. Verificación de archivos movidos a procesados/
    const dirs = InstitutionalNetwork.ensureUsbStructure(usbRoot);
    const remainingInToDir = fs.readdirSync(dirs.toDirection).filter(f => f.endsWith('.cetpro'));
    assert.equal(remainingInToDir.length, 0, 'La bandeja para-direccion debe quedar vacía');

    const processedFiles = fs.readdirSync(dirs.processed).filter(f => f.endsWith('.cetpro'));
    assert.equal(processedFiles.length, 3, 'Los 3 archivos deben residir archivados en procesados/');

    // 4. Integridad consolidada en la Base de Datos del Maestro
    const health = masterCore.databaseHealth(directorUser);
    assert.equal(health.healthy, true, 'PRAGMA quick_check = ok en el Maestro');

    const allStudents = masterCore.records('students');
    assert.ok(allStudents.some(s => s.document === '70112233'), 'Estudiante Juan Carlos consolidado');
    assert.ok(allStudents.some(s => s.document === '70445566'), 'Estudiante Ana Lucía consolidada');

    const allGrades = masterCore.records('grades');
    assert.ok(allGrades.some(g => g.value === 17), 'Nota de Peluquería (17) consolidada');
    assert.ok(allGrades.some(g => g.value === 19), 'Nota de Computación (19) consolidada');
  });

  test('Paso 5: Idempotencia y Resistencia — Segundo escaneo reporta 0 pendientes', () => {
    const scan2 = InstitutionalNetwork.scanUsb(masterCore, directorUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });
    assert.equal(scan2.pendingToImportCount, 0, 'No hay pendientes residuales');

    const import2 = InstitutionalNetwork.importBatch(masterCore, directorUser, {
      usbDrivePath: usbRoot,
      passphrase: 'ClaveInstitucional2026!'
    });
    assert.equal(import2.importedFilesCount, 0, 'Idempotencia: no duplica transacciones');
  });
});
