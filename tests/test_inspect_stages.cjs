const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.stage-nav-pill');
  
  // Take screenshot of Etapa 1
  await page.screenshot({ path: 'C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1/34_debug_etapa1.png', fullPage: true });

  // Click on Etapa 2 pill
  console.log('Clicking on ETAPA 2 pill...');
  const stagePills = await page.$$('.stage-nav-pill');
  await stagePills[1].click(); // Etapa 2
  await new Promise(r => setTimeout(r, 1500));
  
  // Inspect what's rendered in Etapa 2
  const etapa2Select = await page.$('#doc-group-select');
  const etapa2Options = etapa2Select ? await page.$$eval('#doc-group-select option', opts => opts.map(o => o.textContent.trim())) : null;
  console.log('Etapa 2 group select exists?', Boolean(etapa2Select));
  console.log('Etapa 2 options count:', etapa2Options ? etapa2Options.length : 0);
  if (etapa2Options) console.log('Etapa 2 options sample:', etapa2Options.slice(0, 3));
  
  await page.screenshot({ path: 'C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1/35_debug_etapa2.png', fullPage: true });

  // Click on Etapa 3 pill
  console.log('Clicking on ETAPA 3 pill...');
  await stagePills[2].click(); // Etapa 3
  await new Promise(r => setTimeout(r, 1500));
  const etapa3Select = await page.$('#doc-group-select');
  console.log('Etapa 3 group select exists?', Boolean(etapa3Select));
  await page.screenshot({ path: 'C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1/36_debug_etapa3.png', fullPage: true });

  // Click on Etapa 4 pill
  console.log('Clicking on ETAPA 4 pill...');
  await stagePills[3].click(); // Etapa 4
  await new Promise(r => setTimeout(r, 1500));
  const etapa4Select = await page.$('#doc-group-select');
  console.log('Etapa 4 group select exists?', Boolean(etapa4Select));
  await page.screenshot({ path: 'C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1/37_debug_etapa4.png', fullPage: true });

  await browser.close();
})();
