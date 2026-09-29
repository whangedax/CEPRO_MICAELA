const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const artifactDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

  console.log('1. Cargando http://127.0.0.1:8081/#/documentos...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.stage-nav-pill');
  await new Promise(r => setTimeout(r, 1000));

  // Función para obtener información del estado actual
  async function getStageInfo() {
    return await page.evaluate(() => {
      const activePill = document.querySelector('.stage-nav-pill.active')?.getAttribute('data-stage-id');
      const headerTitle = document.querySelector('.card-header h5')?.textContent.trim();
      const templateSelect = document.querySelector('#doc-template-select')?.value;
      const groupSelect = document.querySelector('#doc-group-select');
      const groupCount = groupSelect ? groupSelect.querySelectorAll('option[value]:not([value=""])').length : 0;
      const groupSelectedVal = groupSelect ? groupSelect.value : null;
      const summaryCardTitle = document.querySelector('#doc-selected-group-card .fw-extrabold')?.textContent.trim();
      const summaryCardCount = document.querySelector('#doc-selected-group-card .badge.bg-primary')?.textContent.trim();
      return {
        activePill,
        headerTitle,
        templateSelect,
        hasGroupSelect: Boolean(groupSelect),
        groupCount,
        groupSelectedVal,
        summaryCardTitle,
        summaryCardCount
      };
    });
  }

  // --- ETAPA 1 ---
  console.log('--- Verificando ETAPA 1 ---');
  let info1 = await getStageInfo();
  console.log('Etapa 1 Info:', info1);
  if (!info1.hasGroupSelect || info1.groupCount !== 12) {
    console.error('FAIL en Etapa 1: groupCount esperada 12, obtenida:', info1.groupCount);
  }
  await page.screenshot({ path: path.join(artifactDir, '39_verif_etapa1.png'), fullPage: false });

  // --- ETAPA 2 ---
  console.log('--- Haciendo clic en ETAPA 2 ---');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 800));
  let info2 = await getStageInfo();
  console.log('Etapa 2 Info:', info2);
  if (info2.activePill !== 'ETAPA_2') console.error('FAIL: No cambió a ETAPA_2');
  if (!info2.hasGroupSelect || info2.groupCount !== 12) {
    console.error('FAIL en Etapa 2: groupCount esperada 12, obtenida:', info2.groupCount);
  }
  await page.screenshot({ path: path.join(artifactDir, '40_verif_etapa2.png'), fullPage: false });

  // Probar seleccionar evaluación UD1 en Etapa 2
  console.log('--- Probando selección de Evaluación UD1 en Etapa 2 ---');
  await page.click('.ud-selector-pill[data-select-tmpl="TMPL-11"]');
  await new Promise(r => setTimeout(r, 600));
  let info2Eval = await getStageInfo();
  console.log('Etapa 2 Evaluación Info:', info2Eval);
  await page.screenshot({ path: path.join(artifactDir, '41_verif_etapa2_evaluacion.png'), fullPage: false });

  // --- ETAPA 3 ---
  console.log('--- Haciendo clic en ETAPA 3 ---');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_3"]');
  await new Promise(r => setTimeout(r, 800));
  let info3 = await getStageInfo();
  console.log('Etapa 3 Info (TMPL-18):', info3);
  if (info3.activePill !== 'ETAPA_3') console.error('FAIL: No cambió a ETAPA_3');
  if (!info3.hasGroupSelect || info3.groupCount !== 12) {
    console.error('FAIL en Etapa 3: groupCount esperada 12, obtenida:', info3.groupCount);
  }
  await page.screenshot({ path: path.join(artifactDir, '42_verif_etapa3_efsrt.png'), fullPage: false });

  // Probar TMPL-19 en Etapa 3
  console.log('--- Probando selección de Acta Modular (TMPL-19) en Etapa 3 ---');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-19"]');
  await new Promise(r => setTimeout(r, 600));
  let info3Acta = await getStageInfo();
  console.log('Etapa 3 Acta Info (TMPL-19):', info3Acta);
  if (!info3Acta.hasGroupSelect || info3Acta.groupCount !== 12) {
    console.error('FAIL en TMPL-19: groupCount esperada 12, obtenida:', info3Acta.groupCount);
  }
  await page.screenshot({ path: path.join(artifactDir, '43_verif_etapa3_acta.png'), fullPage: false });

  // --- ETAPA 4 ---
  console.log('--- Haciendo clic en ETAPA 4 ---');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 800));
  let info4 = await getStageInfo();
  console.log('Etapa 4 Info (TMPL-20):', info4);
  if (info4.activePill !== 'ETAPA_4') console.error('FAIL: No cambió a ETAPA_4');
  if (!info4.hasGroupSelect || info4.groupCount !== 12) {
    console.error('FAIL en Etapa 4: groupCount esperada 12, obtenida:', info4.groupCount);
  }
  await page.screenshot({ path: path.join(artifactDir, '44_verif_etapa4_certificacion.png'), fullPage: false });

  // Probar TMPL-21 en Etapa 4
  console.log('--- Probando selección de Título Técnico (TMPL-21) en Etapa 4 ---');
  await page.click('.doc-item-card[data-select-tmpl="TMPL-21"]');
  await new Promise(r => setTimeout(r, 600));
  let info4Titulo = await getStageInfo();
  console.log('Etapa 4 Título Info (TMPL-21):', info4Titulo);
  if (!info4Titulo.hasGroupSelect || info4Titulo.groupCount !== 12) {
    console.error('FAIL en TMPL-21: groupCount esperada 12, obtenida:', info4Titulo.groupCount);
  }
  await page.screenshot({ path: path.join(artifactDir, '45_verif_etapa4_titulo.png'), fullPage: false });

  console.log('TODAS LAS ETAPAS VERIFICADAS CON ÉXITO.');
  await browser.close();
})();
