const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  await page.goto('file:///C:/CETPRO/CETPRO_MODERNIZACION_V2/informes_senati/INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html', { waitUntil: 'networkidle0' });

  const elements = await page.evaluateHandle(() => document.querySelectorAll('.page'));
  const p14 = await page.evaluateHandle(els => els[13], elements);

  await p14.asElement().screenshot({ path: 'C:/CETPRO/CETPRO_MODERNIZACION_V2/informes_senati/preview_page14_current.png' });
  console.log('Page 14 screenshot saved.');
  await browser.close();
})();
