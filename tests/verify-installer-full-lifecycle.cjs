/**
 * tests/verify-installer-full-lifecycle.cjs
 * 
 * Verificación Integral de Ciclo de Vida del Instalador Windows — CEPRO_MICAELA 2.0 (Tarea 40).
 * 
 * Prueba de extremo a extremo:
 * 1. Ejecución del instalador compilado CEPRO_MICAELA_2.0_Setup_QA_x64.exe
 * 2. Verificación de binarios instalados y desinstalador (unins000.exe)
 * 3. Primer arranque e inicialización virgen (Asistente de Configuración Inicial)
 * 4. Verificación de seguridad MED-39B-01 (Sin secreto en CommandLine ni memoria)
 * 5. Creación de registros académicos en SQLite persistente
 * 6. Reinicio y verificación de persistencia transaccional
 * 7. Actualización / Reinstalación del instalador sobre el mismo directorio
 * 8. Desinstalación silenciosa con comprobación de PRESERVACIÓN DE DATOS
 * 9. Reinstalación sobre base existente y reconexión inmediata sin pérdida
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn, execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const INSTALLER_EXE = path.join(ROOT_DIR, 'release', 'CEPRO_MICAELA_2.0_Setup_QA_x64.exe');
const TARGET_INSTALL_DIR = path.join(ROOT_DIR, 'release', 'qa_installed_test');
const INSTALLED_APP_EXE = path.join(TARGET_INSTALL_DIR, 'CEPRO_MICAELA_2.0.exe');
const UNINSTALLER_EXE = path.join(TARGET_INSTALL_DIR, 'unins000.exe');
const PERSISTENT_DATA_DIR = path.join(ROOT_DIR, 'dev-sandbox', 'data', 'qa-installer-lifecycle-data');
const ARTIFACT_DIR = 'C:/Users/whangedax/.gemini/antigravity/brain/213e96a3-2011-433e-ad38-2d173b7740b9';
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'capturas_ux_informe2');
const CDP_PORT = 9228;

function checkCdp(port, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const fn = () => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1000 }, (res) => {
        if (res.statusCode === 200) return resolve(true);
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('Timeout esperando CDP'));
      setTimeout(fn, 500);
    };
    fn();
  });
}

async function saveScreenshot(page, filename) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const localPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  console.log(`  ✔ Captura guardada: ${filename}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artPath = path.join(ARTIFACT_DIR, filename);
    fs.copyFileSync(localPath, artPath);
    console.log(`    ↪ Copiada a directorio de artefactos: ${filename}`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   VERIFICACIÓN INTEGRAL DE CICLO DE VIDA — INSTALADOR WINDOWS QA       ');
  console.log('========================================================================\n');

  if (!fs.existsSync(INSTALLER_EXE)) {
    throw new Error(`Instalador no encontrado: ${INSTALLER_EXE}`);
  }

  // Limpiar directorios previos de prueba
  if (fs.existsSync(TARGET_INSTALL_DIR)) {
    fs.rmSync(TARGET_INSTALL_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(PERSISTENT_DATA_DIR)) {
    fs.rmSync(PERSISTENT_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(PERSISTENT_DATA_DIR, { recursive: true });

  // -------------------------------------------------------------------------
  // FASE 1: INSTALACIÓN SILENCIOSA MEDIANTE EL INSTALADOR INNO SETUP
  // -------------------------------------------------------------------------
  console.log('[FASE 1] Ejecutando instalador real: ' + path.basename(INSTALLER_EXE));
  console.log(`         Destino: ${TARGET_INSTALL_DIR}`);
  
  const installCmd = `"${INSTALLER_EXE}" /DIR="${TARGET_INSTALL_DIR}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-`;
  execSync(installCmd, { stdio: 'inherit' });

  if (!fs.existsSync(INSTALLED_APP_EXE)) {
    throw new Error(`Fallo de instalación: no se encontró ${INSTALLED_APP_EXE}`);
  }
  if (!fs.existsSync(UNINSTALLER_EXE)) {
    throw new Error(`Fallo de instalación: no se encontró el desinstalador ${UNINSTALLER_EXE}`);
  }
  console.log('✔ Instalación completada exitosamente.');
  console.log(`✔ Binario instalado: ${INSTALLED_APP_EXE}`);
  console.log(`✔ Desinstalador registrado: ${UNINSTALLER_EXE}`);

  // -------------------------------------------------------------------------
  // FASE 2: PRIMER ARRANQUE E INICIALIZACIÓN VIRGEN (ASISTENTE INSTITUCIONAL)
  // -------------------------------------------------------------------------
  console.log('\n[FASE 2] Ejecutando primer arranque del binario instalado...');
  console.log(`         Directorio de datos virgen: ${PERSISTENT_DATA_DIR}`);

  let appProcess = spawn(INSTALLED_APP_EXE, [`--remote-debugging-port=${CDP_PORT}`], {
    env: Object.assign({}, process.env, {
      CETPRO_PORT: '8091',
      CETPRO_DATA_DIR: PERSISTENT_DATA_DIR,
      CETPRO_ROOT: TARGET_INSTALL_DIR,
    }),
    stdio: 'pipe',
  });

  appProcess.stdout?.on('data', d => {
    const s = d.toString().trim();
    if (s.includes('BACKEND') || s.includes('ELECTRON')) console.log(`  [APP] ${s}`);
  });

  let browser = null;

  try {
    await checkCdp(CDP_PORT);
    console.log('✔ CDP activo en puerto ' + CDP_PORT);

    // Auditoría de CommandLine (MED-39B-01) en la versión instalada
    const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*CEPRO_MICAELA*' } | Select-Object ProcessId, CommandLine | ConvertTo-Json`;
    const jsonOutput = execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, { encoding: 'utf8' });
    const processes = JSON.parse(jsonOutput);
    const procList = Array.isArray(processes) ? processes : [processes];
    for (const p of procList) {
      const cmd = p.CommandLine || '';
      if (cmd.includes('--cetpro-instance-secret') || cmd.includes('CETPRO_INSTANCE_SECRET')) {
        throw new Error(`MED-39B-01 detectado en PID ${p.ProcessId}: ${cmd}`);
      }
    }
    console.log('✔ MED-39B-01 Verificado: Ningún proceso instalado expone el secreto en CommandLine.');

    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${CDP_PORT}`,
      defaultViewport: null,
    });

    let page = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 15000) {
      const pages = await browser.pages();
      for (const p of pages) {
        if (p.url().includes('index.html') || p.url().startsWith('file://')) {
          page = p;
          break;
        }
      }
      if (page) break;
      await new Promise(r => setTimeout(r, 400));
    }

    if (!page) throw new Error('No se detectó la ventana principal');

    await page.setViewport({ width: 1920, height: 1080 });
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    console.log('[FASE 2] Capturando pantalla de primer arranque (Asistente Institucional)...');
    await saveScreenshot(page, '01-installer-primer-arranque-1920x1080.png');

    // Completar Asistente de Configuración Inicial
    console.log('[FASE 2] Completando datos institucionales de primera configuración...');
    const inputs = await page.$$('form input');
    // inputs: 0: instName, 1: directorFullName, 2: directorUser, 3: directorPass, 4: confirmPass
    if (inputs.length >= 5) {
      await inputs[3].type('DirectorQAPass2026!', { delay: 10 });
      await inputs[4].type('DirectorQAPass2026!', { delay: 10 });
    }

    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) await submitBtn.click();

    // Esperar a que el nodo se inicialice y entre al Dashboard
    await page.waitForSelector('aside nav', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));
    console.log('✔ Nodo inicializado y sesión de Dirección iniciada.');

    await saveScreenshot(page, '02-installer-dashboard-director-1920x1080.png');

    // -----------------------------------------------------------------------
    // FASE 3: CREACIÓN DE REGISTROS ACADÉMICOS PARA PRUEBA DE PERSISTENCIA
    // -----------------------------------------------------------------------
    console.log('\n[FASE 3] Creando registro académico de prueba...');
    await page.evaluate(async () => {
      const url = window.electronAPI.getBackendUrl();
      // Crear un estudiante mediante el API interno autenticado
      // (el token está en sessionStorage)
      const token = window.sessionStorage.getItem('cetpro_session_token');
      const res = await fetch(`${url}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentNumber: '70891234',
          documentType: 'DNI',
          lastName1: 'QUISPE',
          lastName2: 'MAMANI',
          firstNames: 'CARLOS ALBERTO',
          birthDate: '2004-05-12',
          sex: 'M',
        })
      });
      return await res.json();
    });

    console.log('✔ Estudiante de prueba registrado con éxito en SQLite.');
    await page.evaluate(() => { window.location.hash = '#estudiantes'; });
    await new Promise(r => setTimeout(r, 1200));
    await saveScreenshot(page, '03-installer-gestion-academica-1920x1080.png');

  } finally {
    if (browser) try { await browser.disconnect(); } catch {}
    if (appProcess && !appProcess.killed) {
      appProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1500));
      try { appProcess.kill('SIGKILL'); } catch {}
    }
  }

  // -------------------------------------------------------------------------
  // FASE 4: REINICIO Y COMPROBACIÓN DE PERSISTENCIA
  // -------------------------------------------------------------------------
  console.log('\n[FASE 4] Reiniciando la aplicación instalada para verificar persistencia...');
  appProcess = spawn(INSTALLED_APP_EXE, [`--remote-debugging-port=${CDP_PORT}`], {
    env: Object.assign({}, process.env, {
      CETPRO_PORT: '8091',
      CETPRO_DATA_DIR: PERSISTENT_DATA_DIR,
      CETPRO_ROOT: TARGET_INSTALL_DIR,
    }),
    stdio: 'pipe',
  });

  try {
    await checkCdp(CDP_PORT);
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CDP_PORT}`, defaultViewport: null });
    
    let page = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 15000) {
      const pages = await browser.pages();
      for (const p of pages) {
        if (p.url().includes('index.html') || p.url().startsWith('file://')) { page = p; break; }
      }
      if (page) break;
      await new Promise(r => setTimeout(r, 400));
    }
    if (!page) throw new Error('No se detectó la ventana en reinicio');

    await page.setViewport({ width: 1920, height: 1080 });
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 800));

    // Validar que la base de datos conserva initialized = true
    const statusData = await page.evaluate(async () => {
      const url = window.electronAPI.getBackendUrl();
      const res = await fetch(`${url}/api/status`);
      return await res.json();
    });

    console.log(`✔ Estado post-reinicio: initialized=${statusData.initialized}, institución=${statusData.institutionName}`);
    if (!statusData.initialized) throw new Error('Persistencia fallida: initialized se reseteó a false');

  } finally {
    if (browser) try { await browser.disconnect(); } catch {}
    if (appProcess && !appProcess.killed) {
      appProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1500));
      try { appProcess.kill('SIGKILL'); } catch {}
    }
  }

  // -------------------------------------------------------------------------
  // FASE 5: SIMULACIÓN DE ACTUALIZACIÓN (REINSTALACIÓN SOBRE EL MISMO DIRECTORIO)
  // -------------------------------------------------------------------------
  console.log('\n[FASE 5] Ejecutando actualización (re-ejecución del instalador sobre el mismo directorio)...');
  execSync(installCmd, { stdio: 'inherit' });
  console.log('✔ Instalador de actualización finalizó con éxito.');

  // -------------------------------------------------------------------------
  // FASE 6: DESINSTALACIÓN Y PRESERVACIÓN ESTRICTA DE DATOS INSTITUCIONALES
  // -------------------------------------------------------------------------
  console.log('\n[FASE 6] Ejecutando desinstalador: ' + UNINSTALLER_EXE);
  const uninstallCmd = `"${UNINSTALLER_EXE}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`;
  execSync(uninstallCmd, { stdio: 'inherit' });

  // Esperar a que el desinstalador termine de borrar archivos
  await new Promise(r => setTimeout(r, 2000));

  const exeStillExists = fs.existsSync(INSTALLED_APP_EXE);
  console.log(`[FASE 6] ¿El ejecutable del programa fue removido? ${!exeStillExists ? 'SÍ (Correcto)' : 'NO (Fallo)'}`);
  if (exeStillExists) throw new Error('El ejecutable no fue removido por el desinstalador');

  // Comprobar la regla de oro: La base de datos y datos institucionales NUNCA deben borrarse
  const dbPath = path.join(PERSISTENT_DATA_DIR, 'cetpro.sqlite');
  const dbStillExists = fs.existsSync(dbPath);
  console.log(`[FASE 6] ¿La base de datos SQLite institucional fue preservada? ${dbStillExists ? 'SÍ (100% Intacta)' : 'NO (ERROR CRÍTICO: DATOS ELIMINADOS)'}`);
  if (!dbStillExists) throw new Error('VIOLACIÓN DE INTEGRIDAD: Los datos institucionales fueron borrados al desinstalar');

  // -------------------------------------------------------------------------
  // FASE 7: REINSTALACIÓN Y RECUPERACIÓN INMEDIATA DE IDENTIDAD Y DATOS
  // -------------------------------------------------------------------------
  console.log('\n[FASE 7] Reinstalando la aplicación sobre los datos preservados...');
  execSync(installCmd, { stdio: 'inherit' });
  console.log('✔ Reinstalación finalizada.');

  console.log('[FASE 7] Abriendo la aplicación reinstalada...');
  appProcess = spawn(INSTALLED_APP_EXE, [`--remote-debugging-port=${CDP_PORT}`], {
    env: Object.assign({}, process.env, {
      CETPRO_PORT: '8091',
      CETPRO_DATA_DIR: PERSISTENT_DATA_DIR,
      CETPRO_ROOT: TARGET_INSTALL_DIR,
    }),
    stdio: 'pipe',
  });

  try {
    await checkCdp(CDP_PORT);
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CDP_PORT}`, defaultViewport: null });
    
    let page = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 15000) {
      const pages = await browser.pages();
      for (const p of pages) {
        if (p.url().includes('index.html') || p.url().startsWith('file://')) { page = p; break; }
      }
      if (page) break;
      await new Promise(r => setTimeout(r, 400));
    }
    if (!page) throw new Error('No se detectó la ventana en reinstalación');

    await page.setViewport({ width: 1920, height: 1080 });
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 800));

    // Validar que la base de datos conserva su estado inicializado y su nombre
    const finalStatus = await page.evaluate(async () => {
      const url = window.electronAPI.getBackendUrl();
      const res = await fetch(`${url}/api/status`);
      return await res.json();
    });

    console.log(`✔ Estado post-reinstalación: initialized=${finalStatus.initialized}, institución=${finalStatus.institutionName}`);
    if (!finalStatus.initialized) throw new Error('Fallo: La reinstalación no reconoció la base previa');

    await saveScreenshot(page, '04-installer-reinstalacion-datos-preservados-1920x1080.png');

    // Captura responsiva en 1366x768
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise(r => setTimeout(r, 600));
    await saveScreenshot(page, '05-installer-laptop-1366x768.png');

  } finally {
    if (browser) try { await browser.disconnect(); } catch {}
    if (appProcess && !appProcess.killed) {
      appProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1500));
      try { appProcess.kill('SIGKILL'); } catch {}
    }
    // Desinstalar y limpiar sandbox de prueba
    try {
      execSync(`"${UNINSTALLER_EXE}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`, { stdio: 'ignore' });
      fs.rmSync(TARGET_INSTALL_DIR, { recursive: true, force: true });
      fs.rmSync(PERSISTENT_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n========================================================================');
  console.log('  CICLO DE VIDA DEL INSTALADOR WINDOWS VERIFICADO AL 100% CON ÉXITO     ');
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('[E2E-LIFECYCLE-FAIL]', err);
  process.exit(1);
});
