const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('a[href="#/documentos"]');
  await page.click('a[href="#/documentos"]');
  await page.waitForSelector('.stage-nav-pill');

  const hitInfo = await page.evaluate(() => {
    const pill = document.querySelector('.stage-nav-pill[data-stage-id="ETAPA_2"]');
    const rect = pill.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    return {
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      centerX,
      centerY,
      elementAtPoint: {
        tagName: elementAtPoint?.tagName,
        className: elementAtPoint?.className,
        id: elementAtPoint?.id,
        text: elementAtPoint?.innerText
      }
    };
  });
  console.log('Element at point of ETAPA 2:', JSON.stringify(hitInfo, null, 2));

  await browser.close();
})();
