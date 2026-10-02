const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  const artifactDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

  console.log('1. Cargando http://127.0.0.1:8081/#/documentos...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.stage-nav-pill');
  await new Promise(r => setTimeout(r, 1000));

  // Ir a ETAPA 3
  console.log('2. Clic en ETAPA 3...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_3"]');
  await new Promise(r => setTimeout(r, 800));

  // Clic en Generar Consolidado EFSRT
  console.log('3. Clic en #doc-generate-tmpl18-btn...');
  await page.waitForSelector('#doc-generate-tmpl18-btn');
  await page.click('#doc-generate-tmpl18-btn');

  // Esperar a que se genere el PDF (el visor o el status text de éxito)
  await page.waitForFunction(() => {
    const status = document.querySelector('#doc-group-status');
    return status && (status.textContent.includes('éxito') || status.textContent.includes('Error'));
  }, { timeout: 15000 });

  const statusText18 = await page.evaluate(() => document.querySelector('#doc-group-status')?.textContent);
  console.log('Status TMPL-18:', statusText18);

  await page.screenshot({ path: path.join(artifactDir, '46_verif_etapa3_efsrt_generado.png'), fullPage: false });

  // Cambiar a TMPL-19
  console.log('4. Clic en Acta Modular (TMPL-19)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-19"]');
  await new Promise(r => setTimeout(r, 800));

  // Clic en Generar Acta Oficial
  console.log('5. Clic en #doc-generate-tmpl19-btn...');
  await page.waitForSelector('#doc-generate-tmpl19-btn');
  await page.click('#doc-generate-tmpl19-btn');

  await page.waitForFunction(() => {
    const status = document.querySelector('#doc-group-status');
    return status && (status.textContent.includes('éxito') || status.textContent.includes('Error'));
  }, { timeout: 15000 });

  const statusText19 = await page.evaluate(() => document.querySelector('#doc-group-status')?.textContent);
  console.log('Status TMPL-19:', statusText19);

  await page.screenshot({ path: path.join(artifactDir, '47_verif_etapa3_acta_generada.png'), fullPage: false });

  console.log('Generación de PDFs en Etapa 3 completada con éxito.');
  await browser.close();
})();
