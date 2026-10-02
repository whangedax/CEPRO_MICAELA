const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1100 });

  const artifactDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('BROWSER_ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.log('PAGE_ERROR:', err.message);
  });

  console.log('1. Cargando http://127.0.0.1:8081/#/documentos...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.stage-nav-pill');
  await new Promise(r => setTimeout(r, 1000));

  // 2. Navegar a ETAPA 4
  console.log('2. Clic en pestaña ETAPA 4...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 1000));

  // Verificar tarjeta TMPL-20 seleccionada
  await page.waitForSelector('.doc-item-card[data-select-tmpl="TMPL-20"]');
  await page.screenshot({ path: path.join(artifactDir, '55_etapa4_vista_inicial.png'), fullPage: false });

  // 3. Abrir Modal de Datos Registrales de TMPL-20
  console.log('3. Clic en #doc-open-etapa4-modal-btn...');
  await page.waitForSelector('#doc-open-etapa4-modal-btn');
  await page.click('#doc-open-etapa4-modal-btn');
  await page.waitForSelector('#etapa4-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(artifactDir, '56_etapa4_modal_registro.png'), fullPage: false });

  // Guardar y cerrar modal
  console.log('4. Guardar datos en modal...');
  await page.click('#modal-e4-save-btn');
  await new Promise(r => setTimeout(r, 600));

  // 5. Generar PDF de TMPL-20 (Certificado Modular)
  console.log('5. Clic en #doc-generate-tmpl20-btn...');
  await page.waitForSelector('#doc-generate-tmpl20-btn');
  await page.click('#doc-generate-tmpl20-btn');

  // Esperar a que se procese y muestre éxito
  await page.waitForFunction(() => {
    const status = document.querySelector('#doc-group-status');
    return status && (status.textContent.includes('éxito') || status.textContent.includes('Error'));
  }, { timeout: 25000 });

  const statusTmpl20 = await page.evaluate(() => document.querySelector('#doc-group-status')?.textContent);
  console.log('Status TMPL-20:', statusTmpl20);

  if (statusTmpl20 && statusTmpl20.includes('Error')) {
    throw new Error('Error al generar TMPL-20: ' + statusTmpl20);
  }

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(artifactDir, '57_etapa4_certificado_modular_pdf.png'), fullPage: false });

  // 6. Seleccionar TMPL-21 (Título Profesional Técnico)
  console.log('6. Clic en tarjeta TMPL-21...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-21"]');
  await new Promise(r => setTimeout(r, 1000));

  // 7. Generar PDF de TMPL-21 (Título Técnico)
  console.log('7. Clic en #doc-generate-tmpl21-btn...');
  await page.waitForSelector('#doc-generate-tmpl21-btn');
  await page.click('#doc-generate-tmpl21-btn');

  await page.waitForFunction(() => {
    const status = document.querySelector('#doc-group-status');
    return status && (status.textContent.includes('éxito') || status.textContent.includes('Error'));
  }, { timeout: 25000 });

  const statusTmpl21 = await page.evaluate(() => document.querySelector('#doc-group-status')?.textContent);
  console.log('Status TMPL-21:', statusTmpl21);

  if (statusTmpl21 && statusTmpl21.includes('Error')) {
    throw new Error('Error al generar TMPL-21: ' + statusTmpl21);
  }

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(artifactDir, '58_etapa4_titulo_tecnico_pdf.png'), fullPage: false });

  console.log('=== VERIFICACIÓN E2E ETAPA 4 COMPLETADA CON ÉXITO ===');
  console.log('Total errores de consola:', consoleErrors.length);

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('FAIL E2E ETAPA 4:', err);
  process.exit(1);
});
