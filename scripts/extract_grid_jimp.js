const Jimp = require('jimp');

async function extractGrid() {
  const image = await Jimp.read('app/img/TMPL01_PRINT_PAGE_1.png');
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  const hlines = [];
  for (let y = 0; y < height; y++) {
    let blackCount = 0;
    for (let x = 0; x < width; x++) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      if (color.r < 128) blackCount++;
    }
    if (blackCount > width * 0.1) {
      hlines.push(y);
    }
  }
  
  const vlines = [];
  for (let x = 0; x < width; x++) {
    let blackCount = 0;
    for (let y = 0; y < height; y++) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      if (color.r < 128) blackCount++;
    }
    if (blackCount > height * 0.05) {
      vlines.push(x);
    }
  }
  
  // cluster
  const cluster = (lines) => {
    const res = [];
    let current = [];
    lines.forEach(val => {
      if (current.length === 0 || val - current[current.length - 1] < 5) current.push(val);
      else { res.push(Math.round(current.reduce((a,b)=>a+b,0)/current.length)); current = [val]; }
    });
    if (current.length > 0) res.push(Math.round(current.reduce((a,b)=>a+b,0)/current.length));
    return res;
  };
  
  const hClusters = cluster(hlines);
  const vClusters = cluster(vlines);
  
  const scaleX = 595.304 / 1654;
  const scaleY = 841.890 / 2339;
  
  const pdfH = hClusters.map(y => (y * scaleY).toFixed(2));
  const pdfV = vClusters.map(x => (x * scaleX).toFixed(2));
  
  require('fs').writeFileSync('scratch/png_grid.json', JSON.stringify({ pdfH, pdfV }, null, 2));
  console.log("Extracted grid from PNG.");
}

extractGrid().catch(console.error);
