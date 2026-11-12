/**
 * tests/sync-whatsapp.test.cjs
 * 
 * Verificación del canal de sincronización por WhatsApp:
 * - Tokens compactos delimitados (---INICIO-CETPRO-SYNC---).
 * - Integridad CRC32 y compresión Deflate.
 * - Rechazo ante adulteración o truncado.
 * - Flujo de importación transaccional en Dirección.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const Network = require('../scripts/institutional-network.cjs');
const SyncWhatsApp = require('../scripts/sync-whatsapp.cjs');

const artifactsDir = path.join(__dirname, 'offline-artifacts', 'sync-whatsapp');

test('Fase 4: Sincronización Alternativa por WhatsApp', async (t) => {
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(artifactsDir, { recursive: true });

  const hubDir = path.join(artifactsDir, 'hub-dir');
  const docDir = path.join(artifactsDir, 'doc-dir');
  fs.mkdirSync(hubDir, { recursive: true });
  fs.mkdirSync(docDir, { recursive: true });

  const hubCore = new OfflineCore(hubDir);
  hubCore.setup({
    name: 'Lic. Eloy Valerio Paredes Feliciano',
    username: 'eloy.paredes',
    password: 'Password123!',
    institutionName: 'CETPRO MICAELA BASTIDAS'
  });
  const director = hubCore.users().find((u) => u.username === 'eloy.paredes');

  const docUser = {
    id: 'user-doc-wa',
    username: 'profesor.puno',
    name: 'Profesor Puno',
    role: 'DOCENTE',
    active: true,
    assignments: [{ groupId: 'GRP-WA-1', section: 'A', periodId: '2026-I', programId: 'PROG-001', moduleId: 'MOD-001', units: ['UD1'] }],
    version: 1
  };
  hubCore.putUser(docUser);
  hubCore.putRecord('programs', { id: 'PROG-001', name: 'Computación e Informática' });
  hubCore.putRecord('modules', { id: 'MOD-001', name: 'Ofimática', programId: 'PROG-001', periodId: '2026-I', units: ['UD1'] });
  hubCore.putRecord('groups', { id: 'GRP-WA-1', name: 'Aula 201', programId: 'PROG-001', moduleId: 'MOD-001', periodId: '2026-I', section: 'A', units: ['UD1'] });

  const kitDoc = Network.createKit(hubCore, director, { userId: docUser.id });
  const docCore = new OfflineCore(docDir);
  const docInvitation = JSON.parse(fs.readFileSync(path.join(kitDoc.kitDirectory, 'invitacion.cetpro-invitacion'), 'utf8'));
  Network.acceptInvitationAndLink(docCore, { invitation: docInvitation });
  docCore.putRecord('groups', { id: 'GRP-WA-1', name: 'Aula 201', programId: 'PROG-001', moduleId: 'MOD-001', periodId: '2026-I', section: 'A', units: ['UD1'] });

  const actorDocente = docCore.user(docUser.id);

  await t.test('1. Codificación y decodificación exacta de tokens de texto', () => {
    const mockPackage = {
      body: {
        app: 'CETPRO_OFFLINE',
        type: 'SYNC',
        id: 'pkg-wa-001',
        syncModule: 'grades',
        testData: 'Notas del módulo de peluquería en Juliaca'
      },
      signature: 'mock_signature_base64'
    };

    const tokenText = SyncWhatsApp.encodePackageToToken(mockPackage);
    assert.ok(tokenText.includes(SyncWhatsApp.HEADER_DELIMITER), 'Debe incluir delimitador de cabecera');
    assert.ok(tokenText.includes(SyncWhatsApp.FOOTER_DELIMITER), 'Debe incluir delimitador de pie');
    assert.ok(tokenText.includes('CETPRO-SYNC:v1:'), 'Debe incluir prefijo de versión');

    const decoded = SyncWhatsApp.decodeTokenToPackage(tokenText);
    assert.deepEqual(decoded, mockPackage, 'El paquete decodificado debe ser idéntico al original');
  });

  await t.test('2. Detección y rechazo de tokens corruptos o truncados', () => {
    const validToken = SyncWhatsApp.encodePackageToToken({ test: 'data' });

    // Corromper específicamente el checksum CRC32
    const lines = validToken.split('\r\n');
    const tokenLine = lines[1]; // CETPRO-SYNC:v1:<crc32>:<base64>
    const parts = tokenLine.split(':');
    parts[2] = '00000000'; // Alterar solo el CRC32
    lines[1] = parts.join(':');
    const corruptedChecksum = lines.join('\r\n');

    assert.throws(() => {
      SyncWhatsApp.decodeTokenToPackage(corruptedChecksum);
    }, /Error de integridad/);

    // Texto incompleto/truncado
    const truncated = validToken.slice(0, Math.floor(validToken.length / 2));
    assert.throws(() => {
      SyncWhatsApp.decodeTokenToPackage(truncated);
    }, /Fallo de descompresión|incompleto|corrupto|delimitador/);
  });

  await t.test('3. Exportación para WhatsApp desde el Docente e Importación en Dirección', () => {
    // Registrar estudiante y matrícula en ambos nodos
    const student = { id: 'STU-01', name: 'Estudiante Puno', document: '12345678' };
    const enrollment = { id: 'ENR-01', studentId: 'STU-01', groupId: 'GRP-WA-1', active: true, periodId: '2026-I' };
    hubCore.putRecord('students', student);
    hubCore.putRecord('enrollments', enrollment);
    docCore.putRecord('students', student);
    docCore.putRecord('enrollments', enrollment);

    const unit = 'UD1';
    const indicator = 'IL1';
    const crypto = require('node:crypto');
    const gradeRecordId = crypto.createHash('sha256').update(JSON.stringify(['grades', 'ENR-01', unit, indicator])).digest('hex');

    // El docente genera operaciones con firma y certificado válido
    docCore.transaction(() => {
      const inst = docCore.setting('institution');
      const dev = docCore.setting('device');
      const cert = docCore.setting('certificate');

      const gradeBody = {
        id: 'op-wa-grade-01',
        entity: 'grades',
        recordId: gradeRecordId,
        institutionId: inst.id,
        certificate: cert,
        actor: { id: actorDocente.id, name: actorDocente.name, role: actorDocente.role },
        value: {
          id: gradeRecordId,
          enrollmentId: 'ENR-01',
          groupId: 'GRP-WA-1',
          unit,
          indicator,
          value: 17,
          rev: 1
        }
      };

      const signOp = (value, key) => crypto.sign(null, Buffer.from(JSON.stringify(value)), key).toString('base64');

      docCore.db.prepare('INSERT INTO operations VALUES (?, ?, 0)').run(
        gradeBody.id,
        JSON.stringify({ body: gradeBody, signature: signOp(gradeBody, dev.signing.private) })
      );
    });

    const exportResult = SyncWhatsApp.exportForWhatsApp(docCore, actorDocente, {
      syncModule: 'grades',
      asToken: true
    });

    assert.ok(exportResult.success, 'La exportación debe ser exitosa');
    assert.ok(exportResult.isTokenAvailable, 'Debe haber generado token de texto');
    assert.ok(exportResult.tokenText.includes('CETPRO-SYNC:v1:'), 'El token debe contener el código');

    // Simular que el Director recibe el texto pegado de WhatsApp e importa
    const importResult = SyncWhatsApp.importFromWhatsApp(hubCore, director, {
      tokenText: exportResult.tokenText
    });

    assert.ok(importResult.success, 'La importación del texto de WhatsApp debe ser exitosa');
    assert.equal(importResult.channel, 'WHATSAPP');
    assert.equal(importResult.syncModule, 'grades');
  });

  hubCore.close();
  docCore.close();
});
