const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1200 });

  const artifactDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.stage-nav-pill');
  await new Promise(r => setTimeout(r, 1000));

  // Ir a ETAPA 4
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 1000));

  // Generar Certificado Modular
  await page.click('#doc-generate-tmpl20-btn');
  await page.waitForFunction(() => {
    const status = document.querySelector('#doc-group-status');
    return status && (status.textContent.includes('éxito') || status.textContent.includes('Error'));
  }, { timeout: 25000 });
  await new Promise(r => setTimeout(r, 1500));

  // Scroll down to the PDF viewer
  await page.evaluate(() => {
    window.scrollTo(0, 750);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, '59_etapa4_certificado_visor_scroll.png'), fullPage: false });

  // Ir a TMPL-21
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.click('.doc-item-card[data-select-tmpl="TMPL-21"]');
  await new Promise(r => setTimeout(r, 800));
  await page.click('#doc-generate-tmpl21-btn');
  await page.waitForFunction(() => {
    const status = document.querySelector('#doc-group-status');
    return status && (status.textContent.includes('éxito') || status.textContent.includes('Error'));
  }, { timeout: 25000 });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    window.scrollTo(0, 750);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, '60_etapa4_titulo_visor_scroll.png'), fullPage: false });

  console.log('Scroll screenshots captured successfully.');
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
