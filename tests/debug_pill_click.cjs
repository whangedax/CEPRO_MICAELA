const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('a[href="#/documentos"]');
  await page.click('a[href="#/documentos"]');
  await page.waitForSelector('.stage-nav-pill');
  await new Promise(r => setTimeout(r, 1000));

  // Add click listener in browser to log what is being clicked
  await page.evaluate(() => {
    window.__clickEvents = [];
    document.addEventListener('click', (e) => {
      window.__clickEvents.push({
        targetTag: e.target.tagName,
        targetClass: e.target.className,
        currentTargetTag: e.currentTarget?.tagName,
        targetDataStage: e.target.getAttribute('data-stage-id'),
        targetClosestPillStage: e.target.closest('.stage-nav-pill')?.getAttribute('data-stage-id'),
        pointerEvents: window.getComputedStyle(e.target).pointerEvents,
        x: e.clientX,
        y: e.clientY
      });
    }, true);
  });

  // Attempt click on ETAPA 2 pill
  console.log('Clicking on .stage-nav-pill[data-stage-id="ETAPA_2"]...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 1000));

  const events = await page.evaluate(() => window.__clickEvents);
  console.log('Click events captured:', JSON.stringify(events, null, 2));

  const activeStage = await page.evaluate(() => ({
    activePill: document.querySelector('.stage-nav-pill.active')?.getAttribute('data-stage-id'),
    headerText: document.querySelector('.card-header h5')?.textContent.trim(),
    templateSelect: document.querySelector('#doc-template-select')?.value
  }));
  console.log('Active state after click:', activeStage);

  await browser.close();
})();
