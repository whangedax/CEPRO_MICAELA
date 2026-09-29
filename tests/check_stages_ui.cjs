const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.stage-nav-pill');
  
  const stages = ['ETAPA_1', 'ETAPA_2', 'ETAPA_3', 'ETAPA_4'];
  
  for (const st of stages) {
    console.log(`\n================ Testing ${st} ================`);
    await page.click(`.stage-nav-pill[data-stage-id="${st}"]`);
    await new Promise(r => setTimeout(r, 1000));
    
    const activeHeader = await page.$eval('.card-header h5', el => el.textContent.trim()).catch(e => e.message);
    const activeTemplate = await page.$eval('#doc-template-select', el => el.value).catch(e => e.message);
    const hasGroupSelect = await page.$('#doc-group-select');
    let groupOptions = [];
    if (hasGroupSelect) {
      groupOptions = await page.$$eval('#doc-group-select option', opts => opts.map(o => o.textContent.trim()));
    }
    
    console.log('Active Header:', activeHeader);
    console.log('Active Template:', activeTemplate);
    console.log('Has Group Select:', Boolean(hasGroupSelect));
    console.log('Group Options Count:', groupOptions.length);
    if (groupOptions.length) {
      console.log('First 2 Options:', groupOptions.slice(0, 2));
    }
    
    // Check what controls are rendered in Paso 2:
    const step2Html = await page.$eval('#doc-context-controls', el => el.innerText.replace(/\s+/g, ' ').trim()).catch(e => e.message);
    console.log('Paso 2 content summary:', step2Html.slice(0, 150));
    
    await page.screenshot({ path: `C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1/stage_${st}.png`, fullPage: true });
  }

  await browser.close();
})();
