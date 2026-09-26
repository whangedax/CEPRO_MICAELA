const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkDir(d) {
  let count = 0;
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      count += checkDir(p);
    } else if (p.endsWith('.js')) {
      execSync(`node --check "${p}"`);
      count++;
    }
  });
  return count;
}

const totalChecked = checkDir('c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/app/js');
console.log(`ALL ${totalChecked} JS FILES IN app/js PASSED SYNTAX CHECK (node --check)`);
