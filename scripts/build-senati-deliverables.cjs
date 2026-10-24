const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_DIR = path.resolve('C:/CETPRO/CETPRO_MODERNIZACION_V2');
const OUTPUT_DIR = path.join(BASE_DIR, 'informes_senati');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function imgToBase64(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(BASE_DIR, relPath);
  if (!fs.existsSync(fullPath)) return '';
  const ext = path.extname(fullPath).replace('.', '');
  const data = fs.readFileSync(fullPath).toString('base64');
  return `data:image/${ext};base64,${data}`;
}

const imgP1 = imgToBase64('capturas_ux_informe2/01-respaldo-con-exportar-cifrado-1920x1080.png');
const imgP2 = imgToBase64('capturas_ux_informe2/03-inspeccion-cifrado-desbloqueo-1920x1080.png');
const imgP3 = imgToBase64('capturas_ux_informe2/sincronizacion-general-1920x1080.png');
const imgP4 = imgToBase64('capturas_ux_informe2/conflicto-409-resolucion-1920x1080.png');
const imgP5 = imgToBase64('capturas_tarea41_installer/01-installer-primer-arranque-1920x1080.png');
const imgP6 = imgToBase64('capturas_tarea41_installer/06-installer-reinstalacion-preservada-1920x1080.png');
const imgPN = imgToBase64('capturas_tarea41_installer/02-installer-dashboard-director-1920x1080.png');

console.log('Cargando plantilla HTML con Diagrama Arquitectónico Detallado...');

// Detailed architectural diagram SVG
const detailedDiagramSvg = `
<svg width="610" height="510" viewBox="0 0 610 510" style="max-width: 100%; height: auto; font-family: Arial, sans-serif; display: block; margin: 0 auto;">
  <!-- Fondo y Borde Contenedor -->
  <rect x="2" y="2" width="606" height="506" rx="8" fill="#ffffff" stroke="#002b66" stroke-width="2"/>
  
  <!-- Título Superior del Diagrama -->
  <rect x="2" y="2" width="606" height="28" rx="8" fill="#002b66"/>
  <rect x="2" y="16" width="606" height="14" fill="#002b66"/>
  <text x="305" y="20" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">
    PLAN GENERAL Y SECUENCIA LÓGICA DE EJECUCIÓN - SISTEMA CEPRO MICAELA 2.0
  </text>

  <!-- ================= FASE 1: RESPALDO CRIPTOGRÁFICO Y PREFLIGHT (PASOS 1 Y 2) ================= -->
  <rect x="14" y="38" width="582" height="102" rx="6" fill="#f4f8fc" stroke="#0050b3" stroke-width="1.5"/>
  <rect x="14" y="38" width="165" height="18" rx="4" fill="#0050b3"/>
  <text x="96" y="51" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">FASE 1: RESPALDO & PREFLIGHT</text>
  
  <!-- Caja Paso 1 -->
  <rect x="24" y="62" width="225" height="68" rx="5" fill="#ffffff" stroke="#b0c0d0" stroke-width="1"/>
  <text x="136" y="76" font-size="9.5" font-weight="bold" fill="#002b66" text-anchor="middle">Paso 1: Exportación y Hash SHA-256</text>
  <text x="136" y="90" font-size="8" fill="#333" text-anchor="middle">• Serialización atómica (Schema V2 / 18 stores)</text>
  <text x="136" y="103" font-size="8" fill="#333" text-anchor="middle">• Hashing unidireccional (Firma digital 64 hex)</text>
  <text x="136" y="116" font-size="8" fill="#0d5229" font-weight="bold" text-anchor="middle">Paquete JSON inmutable cifrado con clave</text>

  <!-- Flecha 1 a 2 -->
  <line x1="249" y1="96" x2="284" y2="96" stroke="#002b66" stroke-width="1.8"/>
  <polygon points="284,93 291,96 284,99" fill="#002b66"/>
  <text x="267" y="90" font-size="7.5" fill="#555" text-anchor="middle">Archivo .json</text>

  <!-- Caja Paso 2 -->
  <rect x="291" y="62" width="295" height="68" rx="5" fill="#ffffff" stroke="#b0c0d0" stroke-width="1"/>
  <text x="438" y="76" font-size="9.5" font-weight="bold" fill="#002b66" text-anchor="middle">Paso 2: Barrera Preflight & Desbloqueo Seguro</text>
  <text x="438" y="90" font-size="8" fill="#333" text-anchor="middle">• Carga preliminar en memoria volátil sin tocar disco</text>
  <text x="438" y="103" font-size="8" fill="#333" text-anchor="middle">• Recálculo y validación cruzada: [Hash real == Hash paquete]</text>
  <text x="438" y="116" font-size="8" fill="#a8071a" font-weight="bold" text-anchor="middle">Si el archivo fue manipulado, se aborta y alerta en UI</text>

  <!-- Flecha Fase 1 a Fase 2 -->
  <line x1="305" y1="140" x2="305" y2="152" stroke="#002b66" stroke-width="1.8"/>
  <polygon points="302,152 305,158 308,152" fill="#002b66"/>

  <!-- ================= FASE 2: SINCRONIZACIÓN P2P Y CONFLICTOS 409 (PASOS 3 Y 4) ================= -->
  <rect x="14" y="156" width="582" height="106" rx="6" fill="#fdfaf3" stroke="#d48806" stroke-width="1.5"/>
  <rect x="14" y="156" width="180" height="18" rx="4" fill="#d48806"/>
  <text x="104" y="169" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">FASE 2: SINCRONIZACIÓN & CONCURRENCIA</text>

  <!-- Caja Paso 3 -->
  <rect x="24" y="180" width="245" height="72" rx="5" fill="#ffffff" stroke="#d48806" stroke-width="1"/>
  <text x="146" y="195" font-size="9.5" font-weight="bold" fill="#ad6800" text-anchor="middle">Paso 3: Sincronización P2P Descentralizada</text>
  <text x="146" y="209" font-size="8" fill="#333" text-anchor="middle">• Exportación de deltas diferenciales (Notas / Asistencia)</text>
  <text x="146" y="222" font-size="8" fill="#333" text-anchor="middle">• Transferencia offline entre laptops docentes y secretaría</text>
  <text x="146" y="235" font-size="8" fill="#0050b3" font-weight="bold" text-anchor="middle">Filtros de titularidad pedagógica por aula y UD</text>

  <!-- Flecha Paso 3 a Paso 4 -->
  <line x1="269" y1="216" x2="304" y2="216" stroke="#ad6800" stroke-width="1.8"/>
  <polygon points="304,213 311,216 304,219" fill="#ad6800"/>
  <text x="286" y="210" font-size="7.5" fill="#777" text-anchor="middle">Paquete P2P</text>

  <!-- Caja Paso 4 -->
  <rect x="311" y="180" width="275" height="72" rx="5" fill="#ffffff" stroke="#d48806" stroke-width="1"/>
  <text x="448" y="195" font-size="9.5" font-weight="bold" fill="#ad6800" text-anchor="middle">Paso 4: Resolución de Conflictos HTTP 409</text>
  <text x="448" y="209" font-size="8" fill="#333" text-anchor="middle">• Comparación de marcas de tiempo e historial de edición</text>
  <text x="448" y="222" font-size="8" fill="#333" text-anchor="middle">• Modal comparativo lado a lado con resaltado de campos</text>
  <text x="448" y="235" font-size="8" fill="#1b7a43" font-weight="bold" text-anchor="middle">Decisión granular: [Mantener Local / Aceptar Entrante]</text>

  <!-- Flecha Fase 2 a Fase 3 -->
  <line x1="305" y1="262" x2="305" y2="274" stroke="#002b66" stroke-width="1.8"/>
  <polygon points="302,274 305,280 308,274" fill="#002b66"/>

  <!-- ================= FASE 3: EMPAQUETADO DESKTOP Y PRESERVACIÓN (PASOS 5 Y 6) ================= -->
  <rect x="14" y="278" width="582" height="106" rx="6" fill="#fdf4f4" stroke="#cf1322" stroke-width="1.5"/>
  <rect x="14" y="278" width="180" height="18" rx="4" fill="#cf1322"/>
  <text x="104" y="291" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">FASE 3: INSTALADOR & PRESERVACIÓN</text>

  <!-- Caja Paso 5 -->
  <rect x="24" y="302" width="255" height="72" rx="5" fill="#ffffff" stroke="#cf1322" stroke-width="1"/>
  <text x="151" y="317" font-size="9.5" font-weight="bold" fill="#a8071a" text-anchor="middle">Paso 5: Instalador Windows Inno Setup</text>
  <text x="151" y="331" font-size="8" fill="#333" text-anchor="middle">• Empaquetado Electron x64 nativo silencioso</text>
  <text x="151" y="344" font-size="8" fill="#333" text-anchor="middle">• Aislamiento de base: %APPDATA%/cepro-micaela-2.0</text>
  <text x="151" y="357" font-size="8" fill="#002b66" font-weight="bold" text-anchor="middle">Directiva uninsneveruninstall activada</text>

  <!-- Flecha Paso 5 a Paso 6 -->
  <line x1="279" y1="338" x2="314" y2="338" stroke="#a8071a" stroke-width="1.8"/>
  <polygon points="314,335 321,338 314,341" fill="#a8071a"/>
  <text x="296" y="332" font-size="7.5" fill="#777" text-anchor="middle">Build .exe</text>

  <!-- Caja Paso 6 -->
  <rect x="321" y="302" width="265" height="72" rx="5" fill="#ffffff" stroke="#cf1322" stroke-width="1"/>
  <text x="453" y="317" font-size="9.5" font-weight="bold" fill="#a8071a" text-anchor="middle">Paso 6: Preservación Total en Reinstalación</text>
  <text x="453" y="331" font-size="8" fill="#333" text-anchor="middle">• Carga de 295 matrículas y simulación de actualización</text>
  <text x="453" y="344" font-size="8" fill="#333" text-anchor="middle">• Verificación con test de ciclo de vida completo</text>
  <text x="453" y="357" font-size="8" fill="#1b7a43" font-weight="bold" text-anchor="middle">100% de expedientes y contraseñas conservados</text>

  <!-- Flecha Fase 3 a Fase 4 -->
  <line x1="305" y1="384" x2="305" y2="396" stroke="#002b66" stroke-width="1.8"/>
  <polygon points="302,396 305,402 308,396" fill="#002b66"/>

  <!-- ================= FASE 4: PRUEBAS GLOBALES Y DASHBOARD EJECUTIVO (PASO N) ================= -->
  <rect x="14" y="400" width="582" height="98" rx="6" fill="#f0faf4" stroke="#1b7a43" stroke-width="1.5"/>
  <rect x="14" y="400" width="210" height="18" rx="4" fill="#1b7a43"/>
  <text x="119" y="413" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">FASE 4: PRUEBAS & DESPLIEGUE EJECUTIVO</text>

  <!-- Caja Paso N Izquierda: Batería de Pruebas -->
  <rect x="24" y="424" width="245" height="64" rx="5" fill="#ffffff" stroke="#1b7a43" stroke-width="1"/>
  <text x="146" y="438" font-size="9.5" font-weight="bold" fill="#0d5229" text-anchor="middle">Paso N.1: Batería de Pruebas Automatizadas</text>
  <text x="146" y="452" font-size="8" fill="#333" text-anchor="middle">• offline-security.test.cjs (Aislamiento de red) [PASS]</text>
  <text x="146" y="465" font-size="8" fill="#333" text-anchor="middle">• synchronization-ui.test.cjs (Colisión concurrente) [PASS]</text>
  <text x="146" y="478" font-size="8" fill="#0d5229" font-weight="bold" text-anchor="middle">Transacciones WAL: Cero corrupción ante cortes</text>

  <!-- Flecha hacia Dashboard -->
  <line x1="269" y1="456" x2="304" y2="456" stroke="#0d5229" stroke-width="1.8"/>
  <polygon points="304,453 311,456 304,459" fill="#0d5229"/>

  <!-- Caja Paso N Derecha: Dashboard Consolidado -->
  <rect x="311" y="424" width="275" height="64" rx="5" fill="#ffffff" stroke="#1b7a43" stroke-width="1"/>
  <text x="448" y="438" font-size="9.5" font-weight="bold" fill="#0d5229" text-anchor="middle">Paso N.2: Dashboard de Dirección General</text>
  <text x="448" y="452" font-size="8" fill="#333" text-anchor="middle">• 269 alumnos únicos | 295 matrículas | 12 aulas activas</text>
  <text x="448" y="465" font-size="8" fill="#333" text-anchor="middle">• Monitor sinóptico de aforos y estado de SQLite 'COHERENTE'</text>
  <text x="448" y="478" font-size="8" fill="#002b66" font-weight="bold" text-anchor="middle">Emisión de Actas y Títulos a Nombre de la Nación</text>
</svg>
`;

// Read HTML template and replace the diagram section on page 17
let template = fs.readFileSync(path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html'), 'utf8');

// Replace the diagram SVG and its interpretation text
const targetDiagramSection = `<!-- Diagrama SVG Profesional incrustado -->
      <svg width="600" height="420" viewBox="0 0 600 420" style="max-width: 100%; height: auto; font-family: Arial, sans-serif;">`;

const updatedDiagramSection = `<!-- Diagrama Arquitectónico Detallado -->
      ${detailedDiagramSvg}
      <!-- Fin Diagrama -->
      <div style="display:none;"><svg width="600" height="420" viewBox="0 0 600 420">`;

// Let's replace the page 17 content cleanly
const page17OldContent = `<!-- ========================================== PÁGINA 17: ESQUEMA / DIAGRAMA ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 13px; padding: 7px 12px; margin-bottom: 10px;">
      HACER ESQUEMA, DIBUJO O DIAGRAMA
    </div>

    <div style="font-size: 10px; font-weight: bold; color: #002b66; text-align: center; margin-bottom: 6px;">
      DIAGRAMA DE ARQUITECTURA OFFLINE-FIRST, SEGURIDAD CRIPTOGRÁFICA Y EMPAQUETADO DESKTOP
    </div>

    <div style="border: 1.5px solid #002b66; border-radius: 6px; padding: 12px; background: #fafbfc; margin: 8px 0; text-align: center;">
      <svg width="600" height="420" viewBox="0 0 600 420" style="max-width: 100%; height: auto; font-family: Arial, sans-serif;">
        <rect x="5" y="5" width="590" height="410" rx="8" fill="#ffffff" stroke="#c0d0e0" stroke-width="1.5"/>
        
        <rect x="25" y="25" width="250" height="100" rx="6" fill="#eef5fc" stroke="#0050b3" stroke-width="2"/>
        <text x="150" y="48" font-size="12" font-weight="bold" fill="#002b66" text-anchor="middle">1. APLICACIÓN DESKTOP (ELECTRON + REACT)</text>
        <text x="150" y="68" font-size="9.5" fill="#333" text-anchor="middle">• Control de Roles RBAC (Director / Secretaría / Docente)</text>
        <text x="150" y="84" font-size="9.5" fill="#333" text-anchor="middle">• Asistente de Configuración Inicial (Primer Arranque)</text>
        <text x="150" y="100" font-size="9.5" fill="#333" text-anchor="middle">• Interfaz de Sincronización y Respaldo</text>

        <line x1="275" y1="75" x2="325" y2="75" stroke="#002b66" stroke-width="2"/>
        
        <rect x="325" y="25" width="250" height="100" rx="6" fill="#f0faf4" stroke="#1b7a43" stroke-width="2"/>
        <text x="450" y="48" font-size="12" font-weight="bold" fill="#0d5229" text-anchor="middle">2. MOTOR DE SEGURIDAD CRIPTOGRÁFICA</text>
        <text x="450" y="68" font-size="9.5" fill="#333" text-anchor="middle">• Generación de Sellos Hash SHA-256 Inmutables</text>
        <text x="450" y="84" font-size="9.5" fill="#333" text-anchor="middle">• Cifrado AES con Contraseña Institucional</text>
        <text x="450" y="100" font-size="9.5" fill="#333" text-anchor="middle">• Preflight de Validación antes de Sobreescritura</text>

        <line x1="450" y1="125" x2="450" y2="165" stroke="#002b66" stroke-width="2"/>
        
        <rect x="325" y="165" width="250" height="100" rx="6" fill="#fef8eb" stroke="#d48806" stroke-width="2"/>
        <text x="450" y="188" font-size="12" font-weight="bold" fill="#ad6800" text-anchor="middle">3. SINCRONIZACIÓN Y CONFLICTOS HTTP 409</text>
        <text x="450" y="208" font-size="9.5" fill="#333" text-anchor="middle">• Intercambio de Paquetes P2P Offline</text>
        <text x="450" y="224" font-size="9.5" fill="#333" text-anchor="middle">• Comparación de Versiones y Marcas de Tiempo</text>
        <text x="450" y="240" font-size="9.5" fill="#333" text-anchor="middle">• Resolución Granular Guiada en Pantalla</text>

        <line x1="325" y1="215" x2="275" y2="215" stroke="#002b66" stroke-width="2"/>

        <rect x="25" y="165" width="250" height="100" rx="6" fill="#fdf2f2" stroke="#cf1322" stroke-width="2"/>
        <text x="150" y="188" font-size="12" font-weight="bold" fill="#a8071a" text-anchor="middle">4. ALMACENAMIENTO LOCAL SQLite 3</text>
        <text x="150" y="208" font-size="9.5" fill="#333" text-anchor="middle">• Operación 100% Offline-First en Windows</text>
        <text x="150" y="224" font-size="9.5" fill="#333" text-anchor="middle">• Ubicación Protegida en Directorio %APPDATA%</text>
        <text x="150" y="240" font-size="9.5" fill="#333" text-anchor="middle">• Integridad Transaccional ACID y Esquema V2</text>

        <line x1="150" y1="265" x2="150" y2="300" stroke="#002b66" stroke-width="2"/>

        <rect x="25" y="300" width="550" height="95" rx="6" fill="#f6f0fd" stroke="#722ed1" stroke-width="2"/>
        <text x="300" y="325" font-size="13" font-weight="bold" fill="#391085" text-anchor="middle">5. COMPILACIÓN Y DESPLIEGUE FINAL (INNO SETUP COMPILER)</text>
        <text x="300" y="348" font-size="10" fill="#333" text-anchor="middle">• Script <code>installer.iss</code> con directivas de actualización segura</text>
        <text x="300" y="365" font-size="10" fill="#333" text-anchor="middle">• Aislamiento total: La desinstalación o reinstalación conserva la base <code>cetpro.sqlite</code></text>
        <text x="300" y="382" font-size="10" font-weight="bold" fill="#002b66" text-anchor="middle">GARANTÍA DE CERO PÉRDIDA DE EXPEDIENTES Y OPERACIÓN AUTÓNOMA</text>
      </svg>
    </div>

    <p style="font-size: 8.5px; text-align: justify; margin-top: 4px;"><strong>Interpretación del esquema que diseñé:</strong> En este diagrama represento el flujo arquitectónico que implementé en el sistema: la aplicación en Electron interactúa directamente con el motor criptográfico para sellar las copias en SHA-256; los paquetes de datos fluyen de forma P2P a través del comparador de versiones para dirimir colisiones concurrentes (HTTP 409); y todas las transacciones se asientan de forma segura en la base SQLite ubicada en <code>%APPDATA%</code>, la cual queda totalmente protegida frente al instalador Inno Setup.</p>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 17</span>
  </div>
</div>`;

const page17NewContent = `<!-- ========================================== PÁGINA 17: ESQUEMA / DIAGRAMA ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 12px; padding: 6px 10px; margin-bottom: 6px;">
      HACER ESQUEMA, DIBUJO O DIAGRAMA
    </div>

    <div style="font-size: 9.5px; font-weight: bold; color: #002b66; text-align: center; margin-bottom: 4px;">
      DIAGRAMA DESCRIPTIVO GENERAL DEL PROCESO Y ARQUITECTURA TÉCNICA
    </div>

    <div style="margin: 4px 0;">
      ${detailedDiagramSvg}
    </div>

    <div class="highlight-box" style="margin-top: 5px; font-size: 8.3px; line-height: 1.35;">
      <strong>Interpretación técnica detallada del diagrama que elaboré (Primera Persona):</strong><br>
      Diseñé este esquema para representar la secuencia lógica de ejecución de la tarea más significativa que implementé en el CETPRO, desglosada en cuatro fases interconectadas:
      <strong>1. Fase de Respaldo Criptográfico:</strong> La base local SQLite procesa los 18 almacenes de datos institucionales mediante el serializador Schema V2 y calcula la firma digital SHA-256 de 64 caracteres; antes de restaurar, la barrera Preflight verifica en memoria que la firma coincida, bloqueando cualquier archivo adulterado.
      <strong>2. Fase de Sincronización Descentralizada:</strong> Ante la ausencia de internet, las laptops docentes generan deltas con notas y asistencias; al recibirlos en secretaría, el detector de marcas de tiempo identifica colisiones y activa el comparador visual HTTP 409 para resolución consentida campo por campo.
      <strong>3. Fase de Empaquetado Desktop:</strong> Parametricé el compilador Inno Setup con la directiva <code>uninsneveruninstall</code> para aislar <code>%APPDATA%/cepro-micaela-2.0/cetpro.sqlite</code>, garantizando que desinstalaciones o actualizaciones conserven intactos los 295 expedientes históricos.
      <strong>4. Fase de Pruebas y Control:</strong> El sistema supera las pruebas automatizadas (aislamiento de red, concurrencia y transacciones WAL) y consolida la gestión en el Dashboard de Dirección General con emisión directa de actas oficiales y títulos a Nombre de la Nación.
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 17</span>
  </div>
</div>`;

template = template.replace(page17OldContent, page17NewContent);
fs.writeFileSync(path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html'), template, 'utf8');
console.log('HTML actualizado con el nuevo diagrama detallado.');

async function compilePDF() {
  console.log('Iniciando Puppeteer con Chrome del sistema para compilar PDF...');
  const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('file:///' + path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  const pdfPath = path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();
  console.log('PDF con nuevo diagrama compilado en:', pdfPath);
}

compilePDF().catch(err => {
  console.error('Error compilando PDF:', err);
});
