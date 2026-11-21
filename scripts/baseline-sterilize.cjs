/**
 * scripts/baseline-sterilize.cjs
 * 
 * Genera una versión estéril de la base de datos de producción (production-2026-sterile.sqlite)
 * eliminando claves privadas institucionales (authorityPrivate), credenciales del dispositivo (device)
 * y certificados locales, permitiendo que un instalador único universal sirva para cualquier rol
 * sin riesgo de clonación de Hub ni colisión de deviceIds.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sterilizeDatabase(sourceDbPath, targetDbPath) {
  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`La base de datos origen no existe: ${sourceDbPath}`);
  }

  // Si el destino ya existe, eliminarlo de forma segura
  if (fs.existsSync(targetDbPath)) {
    fs.unlinkSync(targetDbPath);
  }

  // Volcado atómico consistente desde sourceDbPath en modo solo lectura hacia copia temporal de trabajo
  const tempWorkingDb = `${targetDbPath}.tmp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const readDb = new DatabaseSync(sourceDbPath, { readOnly: true });
  try {
    readDb.exec(`VACUUM INTO '${tempWorkingDb.replace(/'/g, "''").replace(/\\/g, '/')}'`);
  } finally {
    readDb.close();
  }

  const db = new DatabaseSync(tempWorkingDb);

  try {
    // 1. Verificar integridad inicial
    const initialCheck = db.prepare('PRAGMA quick_check').get();
    if (initialCheck.quick_check !== 'ok') {
      throw new Error(`Integridad inicial corrupta: ${initialCheck.quick_check}`);
    }

    // 2. Purgar claves privadas y credenciales de dispositivo en settings
    const purgeKeys = [
      'authorityPrivate',
      'certificate',
      'device',
      'syncTokens',
      'provisionSequence'
    ];

    const delStmt = db.prepare('DELETE FROM settings WHERE key = ?');
    for (const key of purgeKeys) {
      delStmt.run(key);
    }

    // Resetear lista de dispositivos vinculados a lista vacía
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('devices', JSON.stringify([]));

    // 3. Purgar deltas temporales de sincronización para inicio limpio
    db.prepare('DELETE FROM operations').run();
    db.prepare('DELETE FROM receipts').run();
    db.prepare('DELETE FROM deliveries').run();
    db.prepare('DELETE FROM conflicts').run();

    // 3b. Aligerar emisiones removiendo pdfBase64 (conservando metadatos) y sellar rev faltantes
    let strippedPdfs = 0;
    let sealedRevs = 0;
    const updRecordStmt = db.prepare('UPDATE records SET value = ? WHERE entity = ? AND id = ?');
    db.exec('BEGIN');
    try {
      for (const row of db.prepare('SELECT entity, id, value FROM records').all()) {
        let parsed;
        try {
          parsed = JSON.parse(row.value);
        } catch {
          continue;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
        let changed = false;
        if (row.entity === 'documentEmissions' && Object.hasOwn(parsed, 'pdfBase64')) {
          delete parsed.pdfBase64;
          strippedPdfs++;
          changed = true;
        }
        if (!parsed.rev) {
          parsed.rev = crypto.randomUUID();
          sealedRevs++;
          changed = true;
        }
        if (changed) {
          updRecordStmt.run(JSON.stringify(parsed), row.entity, row.id);
        }
      }
      db.exec('COMMIT');
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }
    console.log(`[STERILIZE] pdfBase64 removidos en emisiones: ${strippedPdfs}; rev selladas: ${sealedRevs}`);

    // 4. Registrar evento de esterilización en auditoría
    const auditId = `audit_sterile_${Date.now()}`;
    const auditEntry = {
      action: 'BASELINE_STERILIZED',
      at: new Date().toISOString(),
      source: path.basename(sourceDbPath),
      version: '2.0-universal',
      detail: 'Claves privadas purgadas; dispositivo desvinculado; catalogo, matriculas y metadatos preservados'
    };
    db.prepare('INSERT INTO audit (id, value) VALUES (?, ?)').run(auditId, JSON.stringify(auditEntry));

    // 5. Verificar integridad final
    const finalCheck = db.prepare('PRAGMA quick_check').get();
    if (finalCheck.quick_check !== 'ok') {
      throw new Error(`Integridad final corrupta tras esterilización: ${finalCheck.quick_check}`);
    }

    // 6. Verificar que alumnos y matrículas activas permanecen íntegros (soporta doble matrícula entre carreras)
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM records WHERE entity = 'students'").get().count;
    const enrollmentCount = db.prepare("SELECT COUNT(*) as count FROM records WHERE entity = 'enrollments'").get().count;

    console.log(`[STERILIZE] Estudiantes preservados: ${studentCount}`);
    console.log(`[STERILIZE] Matrículas preservadas: ${enrollmentCount}`);

    if (!(studentCount > 0 && enrollmentCount >= studentCount)) {
      throw new Error(`Conteo inválido de estudiantes y matrículas: students=${studentCount}, enrollments=${enrollmentCount}`);
    }

    // 7. Congelar con VACUUM INTO hacia el archivo final optimizado
    db.exec(`VACUUM INTO '${targetDbPath.replace(/'/g, "''").replace(/\\/g, '/')}'`);
  } finally {
    db.close();
    if (fs.existsSync(tempWorkingDb)) {
      try { fs.unlinkSync(tempWorkingDb); } catch {}
    }
  }

  // Calcular SHA-256 final
  const finalBytes = fs.readFileSync(targetDbPath);
  const sha256 = crypto.createHash('sha256').update(finalBytes).digest('hex').toUpperCase();

  console.log(`[STERILIZE] Base estéril creada exitosamente: ${targetDbPath}`);
  console.log(`[STERILIZE] Tamaño: ${finalBytes.length} bytes`);
  console.log(`[STERILIZE] SHA-256: ${sha256}`);

  return { targetDbPath, size: finalBytes.length, sha256 };
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const sourceArg = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const sourcePath = sourceArg || path.join(rootDir, 'sources', 'baseline', 'production-2026.sqlite');
  const targetPath = path.join(rootDir, 'sources', 'baseline', 'production-2026-sterile.sqlite');

  console.log('=== Generando Base de Datos Estéril Institucional ===');
  console.log('[STERILIZE] Origen:', sourcePath);
  sterilizeDatabase(sourcePath, targetPath);
}

module.exports = { sterilizeDatabase };
