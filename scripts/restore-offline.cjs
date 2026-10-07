const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore, hash } = require('./offline-core.cjs');
function restore(core, source) {
  const parsed = typeof source === 'string' ? JSON.parse(source) : source;
  const b = parsed.backup;
  if (!b || b.app !== 'CETPRO_OFFLINE' || b.version !== 1 || parsed.checksum !== hash(b)) throw new Error('Respaldo incompleto o checksum inválido.');
  const tables = { settings: ['key','value'], users: ['id','username','value'], records: ['entity','id','value'], operations: ['id','value','acknowledged'], receipts: ['id','received'], deliveries: ['deviceId','operationId','acknowledged'], conflicts: ['id','value'], audit: ['id','value'] };
  b.deliveries ||= [];
  for (const [table, columns] of Object.entries(tables)) if (!Array.isArray(b[table]) || b[table].some(row => columns.some(column => row[column] === undefined))) throw new Error(`Tabla inválida: ${table}`);
  const before = core.createBackup(null, 'antes-restaurar');
  core.transaction(() => { for (const [table, columns] of Object.entries(tables)) { core.db.exec(`DELETE FROM ${table}`); const insert = core.db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`); for (const row of b[table]) insert.run(...columns.map(c => row[c])); } });
  return { success: true, previousCopy: before.filename };
}
if (require.main === module) {
  let core;
  try {
    const directory = path.resolve(process.env.CETPRO_DATA_DIR || path.join(__dirname, '..', 'private-data'));
    const lock = path.join(directory, 'server-lock.json');
    if (fs.existsSync(lock)) { const pid = JSON.parse(fs.readFileSync(lock, 'utf8')).pid; let running = false; try { process.kill(pid, 0); running = true; } catch {} if (running) throw new Error('Detenga el servicio antes de restaurar.'); }
    if (!process.argv[2]) throw new Error('Uso: node scripts/restore-offline.cjs RUTA_DEL_RESPALDO');
    core = new OfflineCore(directory);
    console.log(restore(core, fs.readFileSync(path.resolve(process.argv[2]), 'utf8')));
  } catch (e) { console.error(`Recuperación cancelada: ${e.message}`); process.exitCode = 1; } finally { core?.close(); }
}
module.exports = { restore };
