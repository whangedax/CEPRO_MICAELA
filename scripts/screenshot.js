const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const artifactDir = 'C:\\\\Users\\\\whangedax\\\\.gemini\\\\antigravity\\\\brain\\\\3d692a52-da89-4158-a53b-05a0109624c6';
  const screenshotPath1 = path.join(artifactDir, 'tmpl01_1.png');
  const screenshotPath10 = path.join(artifactDir, 'tmpl01_10.png');
  const screenshotPath30 = path.join(artifactDir, 'tmpl01_30.png');

  const uri = 'http://127.0.0.1:8125/#/documentos';
  console.log('Navigating to', uri);
  
  await page.goto(uri, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1200, height: 1000 });
  
  await new Promise(r => setTimeout(r, 2000));
  
  await page.waitForSelector('#doc-template-select', { timeout: 10000 });
  
  await page.select('#doc-template-select', 'TMPL-01');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const s = document.querySelector('#doc-mode-select');
    if(s) { s.value = 'TEST_PREVIEW'; s.dispatchEvent(new Event('change')); }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.select('#fixture-size-select', '1');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: screenshotPath1, fullPage: true });
  console.log('Saved 1');
  
  await page.select('#fixture-size-select', '10');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: screenshotPath10, fullPage: true });
  console.log('Saved 10');
  
  await page.select('#fixture-size-select', '30');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: screenshotPath30, fullPage: true });
  console.log('Saved 30');

  await browser.close();
  console.log('Screenshots generated');
})();

