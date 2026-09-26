import { STAGING_DATA } from '../app/js/data/staging-data.js';

export function parseExcelDate(serialOrStr) {
  if (!serialOrStr) return null;
  const num = Number(serialOrStr);
  if (!isNaN(num) && num > 10000 && num < 60000) {
    // Excel epoch: Dec 30 1899
    const utcDays = num - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const dateObj = new Date(utcValue);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().substring(0, 10);
    }
  }
  if (typeof serialOrStr === 'string' && serialOrStr.includes('-')) {
    return serialOrStr.trim();
  }
  return null;
}

let dateCount = 0;
let nullCount = 0;
STAGING_DATA.forEach(r => {
  const d = parseExcelDate(r.fechaNacimientoOriginal);
  if (d) dateCount++;
  else nullCount++;
});

console.log(`Parsed dates: ${dateCount}, Null dates: ${nullCount}`);
console.log('Sample parsed dates:', STAGING_DATA.slice(0, 5).map(r => ({
  orig: r.fechaNacimientoOriginal,
  parsed: parseExcelDate(r.fechaNacimientoOriginal)
})));
