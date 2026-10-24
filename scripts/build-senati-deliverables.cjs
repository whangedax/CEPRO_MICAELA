const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, BorderStyle, HeadingLevel, Header, Footer, PageNumber, NumberFormat
} = require('docx');

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

console.log('Cargando plantilla HTML de 18 páginas...');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe de Formación Práctica en Empresa - SENATI</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    margin: 0;
    padding: 0;
    background-color: #525659;
    font-family: Arial, Helvetica, sans-serif;
    color: #222;
  }
  .page {
    width: 210mm;
    height: 297mm;
    margin: 10mm auto;
    background: #fff;
    padding: 16mm 18mm 16mm 18mm;
    position: relative;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  @media print {
    body {
      background: none;
    }
    .page {
      margin: 0;
      box-shadow: none;
      width: 210mm;
      height: 297mm;
    }
  }

  /* Header and Footer */
  .header {
    border-bottom: 2.5px solid #002b66;
    padding-bottom: 6px;
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .logo-senati {
    font-size: 20px;
    font-weight: 900;
    color: #002b66;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .logo-badge {
    background: #0050b3;
    color: #fff;
    font-size: 13px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .header-right {
    text-align: right;
    font-size: 10px;
    font-weight: bold;
    color: #333;
    text-transform: uppercase;
  }
  .sub-zonal {
    font-size: 9px;
    color: #555;
    margin-top: 2px;
  }
  .footer {
    border-top: 1px solid #ccc;
    padding-top: 6px;
    font-size: 8.5px;
    color: #666;
    display: flex;
    justify-content: space-between;
  }
  .page-content {
    flex: 1;
  }

  /* Banners and Sections */
  .navy-banner {
    background: #002b66;
    color: white;
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    padding: 10px 15px;
    letter-spacing: 1px;
    margin-bottom: 20px;
    border-radius: 2px;
  }
  .section-title {
    font-size: 12px;
    font-weight: bold;
    color: #002b66;
    border-bottom: 1.5px solid #002b66;
    padding-bottom: 3px;
    margin-top: 12px;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  /* Tables */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
    margin-bottom: 12px;
  }
  table.data-table th, table.data-table td {
    border: 1px solid #b0c0d0;
    padding: 6px 8px;
  }
  table.data-table th {
    background: #eef3f9;
    color: #002b66;
    font-weight: bold;
    text-align: left;
  }
  table.table-navy-header th {
    background: #002b66;
    color: #fff;
    font-weight: bold;
    text-align: center;
  }

  /* Portada */
  .cover-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    padding: 40px 10px;
  }
  .cover-banner {
    background: #002b66;
    color: #fff;
    width: 100%;
    padding: 35px 20px;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 2px;
    margin: 80px 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .cover-title {
    font-size: 26px;
    font-weight: 900;
    color: #002b66;
    line-height: 1.3;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  .cover-arrow {
    font-size: 28px;
    color: #4a90e2;
  }

  /* Text elements */
  p, li {
    font-size: 9.5px;
    line-height: 1.45;
    color: #222;
    margin: 4px 0;
    text-align: justify;
  }
  ul {
    margin: 4px 0 8px 18px;
    padding: 0;
  }

  /* Evidence and Image boxes */
  .evidence-box {
    border: 1px solid #002b66;
    border-radius: 4px;
    padding: 6px;
    margin: 6px 0 10px 0;
    background: #fafbfc;
    text-align: center;
  }
  .evidence-img {
    max-width: 100%;
    max-height: 82mm;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 2px;
    display: block;
    margin: 0 auto;
  }
  .evidence-caption {
    font-size: 8.5px;
    font-weight: bold;
    color: #002b66;
    margin-top: 4px;
    text-align: center;
  }

  /* Photo box */
  .photo-container {
    width: 100%;
    height: 125mm;
    border: 2px dashed #002b66;
    background: #f4f8fc;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #002b66;
    margin: 15px 0;
    text-align: center;
    padding: 20px;
  }
  .photo-icon {
    font-size: 42px;
    margin-bottom: 12px;
  }
  .highlight-box {
    background: #f0f4fa;
    border-left: 4px solid #002b66;
    padding: 8px 12px;
    margin: 8px 0;
    font-size: 9.5px;
    font-style: italic;
  }
</style>
</head>
<body>

<!-- ========================================== PÁGINA 1: PORTADA ========================================== -->
<div class="page">
  <div class="cover-container">
    <div>
      <div class="logo-senati" style="font-size: 32px; justify-content: center; margin-bottom: 8px;">
        <span class="logo-badge" style="font-size: 20px; padding: 4px 10px;">S</span> SENATI
      </div>
      <div style="font-size: 11px; font-weight: bold; color: #444; letter-spacing: 1px; border-bottom: 2px solid #002b66; padding-bottom: 8px; width: 140mm; margin: 0 auto;">
        SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL
      </div>
    </div>

    <div class="cover-banner">
      FORMACIÓN PROFESIONAL DUAL
    </div>

    <div>
      <div class="cover-title">
        <span class="cover-arrow">&#10230;</span>
        <div>
          INFORME<br>
          DE FORMACIÓN PRÁCTICA<br>
          EN EMPRESA
        </div>
        <span class="cover-arrow">&#10229;</span>
      </div>
    </div>

    <div style="font-size: 11px; font-weight: bold; color: #333; margin-top: 80px; letter-spacing: 0.5px;">
      CÓDIGO N° 89001677
    </div>
  </div>
</div>

<!-- ========================================== PÁGINA 2: DATOS GENERALES ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">
        FORMACIÓN PROFESIONAL DUAL
        <div class="sub-zonal">DIRECCIÓN ZONAL ETI- JULIACA</div>
      </div>
    </div>

    <div class="navy-banner" style="margin-top: 10px;">
      FORMACIÓN PROFESIONAL DUAL
    </div>

    <table class="data-table" style="font-size: 11px; margin-top: 25px;">
      <tr>
        <th style="width: 25%; background: #eef3f9; padding: 12px 10px;">CFP/UCP/ESCUELA</th>
        <td colspan="3" style="font-weight: bold; padding: 12px 10px; color: #002b66;">UCP ETI SENATI JULIACA</td>
      </tr>
      <tr>
        <th style="padding: 12px 10px;">ESTUDIANTE</th>
        <td colspan="3" style="font-weight: bold; padding: 12px 10px;">GUZMAN JORDAN, GONSALO</td>
      </tr>
      <tr>
        <th style="padding: 12px 10px;">ID</th>
        <td style="font-weight: bold; width: 25%; padding: 12px 10px;">001499194</td>
        <th style="width: 20%; padding: 12px 10px;">BLOQUE</th>
        <td style="font-weight: bold; width: 30%; padding: 12px 10px;">49PIADS402</td>
      </tr>
      <tr>
        <th style="padding: 12px 10px;">CARRERA</th>
        <td colspan="3" style="font-weight: bold; padding: 12px 10px; color: #002b66;">INGENIERÍA DE SOFTWARE CON INTELIGENCIA ARTIFICIAL</td>
      </tr>
      <tr>
        <th style="padding: 12px 10px;">INSTRUCTOR</th>
        <td colspan="3" style="font-weight: bold; padding: 12px 10px;">GUILLÉN HERRERA, JOSÉ ÁNGEL</td>
      </tr>
      <tr>
        <th style="padding: 12px 10px;">SEMESTRE</th>
        <td style="font-weight: bold; padding: 12px 10px; text-align: center;">IV</td>
        <th style="padding: 12px 10px; text-align: center;">PERÍODO</th>
        <td style="font-weight: bold; padding: 12px 10px; color: #002b66; text-align: center;">DEL 12/10/2026 AL 23/10/2026</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 2</span>
  </div>
</div>

<!-- ========================================== PÁGINA 3: INSTRUCCIONES ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 13px; padding: 8px 12px;">
      INSTRUCCIONES PARA EL USO DEL INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA
    </div>

    <div style="font-size: 11px; font-weight: bold; color: #002b66; margin: 14px 0 6px 0;">1. PRESENTACIÓN.</div>
    <p style="font-size: 10px; line-height: 1.5;">El Informe de Formación Práctica en Empresa es un documento de control, en el cual el estudiante, registra diariamente, las tareas y operaciones que ejecuta en su formación práctica Empresa.</p>

    <div style="font-size: 11px; font-weight: bold; color: #002b66; margin: 14px 0 6px 0;">2. INSTRUCCIONES PARA EL USO DEL INFORME DE FORMACIÓN PRÁCTICA.</div>
    
    <p style="font-size: 10px; line-height: 1.5;"><strong>2.1</strong> En el cuadro de rotaciones, el estudiante, registrará el nombre de las áreas o secciones por las cuales rota durante su formación práctica en la Empresa, precisando la fecha de inicio y término.</p>
    <p style="font-size: 10px; line-height: 1.5;"><strong>2.2</strong> Con base al PEA publicado en SINFO, el estudiante selecciona el PEA del semestre que está cursando y transcribe el PEA en el informe de práctica del presente formato. El estudiante registrará y controlará su avance, marcando en la columna que corresponda.</p>
    <p style="font-size: 10px; line-height: 1.5;"><strong>2.3</strong> Si el PEA tiene menos operaciones (151) de las indicadas en el presente formato, puede eliminar alguna página.</p>
    <p style="font-size: 10px; line-height: 1.5;"><strong>2.4</strong> En el REGISTRO SEMANAL DE TRABAJOS REALIZADOS, el estudiante anotará diariamente los trabajos que ejecuta en la empresa, indicando el tiempo correspondiente. El día de asistencia a SENATI para las sesiones de tecnología, registrará los contenidos que desarrolla en clase. Al término de cada semana totalizará las horas.</p>
    <p style="font-size: 10px; line-height: 1.5;">De las tareas realizadas durante dos semanas, el estudiante seleccionará <strong>la tarea más significativa</strong> y realizará una descripción del proceso de ejecución con esquemas y dibujos correspondientes que aclaren dicho proceso. Una de las características de la comunicación técnica es que, debe contener información relevante y fácil de entender.</p>
    <p style="font-size: 10px; line-height: 1.5;"><strong>2.5</strong> Cada dos semanas, el estudiante presentará en físico el informe de la tarea más significativa al Monitor, quien revisará, anotará las observaciones, las recomendaciones que considere y validará con su firma el respectivo informe. Se recomienda que el monitor solicite al estudiante que explique o fundamente el informe que ha elaborado.</p>
    <p style="font-size: 10px; line-height: 1.5;"><strong>2.6</strong> El informe validado por el monitor será presentado al instructor correspondiente. El estudiante debe escanear o tomar foto al informe firmado por el monitor, luego lo sube a la plataforma LMS (Blackboard). El Instructor revisará y calificará el Informe de Formación Práctica en Empresa haciendo las observaciones y recomendaciones que considere convenientes, en los aspectos relacionados a la elaboración de un Informe Técnico.</p>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 3</span>
  </div>
</div>

<!-- ========================================== PÁGINA 4: CUADRO DE ROTACIONES ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 14px;">
      CUADRO DE ROTACIONES
    </div>

    <table class="data-table table-navy-header" style="font-size: 10.5px; margin-top: 20px;">
      <thead>
        <tr>
          <th rowspan="2" style="width: 50%; vertical-align: middle;">ÁREA / SECCIÓN / EMPRESA</th>
          <th colspan="2" style="width: 30%;">PERÍODO</th>
          <th rowspan="2" style="width: 20%; vertical-align: middle;">SEMANAS</th>
        </tr>
        <tr>
          <th style="font-size: 9px; padding: 4px;">DESDE</th>
          <th style="font-size: 9px; padding: 4px;">HASTA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: bold; padding: 12px 10px;">MÓDULOS Y PAQUETES PARA MACHINE LEARNING CON PYTHON</td>
          <td style="text-align: center;">17/08/26</td>
          <td style="text-align: center;">13/09/26</td>
          <td style="text-align: center;">04 semanas</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 12px 10px;">FUNDAMENTOS Y ALGORITMIA PARA INTELIGENCIA ARTIFICIAL</td>
          <td style="text-align: center;">14/09/26</td>
          <td style="text-align: center;">11/10/26</td>
          <td style="text-align: center;">04 semanas</td>
        </tr>
        <tr style="background: #f4f8fc;">
          <td style="font-weight: bold; padding: 12px 10px; color: #002b66;">MACHINE LEARNING Y DEEP LEARNING (VINCULADO AL PERÍODO ACTUAL)</td>
          <td style="text-align: center; font-weight: bold; color: #002b66;">12/10/26</td>
          <td style="text-align: center; font-weight: bold; color: #002b66;">08/11/26</td>
          <td style="text-align: center; font-weight: bold; color: #002b66;">04 semanas</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 12px 10px;">ARTIFICIAL INTELLIGENCE WITH MACHINE LEARNING IN JAVA (ORACLE)</td>
          <td style="text-align: center;">09/11/26</td>
          <td style="text-align: center;">06/12/26</td>
          <td style="text-align: center;">04 semanas</td>
        </tr>
        <tr>
          <td style="padding: 12px 10px;">&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
        <tr>
          <td style="padding: 12px 10px;">&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 4</span>
  </div>
</div>

<!-- ========================================== PÁGINA 5: PEA PÁG 1 (INTACTO) ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div style="font-size: 11px; font-weight: bold; color: #002b66; text-transform: uppercase; margin-bottom: 8px;">
      PLAN ESPECÍFICO DE APRENDIZAJE (PEA) CONTROL DE AVANCE
    </div>

    <table class="data-table table-navy-header" style="font-size: 9px;">
      <thead>
        <tr>
          <th rowspan="2" style="width: 6%;">Nº</th>
          <th rowspan="2" style="width: 64%;">OPERACIONES/TAREAS</th>
          <th colspan="4" style="width: 18%;">OPERACIONES EJECUTADAS</th>
          <th rowspan="2" style="width: 12%;">OPERACIONES PARA SEMINARIO</th>
        </tr>
        <tr>
          <th style="width: 4.5%; font-size: 8px;">1</th>
          <th style="width: 4.5%; font-size: 8px;">2</th>
          <th style="width: 4.5%; font-size: 8px;">3</th>
          <th style="width: 4.5%; font-size: 8px;">4</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #eef3f9; font-weight: bold;"><td style="text-align: center;">01</td><td colspan="6">MÓDULOS Y PAQUETES PARA MACHINE LEARNING CON PYTHON</td></tr>
        <tr><td style="text-align: center;">02</td><td>Realiza operaciones con las Librerías Pandas y Nump</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">03</td><td>Estudia el uso de las Librerías Scikit-learn y Pytorch</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">04</td><td>Estudia el uso de las Librerías SciPy y Nltk</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">05</td><td>Estudia el uso de las Librerías Tensorflow y Keras</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">06</td><td>Realiza operaciones con las librerías Matplotlib y Seaborn</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr style="background: #eef3f9; font-weight: bold;"><td style="text-align: center;">07</td><td colspan="6">FUNDAMENTOS Y ALGORITMIA PARA INTELIGENCIA ARTIFICIAL</td></tr>
        <tr><td style="text-align: center;">08</td><td>Estudia los fundamentos de Inteligencia Artificial</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">09</td><td>Realiza operaciones con algebra lineal, vectores y matrices</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">10</td><td>Estudia los principios y variables estadísticas</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">11</td><td>Realiza operaciones con la varianza y desviación estándar</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr style="background: #eef3f9; font-weight: bold;"><td style="text-align: center;">12</td><td colspan="6">MACHINE LEARNING Y DEEP LEARNING</td></tr>
        <tr><td style="text-align: center;">13</td><td>Crea programas con algoritmos de aprendizaje supervisado</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">14</td><td>Crea programas con algoritmos de aprendizaje no supervisado</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">15</td><td>Define la estructura y crea una red neuronal artificial</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">16</td><td>Describe los principios de visión computacional y Machine Learning</td><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 5</span>
  </div>
</div>

<!-- ========================================== PÁGINA 6: PEA PÁG 2 (INTACTO) ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <table class="data-table table-navy-header" style="font-size: 9px; margin-top: 10px;">
      <thead>
        <tr>
          <th rowspan="2" style="width: 6%;">Nº</th>
          <th rowspan="2" style="width: 64%;">OPERACIONES/TAREAS</th>
          <th colspan="4" style="width: 18%;">OPERACIONES EJECUTADAS</th>
          <th rowspan="2" style="width: 12%;">OPERACIONES PARA SEMINARIO</th>
        </tr>
        <tr>
          <th style="width: 4.5%; font-size: 8px;">1</th>
          <th style="width: 4.5%; font-size: 8px;">2</th>
          <th style="width: 4.5%; font-size: 8px;">3</th>
          <th style="width: 4.5%; font-size: 8px;">4</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #eef3f9; font-weight: bold;"><td style="text-align: center;">17</td><td colspan="6">ARTIFICIAL INTELLIGENCE WITH MACHINE LEARNING IN JAVA (ORACLE)</td></tr>
        <tr><td style="text-align: center;">18</td><td>Explica el uso de la IA</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">19</td><td>Utiliza recursividad en la programación</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="text-align: center;">20</td><td>Construye algoritmo de árbol de decisiones</td><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 6</span>
  </div>
</div>

<!-- ========================================== PÁGINA 7: REGISTRO SEMANAL 1 ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 13px; padding: 7px 12px; margin-bottom: 12px;">
      REGISTRO SEMANAL DE TRABAJOS EFECTUADOS (SEMANA 1)
    </div>

    <table class="data-table table-navy-header" style="font-size: 9px;">
      <thead>
        <tr>
          <th style="width: 18%;">DÍA</th>
          <th style="width: 72%;">ACTIVIDADES / TRABAJOS EFECTUADOS</th>
          <th style="width: 10%;">HORAS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: bold; text-align: center;">LUNES<br>12/10/2026</td>
          <td><strong>Auditoría de persistencia y análisis de seguridad offline:</strong> Diagnóstico del motor SQLite local, revisión de integridad referencial de tablas de matrículas y actas frente a cortes imprevistos de fluido eléctrico.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">MARTES<br>13/10/2026</td>
          <td><strong>Diseño del sistema de respaldo criptográfico:</strong> Estructuración del esquema normalizado de exportación (Schema V2) y generación de algoritmos de firma digital y sumas de comprobación mediante hash SHA-256.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">MIÉRCOLES<br>14/10/2026</td>
          <td><strong>Módulo de exportación cifrada y seguridad RBAC:</strong> Implementación del botón de exportación segura con contraseña institucional en el panel de respaldo y bloqueo preventivo para perfiles sin privilegios.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">JUEVES<br>15/10/2026</td>
          <td><strong>Desarrollo de preflight de restauración:</strong> Creación de la ventana modal de inspección previa de respaldos, validando que el archivo no haya sido adulterado antes de autorizar la sobreescritura en base de datos.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">VIERNES<br>16/10/2026</td>
          <td><strong>Pruebas de restauración aislada:</strong> Ejecución de simulaciones de recuperación total de base de datos en sandbox local, verificando que los 295 expedientes y 12 aulas se restauren al 100% sin inconsistencias.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">SÁBADO<br>17/10/2026</td>
          <td><strong>Implementación de notificaciones de integridad en UI:</strong> Configuración de banners de estado y alertas toast verdes/rojas que notifican al usuario el estado de la salud de la base de datos y validez de la copia.</td>
          <td style="text-align: center; font-weight: bold;">4 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">DOMINGO<br>18/10/2026</td>
          <td><strong>Mantenimiento de código y pruebas de estrés offline:</strong> Ejecución de scripts automatizados de verificación de seguridad, validación de contratos de datos y optimización de índices SQLite.</td>
          <td style="text-align: center; font-weight: bold;">4 h</td>
        </tr>
        <tr style="background: #eef3f9;">
          <td colspan="2" style="text-align: right; font-weight: bold; font-size: 10px; color: #002b66;">TOTAL HORAS SEMANA 1:</td>
          <td style="text-align: center; font-weight: bold; font-size: 10px; color: #002b66;">48 h</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 7</span>
  </div>
</div>

<!-- ========================================== PÁGINA 8: REGISTRO SEMANAL 2 ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 13px; padding: 7px 12px; margin-bottom: 12px;">
      REGISTRO SEMANAL DE TRABAJOS EFECTUADOS (SEMANA 2)
    </div>

    <table class="data-table table-navy-header" style="font-size: 9px;">
      <thead>
        <tr>
          <th style="width: 18%;">DÍA</th>
          <th style="width: 72%;">ACTIVIDADES / TRABAJOS EFECTUADOS</th>
          <th style="width: 10%;">HORAS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: bold; text-align: center;">LUNES<br>19/10/2026</td>
          <td><strong>Desarrollo del motor de sincronización offline P2P:</strong> Construcción del mecanismo de generación e importación de paquetes diferenciales de asistencia y evaluación entre portátiles docentes y secretaría.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">MARTES<br>20/10/2026</td>
          <td><strong>Resolución interactiva de conflictos HTTP 409:</strong> Programación del comparador de versiones para detectar colisiones de notas concurrentes, permitiendo al usuario dirimir cambios campo por campo.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">MIÉRCOLES<br>21/10/2026</td>
          <td><strong>Endurecimiento de roles institucionales (RBAC):</strong> Configuración de restricciones de acceso por perfil (Director, Secretaría, Docente) y adaptación de barras laterales con vistas especializadas.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">JUEVES<br>22/10/2026</td>
          <td><strong>Automatización de compilación de instalador Windows:</strong> Configuración del compilador Inno Setup (<code>installer.iss</code>) y empaquetado nativo de Electron x64 con parámetros de instalación silenciosa y segura.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr>
          <td style="font-weight: bold; text-align: center;">VIERNES<br>23/10/2026</td>
          <td><strong>Verificación de ciclo de vida del instalador y cierre quincenal:</strong> Pruebas de instalación desde cero, reinstalación preservando SQLite en <code>%APPDATA%</code>, auditoría final de seguridad y cierre de informe.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>
        <tr style="color: #777;">
          <td style="text-align: center;">SÁBADO<br>24/10/2026</td>
          <td style="font-style: italic;">[Período quincenal concluido oficialmente el 23/10/2026 conforme a requerimiento institucional]</td>
          <td style="text-align: center;">0 h</td>
        </tr>
        <tr style="color: #777;">
          <td style="text-align: center;">DOMINGO<br>25/10/2026</td>
          <td style="font-style: italic;">[Período quincenal concluido oficialmente el 23/10/2026 conforme a requerimiento institucional]</td>
          <td style="text-align: center;">0 h</td>
        </tr>
        <tr style="background: #eef3f9;">
          <td colspan="2" style="text-align: right; font-weight: bold; font-size: 10px; color: #002b66;">TOTAL HORAS SEMANA 2:</td>
          <td style="text-align: center; font-weight: bold; font-size: 10px; color: #002b66;">40 h</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 8</span>
  </div>
</div>

<!-- ========================================== PÁGINA 9: TAREA MÁS SIGNIFICATIVA ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 12px; padding: 6px 10px; margin-bottom: 8px;">
      INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA
    </div>

    <div style="font-size: 10px; font-weight: bold; color: #002b66; margin-bottom: 6px;">
      Tarea más significativa durante las dos semanas: ¿Por qué eligió esta tarea y qué operaciones del PEA cumplió con su ejecución?
    </div>

    <div class="highlight-box" style="font-weight: bold; font-style: normal; color: #002b66; font-size: 10px; margin-bottom: 8px;">
      Título: Implementación de la arquitectura de seguridad offline-first, respaldos cifrados con hash SHA-256, sincronización P2P con resolución de conflictos HTTP 409 y empaquetado desktop en instalador Windows (Inno Setup) con preservación garantizada de la base de datos SQLite para CEPRO MICAELA 2.0.
    </div>

    <p><strong>[Por qué se eligió la tarea]:</strong> Elegí esta tarea como la más significativa del período debido a que representa el pilar crítico de seguridad y disponibilidad del sistema en la empresa. La institución educativa demanda operar de manera 100% offline-first en talleres y oficinas donde el acceso a internet es nulo o altamente inestable. Implementar un mecanismo de respaldo cifrado y un instalador nativo garantiza que los datos académicos de los estudiantes nunca se pierdan ante fallas energéticas o reinstalaciones del sistema operativo.</p>

    <p><strong>[Problema observado y riesgos existentes]:</strong> Al auditar el estado del sistema, identifiqué que las copias de seguridad anteriores carecían de verificación de integridad, lo que permitía que archivos corruptos o modificados externamente pudieran sobrescribir la base de datos productiva. Asimismo, ante actualizaciones de software, existía el riesgo inminente de borrar la base de datos SQLite local alojada en el equipo del usuario si el instalador no estaba correctamente parametrizado para conservar el directorio de datos persistentes.</p>

    <p><strong>[Resumen del trabajo realizado]:</strong> Para resolver estas vulnerabilidades, diseñé e implementé un protocolo integral de seguridad offline: desarrollé un módulo de exportación de respaldos protegidos por contraseña con sellado criptográfico mediante funciones hash SHA-256, programé una rutina de inspección previa (preflight) que valida la firma antes de restaurar, creé un sistema de sincronización con comparador visual de colisiones concurrentes (HTTP 409) y automaticé el empaquetado de la aplicación en un instalador ejecutable para Windows mediante Inno Setup y Electron.</p>

    <p><strong>[Detalle de módulos y funciones implementadas]:</strong> Desarrollé los componentes reactivos <code>BackupManager</code> (generador de paquetes cifrados y cálculo de checksums), <code>PreflightModal</code> (desbloqueo seguro y verificación de integridad), <code>SyncConflictModal</code> (resolución granular de discrepancias de notas y asistencias), la configuración del compilador <code>installer.iss</code> con directivas de conservación de datos en <code>%APPDATA%</code>, y la suite de pruebas unitarias <code>tests/verify-installer-full-lifecycle.cjs</code>.</p>

    <p><strong>[Contexto y vinculación formativa]:</strong> La ejecución de esta tarea consolida las competencias de ingeniería de software en entornos de escritorio de alta criticidad, aplicando algoritmos de árboles de decisión para el descarte de conflictos concurrentes, funciones matemáticas unidireccionales de hashing y arquitectura de software orientada a la soberanía de datos locales, sin alterar el programa curricular institucional.</p>

    <p><strong>[Importancia de la tarea más allá de lo superficial]:</strong> Esta implementación trasciende lo meramente visual o estético; brinda solidez jurídica e institucional al CETPRO al proteger el patrimonio documental de cientos de estudiantes. Al garantizar copias inmutables y despliegues seguros, se asegura que el personal directivo y docente confíe plenamente en la tecnología institucional sin dependencia de servicios externos.</p>

    <div class="highlight-box" style="margin-top: 6px; font-weight: bold; color: #002b66;">
      Resultado final destacado: Se logró un ecosistema de escritorio Windows de nivel productivo con tolerancia a fallos, cero pérdida de datos durante actualizaciones y sincronización segura y verificable entre roles.
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 9</span>
  </div>
</div>

<!-- ========================================== PÁGINA 10: DESCRIPCIÓN DEL PROCESO (PASOS 1 AL 3) ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 12px; padding: 6px 10px; margin-bottom: 6px;">
      DESCRIPCIÓN DEL PROCESO: SECUENCIA LÓGICA DE EJECUCIÓN DE LA TAREA
    </div>

    <p style="font-size: 8.5px; margin-bottom: 6px;">Para realizar esta tarea de modernización y seguridad seguí una secuencia rigurosa de <strong>análisis, diseño criptográfico, programación modular, empaquetado desktop y pruebas de ciclo de vida</strong>.</p>

    <div style="font-size: 9.5px; font-weight: bold; color: #002b66;">1. Módulo de Respaldo Cifrado con Sellado SHA-256</div>
    <p style="font-size: 8.5px;">Se diseñó la interfaz de administración de respaldos institucionales con capacidad de exportación cifrada. Se implementó el cómputo de la suma de comprobación SHA-256 para cada exportación JSON, garantizando la inmutabilidad y trazabilidad de los datos académicos.</p>
    <div class="evidence-box">
      <img src="${imgP1}" class="evidence-img" style="max-height: 52mm;">
      <div class="evidence-caption">Evidencia 01 · Paso 1. Módulo de respaldo institucional con función de exportación cifrada y verificación criptográfica.</div>
    </div>

    <div style="font-size: 9.5px; font-weight: bold; color: #002b66;">2. Inspección Previa (Preflight) y Desbloqueo Seguro de Respaldos</div>
    <p style="font-size: 8.5px;">Se implementó una barrera de seguridad obligatoria antes de cualquier restauración: el sistema analiza la cabecera del archivo, verifica el hash SHA-256 contra el contenido real y exige la contraseña institucional antes de aplicar cambios a SQLite.</p>
    <div class="evidence-box">
      <img src="${imgP2}" class="evidence-img" style="max-height: 52mm;">
      <div class="evidence-caption">Evidencia 02 · Paso 2. Modal interactivo de inspección previa (preflight) que valida el hash SHA-256 y desbloquea el archivo.</div>
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 10</span>
  </div>
</div>

<!-- ========================================== PÁGINA 11: DESCRIPCIÓN DEL PROCESO (PASOS 4 AL 6 Y PRUEBAS) ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div style="font-size: 9.5px; font-weight: bold; color: #002b66;">3. Sincronización Descentralizada P2P y Resolución de Conflictos HTTP 409</div>
    <p style="font-size: 8.5px;">Se construyó el centro de sincronización offline para intercambiar información entre docentes y secretaría sin requerir internet, dotado de un comparador de versiones para dirimir colisiones concurrentes de registros.</p>
    <div class="evidence-box">
      <img src="${imgP4}" class="evidence-img" style="max-height: 52mm;">
      <div class="evidence-caption">Evidencia 03 · Paso 3. Comparador visual interactivo de conflictos HTTP 409 para resolución granular de datos concurrentes.</div>
    </div>

    <div style="font-size: 9.5px; font-weight: bold; color: #002b66;">4. Empaquetado Desktop y Preservación de Datos en Reinstalaciones</div>
    <p style="font-size: 8.5px;">Se configuró el instalador Inno Setup para Windows, comprobando que las actualizaciones y reinstalaciones conserven íntegra la base de datos local SQLite y los archivos de sesión del CETPRO.</p>
    <div class="evidence-box">
      <img src="${imgP6}" class="evidence-img" style="max-height: 52mm;">
      <div class="evidence-caption">Evidencia 04 · Paso 4. Verificación del ciclo de vida del instalador: reinstalación limpia con 100% de datos preservados.</div>
    </div>

    <div class="section-title" style="margin-top: 4px;">N. Pruebas del Funcionamiento y Dashboard Ejecutivo</div>
    <p style="font-size: 8.5px; margin-bottom: 4px;">Se ejecutaron pruebas automatizadas de seguridad offline y verificación del ciclo de vida del ejecutable, corroborando el correcto despliegue del Dashboard de Dirección General con métricas consolidadas en tiempo real.</p>
    <div class="evidence-box" style="margin-bottom: 2px;">
      <img src="${imgPN}" class="evidence-img" style="max-height: 48mm;">
      <div class="evidence-caption">Evidencia Final · Paso N. Panel ejecutivo de Dirección General operativo tras el arranque seguro del instalador Windows.</div>
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 11</span>
  </div>
</div>

<!-- ========================================== PÁGINA 12: RESULTADO OBTENIDO Y FOTO ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 13px; padding: 7px 12px; margin-bottom: 10px;">
      RESULTADO OBTENIDO
    </div>

    <p style="font-size: 10px; line-height: 1.5;">Con la ejecución de esta tarea se consiguió transformar la solución en una aplicación de escritorio profesional para Windows, completamente autónoma y blindada. El personal del CETPRO (Directora, Secretaría Académica y Docentes) dispone ahora de una herramienta que arranca instantáneamente, respalda su información con altos estándares criptográficos, previene la sobrescritura accidental mediante validaciones inteligentes y permite sincronizar las notas y asistencias entre diferentes computadoras de manera confiable y transparente.</p>

    <div class="highlight-box" style="font-weight: bold; color: #002b66; font-size: 10.5px; margin: 10px 0;">
      Logro principal: Despliegue exitoso del instalador nativo CEPRO MICAELA 2.0 con arquitectura offline-first, cero pérdida de datos garantizada y sincronización armónica entre perfiles institucionales.
    </div>

    <!-- SECCIÓN APARTADA Y ENMARCADA PARA LA FOTO DEL ESTUDIANTE -->
    <div class="photo-container">
      <div class="photo-icon">&#128100;&#128187;</div>
      <div style="font-size: 13px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 6px;">
        ESPACIO RESERVADO PARA LA FOTOGRAFÍA DEL ESTUDIANTE
      </div>
      <div style="font-size: 10px; color: #444; max-width: 140mm; line-height: 1.4; margin-bottom: 8px;">
        Colocar aquí la fotografía del estudiante <strong>Gonsalo Guzman Jordan</strong> desarrollando la tarea en su estación de trabajo / laptop técnica en la empresa.
      </div>
      <div style="font-size: 8.5px; color: #777; border: 1px dashed #b0c0d0; padding: 4px 10px; border-radius: 4px;">
        Dimensiones recomendadas: Fotografía a color en alta resolución (proporción 4:3 o 16:9)
      </div>
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 12</span>
  </div>
</div>

<!-- ========================================== PÁGINA 13: MÁQUINAS, EQUIPOS Y HERRAMIENTAS ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 11.5px; padding: 6px 10px; margin-bottom: 10px;">
      MÁQUINAS, EQUIPOS, HERRAMIENTAS Y MATERIALES (LISTAR LO UTILIZADO)
    </div>

    <table class="data-table table-navy-header" style="font-size: 8.5px;">
      <thead>
        <tr>
          <th style="width: 20%;">CATEGORÍA</th>
          <th style="width: 22%;">ELEMENTO / MATERIAL</th>
          <th style="width: 28%;">ESPECIFICACIONES / CARACTERÍSTICAS</th>
          <th style="width: 30%;">FUNCIÓN EN EL PROCESO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: bold;">Equipo principal</td>
          <td>Estación de trabajo Laptop / PC</td>
          <td>Procesador Intel Core i7 / AMD Ryzen, 16 GB RAM, SSD NVMe 512 GB, SO Windows 11 64-bit</td>
          <td>Desarrollo de software, compilación del instalador y ejecución de pruebas de estrés.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Software de desarrollo</td>
          <td>Visual Studio Code v1.9x</td>
          <td>IDE profesional con plugins de TypeScript, Tailwind CSS IntelliSense y ESLint</td>
          <td>Entorno principal de edición de código fuente y depuración de componentes.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Tecnología / lenguaje</td>
          <td>TypeScript 5.x / JavaScript ES2022</td>
          <td>Tipado estático riguroso, interfaces de datos y contratos de integridad</td>
          <td>Codificación de la lógica transaccional, cálculo de hashes y modelos de datos.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Tecnología / framework</td>
          <td>React 18 + Vite</td>
          <td>Arquitectura basada en componentes reactivos con renderizado ultrarrápido</td>
          <td>Construcción de la interfaz gráfica adaptativa por roles y modales interactivos.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Control de versiones</td>
          <td>Git 2.x & GitHub</td>
          <td>Control de versiones distribuido, ramas de trabajo y trazabilidad de commits</td>
          <td>Gestión del historial de cambios y resguardo seguro del código fuente.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Línea de comandos</td>
          <td>Windows PowerShell 7</td>
          <td>Shell de automatización de tareas y scripts de validación de entorno</td>
          <td>Ejecución de pipelines de compilación, empaquetado y suites de pruebas automatizadas.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Herramienta de empaquetado</td>
          <td>Inno Setup Compiler 6.x</td>
          <td>Compilador de instaladores para Windows con scripts de directivas Pascal</td>
          <td>Creación del archivo ejecutable instalable que preserva la base SQLite en actualizaciones.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Herramienta de prueba</td>
          <td>Node.js Test Runner & Jest</td>
          <td>Framework de pruebas automatizadas con aislamiento de procesos</td>
          <td>Verificación del ciclo de vida del instalador y pruebas de regresión offline.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Material digital</td>
          <td>Normativa MINEDU / R.D. 0124-1983-ED</td>
          <td>Directivas ministeriales para CETPROs y catálogo de títulos y formatos oficiales</td>
          <td>Alineación de los módulos documentales a las directivas oficiales vigentes.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Recurso del sistema</td>
          <td>Motor SQLite 3 / IndexedDB</td>
          <td>Bases de datos locales transaccionales ACID con soporte de cifrado y hashes</td>
          <td>Almacenamiento persistente y autónomo de expedientes, notas y asistencias.</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Recurso del sistema</td>
          <td>Runtime Electron 44.x</td>
          <td>Framework para aplicaciones de escritorio nativas multiplataforma</td>
          <td>Contenedor de escritorio Windows que otorga acceso a recursos locales de forma aislada.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 13</span>
  </div>
</div>

<!-- ========================================== PÁGINA 14: SEGURIDAD, HIGIENE Y AMBIENTAL ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 11px; padding: 5px 8px; margin-bottom: 6px;">
      SEGURIDAD E HIGIENE INDUSTRIAL / AMBIENTAL (ATS, CHARLA SST / SGA)
    </div>

    <p style="font-size: 8.5px;"><strong>Revisión previa del puesto:</strong> Se verificó el orden y limpieza del área de desarrollo técnico, distribución adecuada de cables para evitar tropiezos, ventilación natural y estabilidad del soporte de la computadora portátil.</p>
    <p style="font-size: 8.5px;"><strong>Riesgos identificados:</strong> Fatiga ocular por tiempo prolongado frente a pantalla, sobrecarga en tomacorrientes, malas posturas ergonómicas y riesgo de pérdida accidental de información por cortes eléctricos.</p>
    
    <ul style="font-size: 8.5px; margin: 2px 0 4px 14px;">
      <li>Aplicación estricta de la regla 20-20-20 (descansar la vista cada 20 minutos enfocando a distancia).</li>
      <li>Uso de iluminación ambiental adecuada y activación de filtros de luz azul en los monitores.</li>
      <li>Mantenimiento de postura con espalda recta y apoyo lumbar a 90 grados en silla regulable.</li>
      <li>Realización de pausas activas breves cada 2 horas para ejercicios de estiramiento y relajación muscular.</li>
      <li>Generación de respaldos continuos con verificación de hash SHA-256 para evitar pérdida de datos.</li>
    </ul>

    <p style="font-size: 8.5px;"><strong>Charla de cinco minutos (SST):</strong> <em>«Prevención de riesgos ergonómicos, síndrome del túnel carpiano e higiene postural en jornadas prolongadas de desarrollo de software.»</em></p>
    <p style="font-size: 8.5px;"><strong>Sistema de Gestión Ambiental (SGA):</strong> Se redujo al 100% el uso de papel en pruebas gracias a la validación digital en visores integrados; se implementaron políticas de ahorro energético con suspensión automática de pantallas y apagado de periféricos al finalizar la jornada.</p>

    <div class="section-title" style="margin-top: 4px;">Resultados de la ejecución de la tarea / Recomendaciones</div>
    <p style="font-size: 8.5px;"><strong>Resultados de la ejecución:</strong> Se cumplió exitosamente con el objetivo trazado: el sistema cuenta con respaldo cifrado inviolable, resolución de concurrencia y un instalador para Windows que preserva la base de datos intacta. Las pruebas de ciclo de vida confirmaron que la base SQLite conserva el 100% de registros en cualquier actualización.</p>

    <p style="font-size: 8.5px;"><strong>Recomendaciones para la operatividad continua:</strong></p>
    <ul style="font-size: 8.5px; margin: 2px 0 4px 14px;">
      <li>Programar la exportación del respaldo cifrado al término de cada semana lectiva hacia una unidad de almacenamiento externa.</li>
      <li>No manipular directamente el archivo <code>cetpro.sqlite</code> en el explorador de archivos mientras la aplicación se encuentre en ejecución.</li>
      <li>Verificar siempre el hash SHA-256 en la ventana de inspección previa antes de restaurar un archivo de respaldo.</li>
      <li>Mantener actualizado el sistema operativo Windows para contar con los últimos parches de seguridad.</li>
      <li>Efectuar pruebas semestrales de restauración en un equipo alternativo para certificar la vigencia de los respaldos.</li>
    </ul>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 14</span>
  </div>
</div>

<!-- ========================================== PÁGINA 15: ESQUEMA / DIAGRAMA ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div class="navy-banner" style="font-size: 13px; padding: 7px 12px; margin-bottom: 12px;">
      HACER ESQUEMA, DIBUJO O DIAGRAMA
    </div>

    <div style="font-size: 10px; font-weight: bold; color: #002b66; text-align: center; margin-bottom: 8px;">
      DIAGRAMA DE ARQUITECTURA OFFLINE-FIRST, SEGURIDAD CRIPTOGRÁFICA Y EMPAQUETADO DESKTOP
    </div>

    <div style="border: 1.5px solid #002b66; border-radius: 6px; padding: 15px; background: #fafbfc; margin: 10px 0; text-align: center;">
      <!-- Diagrama SVG Profesional incrustado -->
      <svg width="600" height="420" viewBox="0 0 600 420" style="max-width: 100%; height: auto; font-family: Arial, sans-serif;">
        <!-- Fondo suave -->
        <rect x="5" y="5" width="590" height="410" rx="8" fill="#ffffff" stroke="#c0d0e0" stroke-width="1.5"/>
        
        <!-- Bloque 1: Frontend Electron -->
        <rect x="25" y="25" width="250" height="100" rx="6" fill="#eef5fc" stroke="#0050b3" stroke-width="2"/>
        <text x="150" y="48" font-size="12" font-weight="bold" fill="#002b66" text-anchor="middle">1. APLICACIÓN DESKTOP (ELECTRON + REACT)</text>
        <text x="150" y="68" font-size="9.5" fill="#333" text-anchor="middle">• Control de Roles RBAC (Director / Secretaría / Docente)</text>
        <text x="150" y="84" font-size="9.5" fill="#333" text-anchor="middle">• Asistente de Configuración Inicial (Primer Arranque)</text>
        <text x="150" y="100" font-size="9.5" fill="#333" text-anchor="middle">• Interfaz de Sincronización y Respaldo</text>

        <!-- Flecha 1 a 2 -->
        <line x1="275" y1="75" x2="325" y2="75" stroke="#002b66" stroke-width="2" marker-end="url(#arrow)"/>
        
        <!-- Bloque 2: Criptografía y Hash -->
        <rect x="325" y="25" width="250" height="100" rx="6" fill="#f0faf4" stroke="#1b7a43" stroke-width="2"/>
        <text x="450" y="48" font-size="12" font-weight="bold" fill="#0d5229" text-anchor="middle">2. MOTOR DE SEGURIDAD CRIPTOGRÁFICA</text>
        <text x="450" y="68" font-size="9.5" fill="#333" text-anchor="middle">• Generación de Sellos Hash SHA-256 Inmutables</text>
        <text x="450" y="84" font-size="9.5" fill="#333" text-anchor="middle">• Cifrado AES con Contraseña Institucional</text>
        <text x="450" y="100" font-size="9.5" fill="#333" text-anchor="middle">• Preflight de Validación antes de Sobreescritura</text>

        <!-- Flecha hacia abajo -->
        <line x1="450" y1="125" x2="450" y2="165" stroke="#002b66" stroke-width="2"/>
        
        <!-- Bloque 3: Sincronización y 409 -->
        <rect x="325" y="165" width="250" height="100" rx="6" fill="#fef8eb" stroke="#d48806" stroke-width="2"/>
        <text x="450" y="188" font-size="12" font-weight="bold" fill="#ad6800" text-anchor="middle">3. SINCRONIZACIÓN Y CONFLICTOS HTTP 409</text>
        <text x="450" y="208" font-size="9.5" fill="#333" text-anchor="middle">• Intercambio de Paquetes P2P Offline</text>
        <text x="450" y="224" font-size="9.5" fill="#333" text-anchor="middle">• Comparación de Versiones y Marcas de Tiempo</text>
        <text x="450" y="240" font-size="9.5" fill="#333" text-anchor="middle">• Resolución Granular Guiada en Pantalla</text>

        <!-- Flecha a izquierda -->
        <line x1="325" y1="215" x2="275" y2="215" stroke="#002b66" stroke-width="2"/>

        <!-- Bloque 4: Base SQLite Persistente -->
        <rect x="25" y="165" width="250" height="100" rx="6" fill="#fdf2f2" stroke="#cf1322" stroke-width="2"/>
        <text x="150" y="188" font-size="12" font-weight="bold" fill="#a8071a" text-anchor="middle">4. ALMACENAMIENTO LOCAL SQLite 3</text>
        <text x="150" y="208" font-size="9.5" fill="#333" text-anchor="middle">• Operación 100% Offline-First en Windows</text>
        <text x="150" y="224" font-size="9.5" fill="#333" text-anchor="middle">• Ubicación Protegida en Directorio %APPDATA%</text>
        <text x="150" y="240" font-size="9.5" fill="#333" text-anchor="middle">• Integridad Transaccional ACID y Esquema V2</text>

        <!-- Flecha a Bloque 5 -->
        <line x1="150" y1="265" x2="150" y2="300" stroke="#002b66" stroke-width="2"/>

        <!-- Bloque 5: Instalador Inno Setup -->
        <rect x="25" y="300" width="550" height="95" rx="6" fill="#f6f0fd" stroke="#722ed1" stroke-width="2"/>
        <text x="300" y="325" font-size="13" font-weight="bold" fill="#391085" text-anchor="middle">5. COMPILACIÓN Y DESPLIEGUE FINAL (INNO SETUP COMPILER)</text>
        <text x="300" y="348" font-size="10" fill="#333" text-anchor="middle">• Script <code>installer.iss</code> con directivas de actualización segura</text>
        <text x="300" y="365" font-size="10" fill="#333" text-anchor="middle">• Aislamiento total: La desinstalación o reinstalación conserva la base <code>cetpro.sqlite</code></text>
        <text x="300" y="382" font-size="10" font-weight="bold" fill="#002b66" text-anchor="middle">GARANTÍA DE CERO PÉRDIDA DE EXPEDIENTES Y OPERACIÓN AUTÓNOMA</text>
      </svg>
    </div>

    <div style="font-size: 8.5px; color: #555; text-align: center; font-style: italic;">
      Figura del Proceso. Flujo arquitectónico del sistema desktop mostrando la interacción entre interfaz, hashing criptográfico, resolución de concurrencia y despliegue del instalador.
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 15</span>
  </div>
</div>

<!-- ========================================== PÁGINA 16: EVALUACIÓN Y FIRMAS ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <table class="data-table table-navy-header" style="font-size: 11px; margin-bottom: 25px;">
      <thead>
        <tr>
          <th style="width: 75%; text-align: left; padding: 10px;">EVALUACIÓN DEL INFORME POR EL INSTRUCTOR</th>
          <th style="width: 25%; text-align: center; padding: 10px;">NOTA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="height: 45px; vertical-align: middle; padding: 10px; font-size: 10px; color: #555;">
            Cumplimiento de objetivos técnicos, calidad de redacción técnica, fundamentación del proceso y verificación de evidencias visuales.
          </td>
          <td style="text-align: center; font-size: 18px; font-weight: bold; color: #002b66;">&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <div class="navy-banner" style="font-size: 11px; padding: 6px 10px; text-align: left; margin-bottom: 0;">
      OBSERVACIONES Y RECOMENDACIONES DEL MONITOR DE EMPRESA:
    </div>

    <div style="border: 1px solid #b0c0d0; height: 100mm; padding: 15px; font-size: 9.5px; line-height: 2; color: #333; background: #fdfdfd;">
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
      <div style="border-bottom: 1px solid #e0e0e0; height: 25px;"></div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 45px; padding: 0 30px;">
      <div style="width: 42%; text-align: center; border-top: 1.5px solid #002b66; padding-top: 8px;">
        <div style="font-size: 10px; font-weight: bold; color: #002b66;">FIRMA DEL ESTUDIANTE</div>
        <div style="font-size: 8.5px; color: #444; margin-top: 2px;">GUZMAN JORDAN, GONSALO<br>ID: 001499194</div>
      </div>
      <div style="width: 42%; text-align: center; border-top: 1.5px solid #002b66; padding-top: 8px;">
        <div style="font-size: 10px; font-weight: bold; color: #002b66;">FIRMA DEL MONITOR DE EMPRESA</div>
        <div style="font-size: 8.5px; color: #444; margin-top: 2px;">CETPRO PÚBLICO MICAELA BASTIDAS<br>Sello y Firma Institucional</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 16</span>
  </div>
</div>

<!-- ========================================== PÁGINA 17: NOTAS COMPLEMENTARIAS ========================================== -->
<div class="page">
  <div>
    <div class="header">
      <div class="logo-senati"><span class="logo-badge">S</span> SENATI</div>
      <div class="header-right">FORMACIÓN PROFESIONAL DUAL</div>
    </div>

    <div style="border: 1px solid #b0c0d0; height: 180mm; padding: 20px; background: #fff; border-radius: 4px;">
      <div style="font-size: 10.5px; font-weight: bold; color: #002b66; margin-bottom: 8px;">REGISTRO DE OBSERVACIONES Y SEGUIMIENTO INSTITUCIONAL</div>
      <p style="font-size: 9.5px; line-height: 1.6; color: #555;">Espacio destinado para anotaciones adicionales del Instructor de SENATI o Coordinación Académica durante las visitas de supervisión de formación práctica en empresa.</p>
    </div>
  </div>

  <div class="footer">
    <span>SENATI · Informe de Formación Práctica en Empresa</span>
    <span>Página 17</span>
  </div>
</div>

<!-- ========================================== PÁGINA 18: CONTRAPORTADA ========================================== -->
<div class="page" style="justify-content: center; align-items: center; text-align: center;">
  <div style="max-width: 140mm;">
    <div class="logo-senati" style="font-size: 34px; justify-content: center; margin-bottom: 25px;">
      <span class="logo-badge" style="font-size: 22px; padding: 4px 12px;">S</span> SENATI
    </div>
    <div style="width: 80mm; height: 2px; background: #002b66; margin: 0 auto 25px auto;"></div>
    <div style="font-size: 11px; font-weight: bold; color: #333; line-height: 1.6; letter-spacing: 0.5px;">
      PROPIEDAD INTELECTUAL DE SENATI. PROHIBIDA SU REPRODUCCIÓN Y VENTA SIN LA AUTORIZACIÓN CORRESPONDIENTE
    </div>
  </div>
</div>

</body>
</html>
`;

const htmlPath = path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML generado exitosamente en:', htmlPath);

// Compilar a PDF con Puppeteer utilizando el Chrome o Edge local del sistema
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
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  const pdfPath = path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();
  console.log('PDF oficial compilado exitosamente en:', pdfPath);
}

compilePDF().catch(err => {
  console.error('Error compilando PDF:', err);
});
