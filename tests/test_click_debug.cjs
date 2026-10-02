const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.stage-nav-pill');

  const pillInfo = await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('.stage-nav-pill')).map(p => ({
      stageId: p.getAttribute('data-stage-id'),
      className: p.className,
      hasOnclick: typeof p.onclick === 'function',
      outerHTML: p.outerHTML.slice(0, 150)
    }));
    return pills;
  });
  console.log('Pill info:', pillInfo);

  // Now simulate click using page.click (physical mouse event)
  console.log('Calling page.click on ETAPA_2...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 1000));

  const afterClick = await page.evaluate(() => ({
    activePill: document.querySelector('.stage-nav-pill.active')?.getAttribute('data-stage-id'),
    headerText: document.querySelector('.card-header h5')?.textContent.trim(),
    templateSelect: document.querySelector('#doc-template-select')?.value
  }));
  console.log('After page.click on ETAPA_2:', afterClick);

  await browser.close();
})();
