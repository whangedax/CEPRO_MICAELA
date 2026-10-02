const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.stage-nav-pill');

  console.log('--- Clicking directly on ETAPA_2 pill ---');
  await page.evaluate(() => {
    const pill = document.querySelector('.stage-nav-pill[data-stage-id="ETAPA_2"]');
    if (pill) pill.click();
    else console.log('Pill ETAPA_2 NOT FOUND');
  });

  await new Promise(r => setTimeout(r, 2000));

  const state = await page.evaluate(() => {
    const sel = document.querySelector('#doc-template-select');
    const header = document.querySelector('.card-header h5');
    const groupSel = document.querySelector('#doc-group-select');
    return {
      template: sel?.value,
      header: header?.textContent.trim(),
      hasGroupSelect: Boolean(groupSel),
      optionsCount: groupSel?.options.length
    };
  });
  console.log('Result after clicking ETAPA_2:', state);

  await page.screenshot({ path: 'C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1/38_real_etapa2.png', fullPage: true });

  await browser.close();
})();
