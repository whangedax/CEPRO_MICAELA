const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQ FAIL:', req.url()));

  await page.goto('http://127.0.0.1:8081/#/demo', { waitUntil: 'networkidle0' });
  await page.evaluate(() => { location.hash = '#/documentos'; });
  await new Promise(r => setTimeout(r, 3000));
  const text = await page.evaluate(() => document.querySelector('#main-content')?.innerText);
  console.log('TEXT:', text);
  await browser.close();
})();
