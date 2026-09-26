const fs = require('fs');
const xml = fs.readFileSync('scratch/temp_xlsx_inspect/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION/xl/worksheets/sheet37.xml', 'utf8');
const sst = fs.readFileSync('scratch/temp_xlsx_inspect/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION/xl/sharedStrings.xml', 'utf8');
const strings = [];
const re = /<si>(?:(?!<\/si>).)*?<\/si>/gs;
let m;
while ((m = re.exec(sst)) !== null) {
  strings.push(m[0].replace(/<[^>]+>/g, ''));
}

const cellRe = /<c ([^>]+)>(?:<v>([^<]+)<\/v>)?/g;
while ((m = cellRe.exec(xml)) !== null) {
  const attrs = m[1];
  const val = m[2];
  const rMatch = attrs.match(/r="([^"]+)"/);
  const tMatch = attrs.match(/t="([^"]+)"/);
  const r = rMatch ? rMatch[1] : '?';
  const t = tMatch ? tMatch[1] : '';
  let text = val;
  if (t === 's') text = strings[parseInt(val, 10)];
  console.log(r + ' (' + t + '): ' + text);
}
