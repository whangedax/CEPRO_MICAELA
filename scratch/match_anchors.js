const fs = require('fs');
const drawing = fs.readFileSync('scratch/unzipped_tmpl01/xl/drawings/drawing14.xml', 'utf8');

const matches = [];
const regex = /<xdr:(two|one)CellAnchor.*?>.*?<a:blip r:embed="([^"]+)".*?<\/xdr:\1CellAnchor>/gsv;
let m;
while ((m = regex.exec(drawing)) !== null) {
  matches.push({ anchor: m[0].substring(0, 100), rId: m[2] });
}
console.log(matches.slice(0, 4));
