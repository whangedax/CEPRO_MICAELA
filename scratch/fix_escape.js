const fs = require('fs');
let content = fs.readFileSync('app/js/services/document-render-engine.js', 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync('app/js/services/document-render-engine.js', content);
console.log('Fixed escaping');
