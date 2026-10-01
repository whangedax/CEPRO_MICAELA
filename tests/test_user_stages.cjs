const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.stage-nav-pill');
  await new Promise(r => setTimeout(r, 1500));

  async function checkCurrentView(actionLabel) {
    const data = await page.evaluate(() => {
      const activeStage = document.querySelector('.stage-nav-pill.active')?.getAttribute('data-stage-id');
      const stageTitle = document.querySelector('.card-header h5')?.textContent.trim();
      const currentTmpl = document.querySelector('#doc-template-select')?.value;
      const groupSelect = document.querySelector('#doc-group-select');
      const groupOptions = groupSelect ? Array.from(groupSelect.options).map(o => ({ val: o.value, text: o.textContent.trim() })) : null;
      const selectedGroupCard = document.querySelector('#doc-selected-group-card')?.innerText.replace(/\s+/g, ' ').trim();
      const contextControlsText = document.querySelector('#doc-context-controls')?.innerText.replace(/\s+/g, ' ').trim();
      return {
        activeStage,
        stageTitle,
        currentTmpl,
        hasGroupSelect: Boolean(groupSelect),
        groupCount: groupOptions ? groupOptions.length : 0,
        optionsSample: groupOptions ? groupOptions.slice(0, 3) : [],
        selectedGroupCard,
        contextControlsPreview: contextControlsText ? contextControlsText.slice(0, 180) : ''
      };
    });
    console.log(`\n=== AFTER ${actionLabel} ===`);
    console.log(JSON.stringify(data, null, 2));
    return data;
  }

  // 1. Initial State (Etapa 1)
  await checkCurrentView('Initial Load');

  // 2. Click on ETAPA 2 tab
  await page.evaluate(() => {
    document.querySelector('.stage-nav-pill[data-stage-id="ETAPA_2"]').click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await checkCurrentView('Click Etapa 2 Tab');

  // 3. Click on Evaluación Card in Etapa 2
  await page.evaluate(() => {
    const card = document.querySelector('.doc-item-card[data-select-tmpl^="TMPL-1"]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await checkCurrentView('Click Evaluación Card in Etapa 2');

  // 4. Click on ETAPA 3 tab
  await page.evaluate(() => {
    document.querySelector('.stage-nav-pill[data-stage-id="ETAPA_3"]').click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await checkCurrentView('Click Etapa 3 Tab');

  // 5. Click on ETAPA 4 tab
  await page.evaluate(() => {
    document.querySelector('.stage-nav-pill[data-stage-id="ETAPA_4"]').click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await checkCurrentView('Click Etapa 4 Tab');

  // 6. Click on ETAPA 1 tab again
  await page.evaluate(() => {
    document.querySelector('.stage-nav-pill[data-stage-id="ETAPA_1"]').click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await checkCurrentView('Click Etapa 1 Tab Again');

  await browser.close();
})();
