const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1080']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:8080/#/login', { waitUntil: 'networkidle0' });
    await page.type('#username', 'eloy.paredes');
    await page.type('#password', 'Eloy2026!');
    await page.click('#login-form button[type=submit]');
    await page.waitForSelector('#logout', { timeout: 10000 });

    await page.goto('http://127.0.0.1:8080/#/documentos', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#document-template');
    await page.select('#document-template', 'TMPL-06');
    await new Promise(r => setTimeout(r, 400));
    await page.click('#document-generate');
    await page.waitForFunction(() => document.querySelector('.pdf-canvas')?.width > 0, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    // Seleccionar Zoom 150% para ver los detalles con máxima nitidez
    await page.select('[data-zoom]', '1.5');
    await new Promise(r => setTimeout(r, 1500));

    const stage = await page.$('.pdf-stage');
    if (stage) {
      const outPath = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1\\EVIDENCIA_DETALLE_NITIDO_ASISTENCIA_COMPLETA.png';
      await stage.screenshot({ path: outPath });
      console.log('✓ Captura nítida guardada en:', outPath);
    }
  } finally {
    await browser.close();
  }
})();
