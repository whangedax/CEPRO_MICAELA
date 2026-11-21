/**
 * tests/security-sterile.test.cjs
 * 
 * Verificación adversarial y de seguridad de la base de datos estéril institucional
 * y la regeneración de identidades únicas sin colisiones.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { sterilizeDatabase } = require('../scripts/baseline-sterilize.cjs');

const artifactsDir = path.join(__dirname, 'offline-artifacts', 'sterile-test');

test('Fase 2: Seguridad y Regeneración de Identidad con Base Estéril', async (t) => {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const sterileDbPath = path.join(__dirname, '..', 'sources', 'baseline', 'production-2026-sterile.sqlite');

  await t.test('1. La base estéril no contiene claves privadas maestras ni credenciales de dispositivo', () => {
    assert.ok(fs.existsSync(sterileDbPath), 'La base estéril debe existir');
    const db = new DatabaseSync(sterileDbPath);
    try {
      const authorityRow = db.prepare("SELECT value FROM settings WHERE key = 'authorityPrivate'").get();
      assert.equal(authorityRow, undefined, 'authorityPrivate DEBE ser null/undefined en la base estéril');

      const certRow = db.prepare("SELECT value FROM settings WHERE key = 'certificate'").get();
      assert.equal(certRow, undefined, 'certificate DEBE ser null/undefined en la base estéril');

      const deviceRow = db.prepare("SELECT value FROM settings WHERE key = 'device'").get();
      assert.equal(deviceRow, undefined, 'device DEBE ser null/undefined en la base estéril');

      const devicesRow = db.prepare("SELECT value FROM settings WHERE key = 'devices'").get();
      assert.ok(devicesRow, 'devices debe existir');
      assert.deepEqual(JSON.parse(devicesRow.value), [], 'devices debe ser una lista vacía');

      const check = db.prepare('PRAGMA quick_check').get();
      assert.equal(check.quick_check, 'ok', 'La base estéril debe pasar PRAGMA quick_check');
    } finally {
      db.close();
    }
  });

  await t.test('2. Dos instancias creadas a partir de la base estéril generan identidades únicas sin colisión', () => {
    const pc1Dir = path.join(artifactsDir, 'pc1-docente1');
    const pc2Dir = path.join(artifactsDir, 'pc2-docente2');
    fs.mkdirSync(pc1Dir, { recursive: true });
    fs.mkdirSync(pc2Dir, { recursive: true });

    // Copiar la base estéril como cetpro.sqlite en ambas carpetas
    fs.copyFileSync(sterileDbPath, path.join(pc1Dir, 'cetpro.sqlite'));
    fs.copyFileSync(sterileDbPath, path.join(pc2Dir, 'cetpro.sqlite'));

    const core1 = new OfflineCore(pc1Dir);
    const core2 = new OfflineCore(pc2Dir);

    try {
      const status1 = core1.status();
      const status2 = core2.status();

      // Ninguna debe ser autoridad
      assert.equal(status1.authority, false, 'PC1 no debe tener autoridad maestra');
      assert.equal(status2.authority, false, 'PC2 no debe tener autoridad maestra');

      // Ambas deben tener IDs de dispositivo distintos
      assert.ok(status1.deviceId, 'PC1 debe tener deviceId');
      assert.ok(status2.deviceId, 'PC2 debe tener deviceId');
      assert.notEqual(status1.deviceId, status2.deviceId, 'PC1 y PC2 DEBEN tener deviceIds diferentes (cero colisiones)');

      // Las claves públicas de firma de ambos dispositivos deben ser distintas
      const dev1 = core1.setting('device');
      const dev2 = core2.setting('device');
      assert.notEqual(dev1.signing.public, dev2.signing.public, 'Las claves de firma de PC1 y PC2 deben ser únicas');
      assert.notEqual(dev1.encryption.public, dev2.encryption.public, 'Las claves de cifrado de PC1 y PC2 deben ser únicas');

      // Ambas conservan los alumnos y matrículas de la línea base sin pérdida
      const students1 = core1.records('students');
      const enrollments1 = core1.records('enrollments');
      const students2 = core2.records('students');
      const enrollments2 = core2.records('enrollments');

      assert.ok(students1.length >= 286, `PC1 debe tener al menos 286 estudiantes (actual: ${students1.length})`);
      assert.ok(enrollments1.length >= students1.length, `PC1 debe tener matrículas >= estudiantes (${enrollments1.length} vs ${students1.length})`);
      assert.equal(students2.length, students1.length, 'PC1 y PC2 deben conservar el mismo número de estudiantes');
      assert.equal(enrollments2.length, enrollments1.length, 'PC1 y PC2 deben conservar el mismo número de matrículas');
    } finally {
      core1.close();
      core2.close();
    }
  });
});
