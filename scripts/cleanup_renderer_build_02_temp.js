const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname,'..'); const target=path.resolve(root,'tmp/pdfs/renderer-build-02');
const allowed=path.resolve(root,'tmp/pdfs')+path.sep;
if(!target.startsWith(allowed)||path.basename(target)!=='renderer-build-02')throw new Error('Ruta temporal no autorizada.');
if(fs.existsSync(target))fs.rmSync(target,{recursive:true,force:false});
console.log('renderer-build-02 temp removed');
