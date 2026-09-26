const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // We don't even need to load the full app, just a page with IndexedDB access to CETPRO_DB
  // But since CETPRO_DB is tied to the origin, we should serve the app and load it!
  // Wait, we can just load the file:// URL of the app!
  // file:///C:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/app/index.html
  
  const path = require('path');
  const appUrl = 'file:///' + path.resolve('app/index.html').replace(/\\/g, '/');
  
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });

  // wait a bit for DB to initialize just in case
  await new Promise(r => setTimeout(r, 1000));

  const report = await page.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CETPRO_DB');
      request.onerror = () => reject('Failed to open DB');
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['estudiantes'], 'readonly');
        const store = tx.objectStore('estudiantes');
        const getAll = store.getAll();
        
        getAll.onsuccess = () => {
          const students = getAll.result;
          resolve(students);
        };
        getAll.onerror = () => reject('Failed to get students');
      };
    });
  });

  console.log(`Found ${report.length} students in IndexedDB.`);
  fs.writeFileSync('scratch/estudiantes_dump.json', JSON.stringify(report, null, 2));

  await browser.close();
})();
