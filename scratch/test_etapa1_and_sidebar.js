const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function testEtapa1AndSidebar() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });

  console.log('1. Navegando a http://127.0.0.1:8081/#/documentos...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#sidebar', { timeout: 10000 });
  await page.waitForSelector('#document-stage-tabs', { timeout: 10000 });

  // 1.1 Validar saneamiento del sidebar
  console.log('1.1 Verificando enlaces de Operación Diaria en Sidebar...');
  const sidebarLinks = await page.evaluate(() => {
    const sidebar = document.querySelector('#sidebar');
    const links = Array.from(sidebar.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
      visible: a.offsetParent !== null
    }));
    return links;
  });

  console.log('Enlaces detectados en sidebar:', sidebarLinks.map(l => `${l.text} -> ${l.href} (visible: ${l.visible})`).join(', '));

  const visibleDailyHrefs = sidebarLinks.filter(l => l.visible).map(l => l.href);
  if (visibleDailyHrefs.includes('#/matriculas')) {
    throw new Error('FALLO: #/matriculas sigue visible en el sidebar');
  }
  if (visibleDailyHrefs.includes('#/nominas')) {
    throw new Error('FALLO: #/nominas sigue visible en el sidebar');
  }
  if (visibleDailyHrefs.includes('#/registros/matricula') || visibleDailyHrefs.includes('#/registro')) {
    throw new Error('FALLO: #/registros/matricula sigue visible en el sidebar');
  }
  console.log('OK: Sidebar saneado correctamente. Enlaces redundantes no visibles.');

  // 1.2 Validar que las 4 tarjetas de Etapa 1 no tienen enlaces redundantes
  console.log('1.2 Verificando que las tarjetas de Etapa 1 no tienen enlaces a Nóminas o Registros...');
  const etapa1CardLinks = await page.evaluate(() => {
    const cards = document.querySelectorAll('.doc-item-card');
    const links = [];
    cards.forEach(c => {
      c.querySelectorAll('a').forEach(a => links.push(a.textContent.trim()));
    });
    return links;
  });
  console.log('Enlaces encontrados dentro de tarjetas de Etapa 1:', etapa1CardLinks);
  if (etapa1CardLinks.some(text => /Ir a Nóminas|Ver en Nóminas|Reporte Alternativo/i.test(text))) {
    throw new Error('FALLO: Tarjetas de Etapa 1 aún contienen enlaces redundantes');
  }
  console.log('OK: Tarjetas de Etapa 1 están limpias de enlaces redundantes.');

  // Capturar vista inicial del panel saneado
  const screenshotSidebar = path.join(__dirname, 'panel_sidebar_saneado.png');
  await page.screenshot({ path: screenshotSidebar, fullPage: false });
  console.log(`Captura guardada: ${screenshotSidebar}`);

  // 2. Probar generación directa de TMPL-01 (Nómina Oficial)
  console.log('2. Probando generación directa de TMPL-01 (Nómina de Matrícula)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-01"]');
  await new Promise(r => setTimeout(r, 400));
  await page.waitForSelector('#doc-group-select', { timeout: 5000 });
  await page.waitForSelector('#doc-generate-tmpl01-btn', { timeout: 5000 });

  await page.click('#doc-generate-tmpl01-btn');
  console.log('Clic en Generar Nómina Oficial...');
  await page.waitForSelector('#doc-render-workspace iframe', { timeout: 15000 });
  console.log('OK: Iframe de TMPL-01 renderizado en la misma página.');
  const screenshotTmpl01 = path.join(__dirname, 'panel_tmpl01_generado.png');
  await page.screenshot({ path: screenshotTmpl01, fullPage: false });

  // 3. Probar generación directa de TMPL-04 (Portada de Carpeta)
  console.log('3. Probando generación directa de TMPL-04 (Portada de Carpeta)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-04"]');
  await new Promise(r => setTimeout(r, 400));
  await page.waitForSelector('#doc-generate-tmpl04-btn', { timeout: 5000 });

  await page.click('#doc-generate-tmpl04-btn');
  console.log('Clic en Generar Portada...');
  await page.waitForSelector('#doc-render-workspace iframe', { timeout: 15000 });
  console.log('OK: Iframe de TMPL-04 renderizado en la misma página.');
  const screenshotTmpl04 = path.join(__dirname, 'panel_tmpl04_generado.png');
  await page.screenshot({ path: screenshotTmpl04, fullPage: false });

  // 4. Probar generación directa de TMPL-03 Oficial y Reporte Alternativo
  console.log('4. Probando generación directa de TMPL-03 (Registro Modular)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-03"]');
  await new Promise(r => setTimeout(r, 400));
  await page.waitForSelector('#doc-generate-tmpl03-oficial-btn', { timeout: 5000 });
  await page.waitForSelector('#doc-generate-tmpl03-alt-btn', { timeout: 5000 });

  // 4.1 Oficial
  console.log('4.1 Generando Registro Modular Oficial TMPL-03...');
  await page.click('#doc-generate-tmpl03-oficial-btn');
  await page.waitForSelector('#doc-render-workspace iframe', { timeout: 15000 });
  console.log('OK: Iframe de TMPL-03 Oficial renderizado en la misma página.');
  const screenshotTmpl03Oficial = path.join(__dirname, 'panel_tmpl03_oficial_generado.png');
  await page.screenshot({ path: screenshotTmpl03Oficial, fullPage: false });

  // 4.2 Alternativo
  console.log('4.2 Generando Reporte Administrativo Alternativo...');
  await page.click('#doc-generate-tmpl03-alt-btn');
  await page.waitForSelector('#doc-render-workspace iframe', { timeout: 15000 });
  console.log('OK: Iframe de Reporte Alternativo renderizado en la misma página.');
  const screenshotTmpl03Alt = path.join(__dirname, 'panel_tmpl03_alt_generado.png');
  await page.screenshot({ path: screenshotTmpl03Alt, fullPage: false });

  // 5. Probar TMPL-02 (Ficha de Matrícula)
  console.log('5. Probando TMPL-02 (Ficha de Matrícula)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-02"]');
  await new Promise(r => setTimeout(r, 400));
  await page.waitForSelector('#doc-context-search', { timeout: 5000 });

  await page.type('#doc-context-search', 'GRP-BD');
  await page.waitForSelector('.document-context-result', { timeout: 5000 });
  await page.click('.document-context-result');
  await new Promise(r => setTimeout(r, 400));

  await page.waitForSelector('#doc-generate-btn:not([disabled])', { timeout: 5000 });
  await page.click('#doc-generate-btn');
  await page.waitForSelector('iframe[title="Vista previa PDF TMPL-02"]', { timeout: 15000 });
  console.log('OK: Iframe de TMPL-02 renderizado en la misma página.');
  const screenshotTmpl02 = path.join(__dirname, 'panel_tmpl02_generado.png');
  await page.screenshot({ path: screenshotTmpl02, fullPage: false });

  await browser.close();
  console.log('==================================================');
  console.log('¡TODAS LAS PRUEBAS DE INTERACCIÓN Y SANEAMIENTO PASARON CON ÉXITO!');
  console.log('==================================================');
}

testEtapa1AndSidebar().catch(err => {
  console.error('ERROR EN PRUEBAS:', err);
  process.exit(1);
});
