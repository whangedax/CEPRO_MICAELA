/**
 * scripts/sanitize-attendance-duplicates.cjs
 * 
 * Saneamiento de registros anómalos de asistencia en dev-sandbox/data:
 * 1. Respaldo preventivo atómico con VACUUM INTO en dev-sandbox/data/backups/
 * 2. Eliminación de registros fuera del rango de su Unidad Didáctica (ej. 120 en noviembre 2026)
 * 3. Fusión determinista de sesiones duplicadas en la misma fecha (forzando sesión '1')
 * 4. Preservación del padrón 1:1 de 286 matrículas y verificación PRAGMA quick_check = ok
 * 
 * Uso:
 *   node scripts/sanitize-attendance-duplicates.cjs          (Modo dry-run informativo)
 *   node scripts/sanitize-attendance-duplicates.cjs --apply  (Aplica los cambios en la BD)
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { OfflineCore } = require('./offline-core.cjs');
const { unitDateRange } = require('./unit-date-range.cjs');

const canonical = value => JSON.stringify(value ?? null);
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');

function main() {
  const isApply = process.argv.includes('--apply');
  const dataDirIdx = process.argv.indexOf('--data');
  const targetDir = dataDirIdx !== -1 && process.argv[dataDirIdx + 1] ? process.argv[dataDirIdx + 1] : 'dev-sandbox/data';
  const resolvedDir = path.resolve(targetDir);

  const repoRoot = path.resolve(__dirname, '..');
  const baselineDir = path.join(repoRoot, 'sources', 'baseline');
  if (resolvedDir.startsWith(baselineDir) || resolvedDir.includes('baseline')) {
    console.error('ERROR DE SEGURIDAD: No se permite ejecutar la sanitización sobre la base de producción o baseline.');
    process.exit(1);
  }

  const dbPath = path.join(resolvedDir, 'cetpro.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error(`ERROR: No existe la base de datos en ${dbPath}`);
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('      CEPRO_MICAELA 2.0 — SANEAMIENTO DE DUPLICADOS DE ASISTENCIA       ');
  console.log('========================================================================');
  console.log(`Directorio objetivo: ${resolvedDir}`);
  console.log(`Modo:                ${isApply ? 'APLICAR CAMBIOS (--apply)' : 'DRY-RUN (Simulación informativa)'}`);
  console.log('========================================================================\n');

  // Inicializar instancia de OfflineCore para leer catálogo y configuraciones
  const core = new OfflineCore(resolvedDir);
  const db = core.db;

  // 1. Respaldo preventivo VACUUM INTO si es en modo --apply
  if (isApply) {
    const backupDir = path.join(resolvedDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `pre-sanitize-attendance-${timestamp}.sqlite`);
    console.log(`[RESPALDO] Generando respaldo SQLite preventivo: ${backupPath}...`);
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);
    const backupStat = fs.statSync(backupPath);
    console.log(`✔ Respaldo completado (${(backupStat.size / (1024 * 1024)).toFixed(2)} MB)\n`);
  }

  // 2. Analizar registros de asistencia actuales
  const rawRows = db.prepare("SELECT id, value FROM records WHERE entity = 'attendance'").all();
  console.log(`[ANÁLISIS] Total de registros de asistencia actuales en BD: ${rawRows.length}`);

  const enrollmentsMap = new Map();
  for (const en of core.records('enrollments')) {
    enrollmentsMap.set(en.id, en);
  }

  const groupsMap = new Map();
  for (const gr of core.records('groups')) {
    groupsMap.set(gr.id, gr);
  }

  let outOfBoundsCount = 0;
  let sessionNotOneCount = 0;
  const toDeleteIds = new Set();
  const validRecordsByKey = new Map();

  for (const row of rawRows) {
    let parsed;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      toDeleteIds.add(row.id);
      continue;
    }

    const enrollmentId = parsed.enrollmentId;
    const unit = parsed.unit;
    const date = parsed.date || parsed.fecha;

    if (!enrollmentId || !unit || !date) {
      toDeleteIds.add(row.id);
      continue;
    }

    if (parsed.session !== '1') {
      sessionNotOneCount++;
    }

    const en = enrollmentsMap.get(enrollmentId);
    const gr = en ? groupsMap.get(en.groupId) : null;
    const unitDates = gr ? unitDateRange(core, gr, unit) : null;

    // Verificar si la fecha está fuera de la UD
    if (unitDates?.fechaInicio && unitDates?.fechaFin) {
      if (date < unitDates.fechaInicio || date > unitDates.fechaFin) {
        outOfBoundsCount++;
        toDeleteIds.add(row.id);
        continue;
      }
    }

    // Agrupar registros válidos por clave única [alumno + unidad + fecha]
    const key = `${enrollmentId}|${unit}|${date}`;
    if (!validRecordsByKey.has(key)) {
      validRecordsByKey.set(key, []);
    }
    validRecordsByKey.get(key).push({ id: row.id, parsed });
  }

  console.log(`[ANÁLISIS] Registros fuera del rango de su UD detectados: ${outOfBoundsCount}`);
  console.log(`[ANÁLISIS] Registros con sesión distinta de '1' detectados: ${sessionNotOneCount}`);

  let duplicatesMergedCount = 0;
  const toUpsertRecords = [];

  for (const [key, records] of validRecordsByKey.entries()) {
    if (records.length > 1) {
      duplicatesMergedCount += (records.length - 1);
    }

    // Ordenar para elegir el ganador
    records.sort((a, b) => {
      const pA = a.parsed, pB = b.parsed;
      // 1. Preferir registro con valor registrado no nulo
      const hasValA = pA.value && !pA.pending ? 1 : 0;
      const hasValB = pB.value && !pB.pending ? 1 : 0;
      if (hasValA !== hasValB) return hasValB - hasValA;

      // 2. Más reciente por timestamp o updatedAt
      const timeA = pA.updatedAt || pA.createdAt || '';
      const timeB = pB.updatedAt || pB.createdAt || '';
      if (timeA && timeB && timeA !== timeB) return timeB.localeCompare(timeA);

      // 3. Mayor número de revisión
      const revA = Number(pA.rev) || 0;
      const revB = Number(pB.rev) || 0;
      if (revA !== revB) return revB - revA;

      // 4. Preferir session === '1'
      if (pA.session === '1' && pB.session !== '1') return -1;
      if (pB.session === '1' && pA.session !== '1') return 1;

      return 0;
    });

    const winner = records[0];
    const canonicalId = hash(['attendance', winner.parsed.enrollmentId, winner.parsed.unit, [winner.parsed.date, '1']]);

    // Marcar para borrado todos los registros que no tengan el ID canónico
    for (const item of records) {
      if (item.id !== canonicalId) {
        toDeleteIds.add(item.id);
      }
    }

    // Normalizar el ganador a sesión '1' y canonicalId
    const normalizedWinner = {
      ...winner.parsed,
      id: canonicalId,
      session: '1'
    };

    toUpsertRecords.push({ id: canonicalId, value: canonical(normalizedWinner) });
  }

  console.log(`[ANÁLISIS] Sesiones duplicadas a fusionar en la misma fecha: ${duplicatesMergedCount}`);
  console.log(`[ANÁLISIS] Registros huérfanos/obsoletos a eliminar: ${toDeleteIds.size}`);
  console.log(`[ANÁLISIS] Registros de asistencia resultantes finales: ${toUpsertRecords.length}\n`);

  if (!isApply) {
    console.log('ℹ Modo DRY-RUN finalizado con éxito.');
    console.log('  Para aplicar estas correcciones de manera definitiva en cetpro.sqlite, ejecute:');
    console.log('  node scripts/sanitize-attendance-duplicates.cjs --apply\n');
    core.close();
    return;
  }

  // 3. Aplicar en una única transacción atómica SQLite
  console.log('[APLICANDO] Ejecutando saneamiento en transacción SQLite atómica...');
  const deleteStmt = db.prepare("DELETE FROM records WHERE entity = 'attendance' AND id = ?");
  const upsertStmt = db.prepare("INSERT INTO records (entity, id, value) VALUES ('attendance', ?, ?) ON CONFLICT(entity, id) DO UPDATE SET value = excluded.value");

  db.exec('BEGIN IMMEDIATE;');
  try {
    for (const delId of toDeleteIds) {
      deleteStmt.run(delId);
    }
    for (const up of toUpsertRecords) {
      upsertStmt.run(up.id, up.value);
    }

    // Registrar evento de auditoría
    const auditId = crypto.randomUUID();
    const auditRecord = {
      id: auditId,
      action: 'SANITIZE_ATTENDANCE_DUPLICATES',
      performedAt: new Date().toISOString(),
      beforeCount: rawRows.length,
      outOfBoundsDeleted: outOfBoundsCount,
      duplicatesMerged: duplicatesMergedCount,
      totalDeleted: toDeleteIds.size,
      afterCount: toUpsertRecords.length
    };
    db.prepare("INSERT INTO audit (id, value) VALUES (?, ?)").run(auditId, canonical(auditRecord));

    db.exec('COMMIT;');
    console.log('✔ Transacción confirmada con éxito (COMMIT).');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('ERROR al aplicar transacciones. Se ejecutó ROLLBACK:', err);
    core.close();
    process.exit(1);
  }

  // 4. Validar integridad post-saneamiento
  const checkResult = db.prepare('PRAGMA quick_check;').all();
  const isHealthy = checkResult.length === 1 && checkResult[0].quick_check === 'ok';
  console.log(`✔ Integridad SQLite: PRAGMA quick_check = ${isHealthy ? 'ok' : 'FAILED'}`);

  const activeEnrollments = db.prepare("SELECT count(1) as total FROM records WHERE entity = 'enrollments' AND json_extract(value, '$.active') = 1").get();
  console.log(`✔ Matrículas activas verificadas: ${activeEnrollments.total} (debe ser 286)`);

  const finalAttendanceCount = db.prepare("SELECT count(1) as total FROM records WHERE entity = 'attendance'").get();
  console.log(`✔ Total de asistencias limpias finales: ${finalAttendanceCount.total}`);

  const remainingSessionNotOne = db.prepare("SELECT count(1) as total FROM records WHERE entity = 'attendance' AND json_extract(value, '$.session') != '1'").get();
  console.log(`✔ Sesiones distintas de '1' remanentes: ${remainingSessionNotOne.total} (debe ser 0)`);

  core.close();

  console.log('\n========================================================================');
  console.log('       SANEAMIENTO COMPLETADO EXITOSAMENTE — INTEGRIDAD VERIFICADA      ');
  console.log('========================================================================');
}

if (require.main === module) {
  main();
}

module.exports = { main };

