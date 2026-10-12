const fs = require('node:fs');
const path = require('node:path');
const { Jimp } = require('jimp');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function main() {
  const root = path.resolve('.');
  const inDir = path.join(root, 'tmp/audit_21');
  const cropDir = path.join(root, 'tmp/audit_21/crops');
  fs.mkdirSync(cropDir, { recursive: true });

  const templates = [];
  for (let n = 1; n <= 21; n++) {
    templates.push('TMPL-' + String(n).padStart(2, '0'));
  }

  const findings = [];

  for (const tid of templates) {
    const pngPath = path.join(inDir, `${tid}-1.png`);
    const pdfPath = path.join(inDir, `${tid}.pdf`);
    if (!fs.existsSync(pngPath) || !fs.existsSync(pdfPath)) continue;

    console.log(`Analyzing ${tid}...`);
    const img = await Jimp.read(pngPath);
    const W = img.bitmap.width;
    const H = img.bitmap.height;

    // 1. Crop Header (Logo & Title)
    // Scale is 2.0. Top 15% of page:
    const headerH = Math.round(H * 0.18);
    const headerCrop = img.clone().crop({ x: 0, y: 0, w: W, h: headerH });
    const headerCropPath = path.join(cropDir, `${tid}_header.png`);
    await headerCrop.write(headerCropPath);

    // 2. Crop Footer / Signatures
    // Bottom 18% of page:
    const footerH = Math.round(H * 0.18);
    const footerY = H - footerH;
    const footerCrop = img.clone().crop({ x: 0, y: footerY, w: W, h: footerH });
    const footerCropPath = path.join(cropDir, `${tid}_footer.png`);
    await footerCrop.write(footerCropPath);

    // 3. Inspect text collisions and anomalies using pdfjs
    const pdfBytes = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableFontFace: true }).promise;
    const page1 = await pdf.getPage(1);
    const textContent = await page1.getTextContent();
    const items = textContent.items.map(it => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      h: it.height
    }));

    // Check for "Micaela Bastidas PuENTRO" or double text
    const allText = items.map(it => it.str).join(' ');
    const doubleInstitution = /Micaela.*CENTRO|CENTRO.*Micaela/i.test(allText) && items.filter(it => it.str.includes('CENTRO DE EDUC')).length > 1;

    // Check for overlapping texts (items with close x,y but different text)
    const collisions = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (!a.str.trim() || !b.str.trim()) continue;
        if (Math.abs(a.y - b.y) < 3 && Math.abs(a.x - b.x) < 5 && a.str !== b.str) {
          collisions.push({ a: a.str, b: b.str, x: a.x, y: a.y });
        }
      }
    }

    findings.push({
      templateId: tid,
      dimensions: { W, H },
      textItemsCount: items.length,
      doubleInstitution,
      collisions,
      headerCropPath,
      footerCropPath
    });
  }

  fs.writeFileSync(path.join(cropDir, 'ANALYSIS_SUMMARY.json'), JSON.stringify(findings, null, 2));
  console.log('Analysis complete!');
  console.log(JSON.stringify(findings, null, 2));
}

main().catch(console.error);
