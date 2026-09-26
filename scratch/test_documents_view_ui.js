const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function testUI() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });

  console.log('1. Navegando a #/documentos...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#document-stage-tabs', { timeout: 10000 });

  // 1.1 Verificar estilos de bordes y contraste en Etapa 1
  console.log('1.1 Verificando estilos computados de tarjetas activas e inactivas...');
  const cardStyles = await page.evaluate(() => {
    const activeCard = document.querySelector('.doc-item-card.active-template');
    const inactiveCard = document.querySelector('.doc-item-card:not(.active-template)');
    const activeStage = document.querySelector('.stage-nav-pill.active');
    const inactiveStage = document.querySelector('.stage-nav-pill:not(.active)');

    return {
      activeCard: {
        borderTopColor: getComputedStyle(activeCard).borderTopColor,
        borderTopWidth: getComputedStyle(activeCard).borderTopWidth,
        backgroundColor: getComputedStyle(activeCard).backgroundColor,
        cursor: getComputedStyle(activeCard).cursor
      },
      inactiveCard: {
        borderTopColor: getComputedStyle(inactiveCard).borderTopColor,
        borderTopWidth: getComputedStyle(inactiveCard).borderTopWidth,
        backgroundColor: getComputedStyle(inactiveCard).backgroundColor,
        cursor: getComputedStyle(inactiveCard).cursor
      },
      activeStage: {
        borderTopColor: getComputedStyle(activeStage).borderTopColor,
        backgroundColor: getComputedStyle(activeStage).backgroundColor
      },
      inactiveStage: {
        borderTopColor: getComputedStyle(inactiveStage).borderTopColor,
        backgroundColor: getComputedStyle(inactiveStage).backgroundColor
      }
    };
  });
  console.log('Estilos computados:', JSON.stringify(cardStyles, null, 2));

  // Captura Etapa 1
  const stage1Path = path.join(__dirname, 'panel_etapa1.png');
  await page.screenshot({ path: stage1Path, fullPage: true });
  console.log(`Guardada captura Etapa 1: ${stage1Path}`);

  // 1.2 Probar clic en TODA la superficie de la tarjeta (Full Clickable Area)
  console.log('1.2 Probando clic en cualquier parte de la tarjeta TMPL-04 (párrafo)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-04"] p');
  await new Promise(r => setTimeout(r, 250));
  const selectValAfterCardClick = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Plantilla seleccionada tras clic en cuerpo de tarjeta: ${selectValAfterCardClick}`);
  if (selectValAfterCardClick !== 'TMPL-04') throw new Error('Falló clic en superficie de tarjeta TMPL-04');

  // Clic en tarjeta TMPL-03
  console.log('1.3 Probando clic en tarjeta TMPL-03...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-03"]');
  await new Promise(r => setTimeout(r, 250));
  const selectValTmpl03 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Plantilla seleccionada tras clic en TMPL-03: ${selectValTmpl03}`);
  if (selectValTmpl03 !== 'TMPL-03') throw new Error('Falló clic en superficie de tarjeta TMPL-03');

  // 2. Probar cambio a Etapa 2
  console.log('2. Cambiando a Etapa 2 (Registro Auxiliar)...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 250));

  const selectValE2 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template seleccionado en Etapa 2: ${selectValE2}`);

  // Clic en UD3 de Asistencia
  console.log('3. Seleccionando UD3 de Asistencia (TMPL-07)...');
  await page.click('.ud-selector-pill[data-select-tmpl="TMPL-07"]');
  await new Promise(r => setTimeout(r, 250));
  const selectValUD3 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template tras clic en UD3: ${selectValUD3}`);

  // Clic en UD5 de Evaluación
  console.log('4. Seleccionando UD5 de Evaluación (TMPL-15)...');
  await page.click('.ud-selector-pill[data-select-tmpl="TMPL-15"]');
  await new Promise(r => setTimeout(r, 250));
  const selectValUD5 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template tras clic en UD5 Evaluación: ${selectValUD5}`);

  const stage2Path = path.join(__dirname, 'panel_etapa2.png');
  await page.screenshot({ path: stage2Path, fullPage: true });
  console.log(`Guardada captura Etapa 2: ${stage2Path}`);

  // 5. Cambiar a Etapa 3
  console.log('5. Cambiando a Etapa 3 (Cierre Modular y Prácticas)...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_3"]');
  await new Promise(r => setTimeout(r, 250));
  const selectValE3 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template en Etapa 3: ${selectValE3}`);

  // Probar clic en superficie de tarjeta TMPL-19 (Acta Modular)
  console.log('5.1 Probando clic en superficie de tarjeta TMPL-19 (Acta Modular)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-19"] p');
  await new Promise(r => setTimeout(r, 250));
  const selectValTmpl19 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template tras clic en superficie de TMPL-19: ${selectValTmpl19}`);
  if (selectValTmpl19 !== 'TMPL-19') throw new Error('Falló clic en tarjeta TMPL-19');

  const stage3Path = path.join(__dirname, 'panel_etapa3.png');
  await page.screenshot({ path: stage3Path, fullPage: true });
  console.log(`Guardada captura Etapa 3: ${stage3Path}`);

  // 6. Cambiar a Etapa 4
  console.log('6. Cambiando a Etapa 4 (Certificación y Egreso)...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 250));
  const selectValE4 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template en Etapa 4: ${selectValE4}`);

  // Probar clic en tarjeta TMPL-21 (Título Técnico)
  console.log('6.1 Probando clic en tarjeta TMPL-21 (Título Técnico)...');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-21"] p');
  await new Promise(r => setTimeout(r, 250));
  const selectValTmpl21 = await page.$eval('#doc-template-select', el => el.value);
  console.log(`Template tras clic en superficie de TMPL-21: ${selectValTmpl21}`);
  if (selectValTmpl21 !== 'TMPL-21') throw new Error('Falló clic en tarjeta TMPL-21');

  const stage4Path = path.join(__dirname, 'panel_etapa4.png');
  await page.screenshot({ path: stage4Path, fullPage: true });
  console.log(`Guardada captura Etapa 4: ${stage4Path}`);

  // 7. Prueba de compatibilidad hacia atrás con #doc-template-select y flujo TMPL-02
  console.log('7. Probando compatibilidad con #doc-template-select para TMPL-02...');
  await page.evaluate(() => {
    const sel = document.querySelector('#doc-template-select');
    sel.value = 'TMPL-02';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 250));

  const activeStageAfterChange = await page.evaluate(() => {
    return document.querySelector('.stage-nav-pill.active')?.getAttribute('data-stage-id');
  });
  console.log(`Etapa activa tras seleccionar TMPL-02: ${activeStageAfterChange}`);

  // Buscar matrícula
  console.log('8. Buscando matrícula en TMPL-02...');
  await page.type('#doc-context-search', 'GRP-BD');
  await page.waitForSelector('.document-context-result', { timeout: 5000 });
  const countResults = await page.$$eval('.document-context-result', els => els.length);
  console.log(`Resultados encontrados: ${countResults}`);

  // Seleccionar resultado
  console.log('9. Seleccionando estudiante y generando ficha TMPL-02...');
  await page.click('.document-context-result');
  await new Promise(r => setTimeout(r, 400));

  const canGenerate = await page.$eval('#doc-generate-btn', btn => !btn.disabled);
  console.log(`Botón Generar habilitado: ${canGenerate}`);

  await page.click('#doc-generate-btn');
  await page.waitForSelector('iframe[title="Vista previa PDF TMPL-02"]', { timeout: 15000 });
  console.log('10. ¡Iframe de Vista Previa PDF TMPL-02 generado con éxito!');

  const hasPrintBtn = await page.evaluate(() => Boolean(document.querySelector('#doc-print-pdf-btn')));
  const hasDownloadLink = await page.evaluate(() => Boolean(document.querySelector('a[download$=".pdf"]')));
  console.log(`Botón imprimir: ${hasPrintBtn}, Enlace descargar: ${hasDownloadLink}`);

  await browser.close();
  console.log('--- TEST COMPLETADO CON ÉXITO ---');
}

testUI().catch(err => {
  console.error('Error en test:', err);
  process.exit(1);
});
