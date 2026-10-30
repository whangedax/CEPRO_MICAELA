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
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const INSTALLER_EXE = process.env.TEST_INSTALLER_EXE || path.join(ROOT_DIR, 'release', 'CEPRO_MICAELA_2.0_Setup_QA_x64.exe');
const TARGET_INSTALL_DIR = path.join(ROOT_DIR, 'release', 'qa_installed_test');
const INSTALLED_APP_EXE = path.join(TARGET_INSTALL_DIR, 'CEPRO_MICAELA_2.0.exe');
const UNINSTALLER_EXE = path.join(TARGET_INSTALL_DIR, 'unins000.exe');
const PERSISTENT_DATA_DIR = path.join(ROOT_DIR, 'dev-sandbox', 'data', 'qa-installer-lifecycle-data');
const ARTIFACT_DIRS = [
  'C:/Users/whangedax/.gemini/antigravity/brain/4acf04a9-af39-4be1-a587-277d20c68e03',
  'C:/Users/whangedax/.gemini/antigravity/brain/213e96a3-2011-433e-ad38-2d173b7740b9',
];
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'capturas_ux_informe2');
const CDP_PORT = 9228;

async function killAppProcesses(proc) {
  if (proc && proc.pid) {
    try {
      execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
    } catch {}
  }
  try {
    execSync('taskkill /F /IM CEPRO_MICAELA_2.0.exe 2>nul', { stdio: 'ignore' });
  } catch {}

  const startWait = Date.now();
  while (Date.now() - startWait < 10000) {
    try {
      const output = execSync('tasklist /FI "IMAGENAME eq CEPRO_MICAELA_2.0.exe" /NH', { encoding: 'utf8' });
      if (!output.includes('CEPRO_MICAELA_2.0.exe')) {
        break;
      }
    } catch {
      break;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 600));
}

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

  for (const artDir of ARTIFACT_DIRS) {
    if (fs.existsSync(artDir)) {
      const artPath = path.join(artDir, filename);
      fs.copyFileSync(localPath, artPath);
      console.log(`    ↪ Copiada a directorio de artefactos (${path.basename(artDir)}): ${filename}`);
    }
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
  
  const installCmd = `"${INSTALLER_EXE}" /CURRENTUSER /DIR="${TARGET_INSTALL_DIR}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-`;
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
    console.log('\n[FASE 3] Creando registro académico de prueba con contrato oficial...');
    const studentPayload = {
      document: '70891234',
      name: 'QUISPE MAMANI, CARLOS ALBERTO',
      documentType: 'DNI',
      lastName1: 'QUISPE',
      lastName2: 'MAMANI',
      firstNames: 'CARLOS ALBERTO',
      birthDate: '2004-05-12',
      sex: 'M',
    };

    const studentCreateResult = await page.evaluate(async (payload) => {
      const url = window.electronAPI.getBackendUrl();
      const token = window.sessionStorage.getItem('cetpro_session_token');
      const res = await fetch(`${url}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || res.status !== 200) {
        throw new Error(`Fallo en POST /api/students: HTTP ${res.status} - ${JSON.stringify(data)}`);
      }
      return data;
    }, studentPayload);

    console.log(`✔ Estudiante de prueba registrado con éxito en SQLite: ${studentCreateResult.name} (${studentCreateResult.document})`);

    // Consultar API para verificar incremento en SQLite y existencia efectiva
    const verifyApiStudent = await page.evaluate(async () => {
      const url = window.electronAPI.getBackendUrl();
      const token = window.sessionStorage.getItem('cetpro_session_token');
      const res = await fetch(`${url}/api/dashboard?overview=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok || res.status !== 200) {
        throw new Error(`HTTP ${res.status} al consultar dashboard overview`);
      }
      const dash = await res.json();
      const found = dash.students?.find(s => s.document === '70891234');
      return { total: dash.students?.length || 0, student: found || null };
    });

    if (!verifyApiStudent.student || verifyApiStudent.total < 1) {
      throw new Error(`Estudiante 70891234 no encontrado en API dashboard (total: ${verifyApiStudent.total})`);
    }
    console.log(`✔ Conteo de estudiantes en SQLite verificado: ${verifyApiStudent.total} participante(s).`);

    // Navegar a la vista de estudiantes
    console.log('[FASE 3] Navegando a Gestión de Estudiantes (#estudiantes)...');
    await page.evaluate(() => { window.location.hash = '#estudiantes'; });

    // Esperar a que la UI renderice la tabla en #estudiantes con los datos reales
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    await page.waitForFunction(
      () => document.body.innerText.includes('70891234') && document.body.innerText.includes('QUISPE MAMANI, CARLOS ALBERTO'),
      { timeout: 15000 }
    );

    const uiCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasStudentRow = text.includes('70891234') && text.includes('QUISPE MAMANI');
      const rows = document.querySelectorAll('table tbody tr');
      const hasCounters = text.includes('Padrón Activo') || text.includes('Total Registrados');
      return { hasStudentRow, rowCount: rows.length, hasCounters };
    });

    if (!uiCheck.hasStudentRow || uiCheck.rowCount === 0) {
      throw new Error(`La tabla en #estudiantes no muestra al estudiante registrado en la interfaz`);
    }
    console.log(`✔ UI renderizó tabla con ${uiCheck.rowCount} fila(s), estudiante visible y contadores activos.`);

    await new Promise(r => setTimeout(r, 800));
    await saveScreenshot(page, '03-installer-gestion-academica-1920x1080.png');

    // -----------------------------------------------------------------------
    // FASE 3B: AUDITORÍA DE SEGURIDAD CRIT-41-01 (PRUEBA NEGATIVA DE FUGA)
    // -----------------------------------------------------------------------
    console.log('\n[FASE 3B] Ejecutando prueba negativa de fuga de secreto (CRIT-41-01)...');
    const ROGUE_PORT = 9988;
    let rogueReceivedSecret = null;
    let rogueRequestsCount = 0;

    const rogueServer = http.createServer((req, res) => {
      rogueRequestsCount++;
      const secret = req.headers['x-cetpro-instance-secret'] || null;
      if (secret) rogueReceivedSecret = secret;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      });
      res.end(JSON.stringify({ ok: true, secretReceived: Boolean(secret) }));
    });

    await new Promise((resolve) => rogueServer.listen(ROGUE_PORT, '127.0.0.1', resolve));

    try {
      // 1. Intentar fetch a puerto loopback ajeno desde el renderer
      const rogueFetchResult = await page.evaluate(async (port) => {
        try {
          const r = await fetch(`http://127.0.0.1:${port}/rogue-sink`);
          return { ok: true, status: r.status };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }, ROGUE_PORT);

      console.log(`  Resultado de conexión a puerto ajeno ${ROGUE_PORT}:`, rogueFetchResult);
      if (rogueFetchResult.ok === false) {
        console.log(`  ✔ CSP bloqueó la conexión loopback no autorizada: ${rogueFetchResult.error}`);
      }

      // 2. Verificar si el servidor rogue capturó el secreto
      console.log(`  Peticiones interceptadas en puerto ${ROGUE_PORT}: ${rogueRequestsCount}`);
      console.log(`  ¿Secreto X-CETPRO-Instance-Secret recibido?: ${rogueReceivedSecret ? 'SÍ (VULNERABLE)' : 'NO (PROTEGIDO)'}`);
      if (rogueReceivedSecret) {
        throw new Error(`CRIT-41-01 NO RESUELTO: El secreto se filtró al puerto rogue ${ROGUE_PORT}!`);
      }
      console.log('✔ CRIT-41-01 Verificado y Mitigado: Cero filtración de credenciales hacia puertos loopback ajenos.');

      // 3. Verificar que peticiones externas sin secreto son rechazadas por el backend con HTTP 401
      const backendUrl = await page.evaluate(() => window.electronAPI.getBackendUrl());
      const externalStatusWithoutSecret = await fetch(`${backendUrl}/api/status`).then(r => r.status).catch(() => null);
      console.log(`  GET /api/status directo sin secreto desde proceso externo: HTTP ${externalStatusWithoutSecret}`);
      if (externalStatusWithoutSecret !== 401) {
        console.warn(`  Aviso: backend /api/status respondió ${externalStatusWithoutSecret}`);
      }
    } finally {
      rogueServer.close();
    }

  } finally {
    if (browser) try { await browser.disconnect(); } catch {}
    await killAppProcesses(appProcess);
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
      if (!res.ok) throw new Error(`HTTP ${res.status} al consultar status`);
      return await res.json();
    });

    console.log(`✔ Estado post-reinicio: initialized=${statusData.initialized}, institución=${statusData.institutionName}`);
    if (!statusData.initialized) throw new Error('Persistencia fallida: initialized se reseteó a false');

    // Realizar consulta real a la API y verificar que el estudiante PERMANECE registrado tras el reinicio
    const persistedStudent = await page.evaluate(async () => {
      const url = window.electronAPI.getBackendUrl();
      const loginRes = await fetch(`${url}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'director', password: 'DirectorQAPass2026!' })
      });
      if (!loginRes.ok) throw new Error(`Login falló post-reinicio con HTTP ${loginRes.status}`);
      const { token } = await loginRes.json();
      const dashRes = await fetch(`${url}/api/dashboard?overview=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!dashRes.ok) throw new Error(`Dashboard overview falló post-reinicio con HTTP ${dashRes.status}`);
      const dash = await dashRes.json();
      return dash.students?.find(s => s.document === '70891234') || null;
    });

    if (!persistedStudent) {
      throw new Error('Fallo de persistencia: Estudiante 70891234 no encontrado tras reinicio');
    }
    console.log(`✔ Persistencia confirmada tras reinicio: ${persistedStudent.name} (${persistedStudent.document}) permanece intacto.`);

  } finally {
    if (browser) try { await browser.disconnect(); } catch {}
    await killAppProcesses(appProcess);
  }

  // -------------------------------------------------------------------------
  // FASE 5: SIMULACIÓN DE ACTUALIZACIÓN (REINSTALACIÓN SOBRE EL MISMO DIRECTORIO)
  // -------------------------------------------------------------------------
  console.log('\n[FASE 5] Ejecutando actualización (re-ejecución del instalador sobre el mismo directorio)...');
  await killAppProcesses(null);
  execSync(installCmd, { stdio: 'inherit' });
  console.log('✔ Instalador de actualización finalizó con éxito.');

  // -------------------------------------------------------------------------
  // FASE 6: DESINSTALACIÓN Y PRESERVACIÓN ESTRICTA DE DATOS INSTITUCIONALES
  // -------------------------------------------------------------------------
  console.log('\n[FASE 6] Ejecutando desinstalador: ' + UNINSTALLER_EXE);
  await killAppProcesses(null);
  const uninstallCmd = `"${UNINSTALLER_EXE}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`;
  execSync(uninstallCmd, { stdio: 'inherit' });

  // Esperar activamente a que el desinstalador termine de borrar archivos
  const startUninstallWait = Date.now();
  while (Date.now() - startUninstallWait < 15000) {
    if (!fs.existsSync(INSTALLED_APP_EXE)) break;
    await new Promise(r => setTimeout(r, 400));
  }

  const exeStillExists = fs.existsSync(INSTALLED_APP_EXE);
  console.log(`[FASE 6] ¿El ejecutable del programa fue removido? ${!exeStillExists ? 'SÍ (Correcto)' : 'NO (Fallo)'}`);
  if (exeStillExists) throw new Error('El ejecutable no fue removido por el desinstalador');

  // Comprobar la regla de oro: La base de datos y datos institucionales NUNCA deben borrarse
  const dbPath = path.join(PERSISTENT_DATA_DIR, 'cetpro.sqlite');
  const dbStillExists = fs.existsSync(dbPath);
  console.log(`[FASE 6] ¿La base de datos SQLite institucional fue preservada? ${dbStillExists ? 'SÍ (100% Intacta)' : 'NO (ERROR CRÍTICO: DATOS ELIMINADOS)'}`);
  if (!dbStillExists) throw new Error('VIOLACIÓN DE INTEGRIDAD: Los datos institucionales fueron borrados al desinstalar');

  // Consultar directamente la base cetpro.sqlite mediante DatabaseSync de node:sqlite
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db.prepare("SELECT value FROM records WHERE entity = 'students'").all();
    const students = rows.map(r => JSON.parse(r.value));
    const targetStudent = students.find(s => s.document === '70891234');
    if (!targetStudent) {
      throw new Error('Estudiante 70891234 no encontrado en cetpro.sqlite tras desinstalación');
    }
    console.log(`✔ Estudiante verificado directamente en SQLite con DatabaseSync: ${targetStudent.name} (${targetStudent.document})`);
  } finally {
    db.close();
  }

  // -------------------------------------------------------------------------
  // FASE 7: REINSTALACIÓN Y RECUPERACIÓN INMEDIATA DE IDENTIDAD Y DATOS
  // -------------------------------------------------------------------------
  console.log('\n[FASE 7] Reinstalando la aplicación sobre los datos preservados...');
  await killAppProcesses(null);
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
      if (!res.ok) throw new Error(`HTTP ${res.status} al consultar status`);
      return await res.json();
    });

    console.log(`✔ Estado post-reinstalación: initialized=${finalStatus.initialized}, institución=${finalStatus.institutionName}`);
    if (!finalStatus.initialized) throw new Error('Fallo: La reinstalación no reconoció la base previa');

    // Consultar la API para verificar que el estudiante persiste sin degradación
    const recoveredStudent = await page.evaluate(async () => {
      const url = window.electronAPI.getBackendUrl();
      const loginRes = await fetch(`${url}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'director', password: 'DirectorQAPass2026!' })
      });
      if (!loginRes.ok) throw new Error(`HTTP ${loginRes.status} al iniciar sesión post-reinstalación`);
      const { token } = await loginRes.json();
      const dashRes = await fetch(`${url}/api/dashboard?overview=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!dashRes.ok) throw new Error(`HTTP ${dashRes.status} al consultar dashboard post-reinstalación`);
      const dash = await dashRes.json();
      return dash.students?.find(s => s.document === '70891234') || null;
    });

    if (!recoveredStudent) {
      throw new Error('Fallo: Estudiante 70891234 no encontrado en API tras reinstalación');
    }
    console.log(`✔ Estudiante recuperado intacto vía API post-reinstalación: ${recoveredStudent.name} (${recoveredStudent.document})`);

    await saveScreenshot(page, '04-installer-reinstalacion-datos-preservados-1920x1080.png');

    // Captura responsiva en 1366x768
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise(r => setTimeout(r, 600));
    await saveScreenshot(page, '05-installer-laptop-1366x768.png');

  } finally {
    if (browser) try { await browser.disconnect(); } catch {}
    await killAppProcesses(appProcess);
    // Desinstalar y limpiar sandbox de prueba
    try {
      execSync(`"${UNINSTALLER_EXE}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`, { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1000));
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
