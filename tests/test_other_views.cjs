const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const routes = ['#/asistencia', '#/evaluacion', '#/efsrt', '#/cierre', '#/grupos', '#/nominas'];
  
  await page.goto('http://127.0.0.1:8081/', { waitUntil: 'domcontentloaded' });
  await new Promise(res => setTimeout(res, 2000));

  for (const r of routes) {
    await page.evaluate(h => { window.location.hash = h; }, r);
    await new Promise(res => setTimeout(res, 1500));
    
    const info = await page.evaluate(() => {
      const h2 = document.querySelector('h2, h3')?.textContent.trim();
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        id: s.id,
        name: s.name,
        optionsCount: s.options.length,
        firstOption: s.options[0]?.textContent.trim()
      }));
      const text = document.body.innerText;
      const mentionsNoGroups = text.includes('No hay grupos') || text.includes('no hay grupos') || text.includes('Sin grupos');
      return { h2, selects, mentionsNoGroups };
    });
    
    console.log(`\nRoute: ${r}`);
    console.log(JSON.stringify(info, null, 2));
  }

  await browser.close();
})();
