const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve('C:/CETPRO/CETPRO_MODERNIZACION_V2');
const htmlPath = path.join(BASE_DIR, 'informes_senati/INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html');
const docxScriptPath = path.join(BASE_DIR, 'scripts/build-senati-docx.cjs');

console.log('=== ACTUALIZANDO INFORME HTML & PDF ===');
let html = fs.readFileSync(htmlPath, 'utf8');

const oldHtmlRow = `        <tr>
          <td style="font-weight: bold; text-align: center;">JUEVES<br>22/10/2026</td>
          <td><strong>Automatización de compilación de instalador Windows:</strong> Configuré y parametricé el compilador Inno Setup (<code>installer.iss</code>) para el empaquetado de la aplicación de escritorio en Electron x64. Definí directivas de instalación silenciosa y aseguré que la ruta de almacenamiento <code>%APPDATA%/cepro-micaela-2.0</code> quede aislada del proceso de desinstalación.</td>
          <td style="text-align: center; font-weight: bold;">8 h</td>
        </tr>`;

const newHtmlRow = `        <tr style="background-color: #f0f5fa;">
          <td style="font-weight: bold; text-align: center; color: #002b66; border-left: 3.5px solid #002b66;">
            <u style="text-decoration: underline; text-decoration-color: #002b66; text-decoration-thickness: 1.5px;">JUEVES<br>22/10/2026</u>
          </td>
          <td style="padding: 6px 8px;">
            <u style="text-decoration: underline; text-decoration-color: #002b66; text-decoration-thickness: 1.5px; font-weight: 500;"><strong><u>Automatización de compilación de instalador Windows con preservación garantizada de SQLite y arquitectura de seguridad offline-first:</u></strong> Configuré y parametricé el compilador Inno Setup (<code>installer.iss</code>) para el empaquetado de la aplicación de escritorio en Electron x64. Definí directivas de instalación silenciosa y aseguré que la ruta de almacenamiento <code>%APPDATA%/cepro-micaela-2.0</code> quede aislada del proceso de desinstalación, preservando el 100% de la base de datos histórica con respaldos SHA-256 y sincronización P2P.</u>
            <div style="margin-top: 4px; font-size: 8.5px; font-weight: bold; color: #002b66;">
              <u style="text-decoration: underline; text-decoration-color: #002b66; text-decoration-thickness: 1.5px;">&bull; (&starf; TAREA M&Aacute;S SIGNIFICATIVA SELECCIONADA PARA EL PRESENTE INFORME T&Eacute;CNICO)</u>
            </div>
          </td>
          <td style="text-align: center; font-weight: bold; color: #002b66;">8 h</td>
        </tr>`;

if (html.includes(oldHtmlRow)) {
  html = html.replace(oldHtmlRow, newHtmlRow);
  console.log('✓ Fila de JUEVES 22/10 actualizada y subrayada en el cuadro Registro Semanal HTML.');
} else {
  console.log('Fila antigua no encontrada exactamente; verificando si ya fue modificada...');
}

const oldHtmlTitle = `    <div class="highlight-box" style="font-weight: bold; font-style: normal; color: #002b66; font-size: 9.2px; margin-bottom: 6px;">
      Título: Implementación de la arquitectura de seguridad offline-first, respaldos cifrados con hash SHA-256, sincronización P2P con resolución de conflictos HTTP 409 y empaquetado desktop en instalador Windows (Inno Setup) con preservación garantizada de la base de datos SQLite para CEPRO MICAELA 2.0.
    </div>`;

const newHtmlTitle = `    <div class="highlight-box" style="font-weight: bold; font-style: normal; color: #002b66; font-size: 9.2px; margin-bottom: 6px; border-left: 4px solid #002b66; background-color: #f0f5fa;">
      <u style="text-decoration: underline; text-decoration-color: #002b66; text-decoration-thickness: 1.5px;">TÍTULO DE LA TAREA SIGNIFICATIVA SELECCIONADA (SUBRAYADA EN EL REGISTRO SEMANAL):</u><br>
      Implementación de la arquitectura de seguridad offline-first, respaldos cifrados con hash SHA-256, sincronización P2P con resolución de conflictos HTTP 409 y empaquetado desktop en instalador Windows (Inno Setup) con preservación garantizada de la base de datos SQLite para CEPRO MICAELA 2.0.
      <div style="display: block; font-size: 8.5px; font-weight: normal; color: #002b66; margin-top: 3px;">
        <em>(Correspondiente a la tarea técnica subrayada en el Registro Semanal: Semana 2, Jueves 22/10/2026)</em>
      </div>
    </div>`;

if (html.includes(oldHtmlTitle)) {
  html = html.replace(oldHtmlTitle, newHtmlTitle);
  console.log('✓ Título en Página 9 HTML actualizado con referencia explícita a la tarea subrayada.');
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ HTML guardado en:', htmlPath);

console.log('\n=== ACTUALIZANDO SCRIPT DOCX ===');
let docxScript = fs.readFileSync(docxScriptPath, 'utf8');

// Ensure UnderlineType is imported
if (!docxScript.includes('UnderlineType')) {
  docxScript = docxScript.replace(
    "ImageRun, PageBreak\n} = require('docx');",
    "ImageRun, PageBreak, UnderlineType\n} = require('docx');"
  );
  console.log('✓ UnderlineType importado en build-senati-docx.cjs');
}

const oldDocxJuevesRow = `new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("JUEVES\\n22/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Automatización de compilación de instalador Windows: Configuré y parametricé el compilador Inno Setup (installer.iss) para el empaquetado de la aplicación de escritorio en Electron x64. Definí directivas de instalación silenciosa y aseguré que la ruta de almacenamiento %APPDATA%/cepro-micaela-2.0 quede aislada del proceso de desinstalación.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),`;

const newDocxJuevesRow = `new TableRow({ 
              children: [
                new TableCell({ 
                  borders: cellBorders, 
                  shading: { fill: "F0F5FA" },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 45, after: 45, line: 240 },
                      children: [
                        new TextRun({
                          text: "JUEVES\\n22/10/2026",
                          bold: true,
                          color: navyBlue,
                          font: "Arial",
                          size: 19,
                          underline: { type: UnderlineType.SINGLE, color: navyBlue }
                        })
                      ]
                    })
                  ] 
                }), 
                new TableCell({ 
                  borders: cellBorders, 
                  shading: { fill: "F0F5FA" },
                  children: [
                    new Paragraph({
                      spacing: { before: 45, after: 45, line: 240 },
                      children: [
                        new TextRun({
                          text: "Automatización de compilación de instalador Windows con preservación garantizada de SQLite y arquitectura de seguridad offline-first: ",
                          bold: true,
                          font: "Arial",
                          size: 19,
                          underline: { type: UnderlineType.SINGLE, color: navyBlue }
                        }),
                        new TextRun({
                          text: "Configuré y parametricé el compilador Inno Setup (installer.iss) para el empaquetado de la aplicación de escritorio en Electron x64. Definí directivas de instalación silenciosa y aseguré que la ruta de almacenamiento %APPDATA%/cepro-micaela-2.0 quede aislada del proceso de desinstalación, preservando el 100% de la base de datos histórica con respaldos SHA-256 y sincronización P2P.",
                          font: "Arial",
                          size: 19,
                          underline: { type: UnderlineType.SINGLE, color: navyBlue }
                        }),
                        new TextRun({
                          text: "\\n(★ TAREA MÁS SIGNIFICATIVA SELECCIONADA PARA EL PRESENTE INFORME TÉCNICO)",
                          bold: true,
                          color: navyBlue,
                          font: "Arial",
                          size: 18,
                          underline: { type: UnderlineType.SINGLE, color: navyBlue }
                        })
                      ]
                    })
                  ] 
                }), 
                new TableCell({ 
                  borders: cellBorders, 
                  shading: { fill: "F0F5FA" },
                  children: [pText("8 h", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] 
                })
              ] 
            }),`;

if (docxScript.includes(oldDocxJuevesRow)) {
  docxScript = docxScript.replace(oldDocxJuevesRow, newDocxJuevesRow);
  console.log('✓ Fila JUEVES en DOCX actualizada con subrayado nativo Word (UnderlineType.SINGLE).');
} else {
  console.log('Fila DOCX antigua no encontrada exactamente; verificando formato...');
}

const oldDocxTitle = `pText("Título: Implementación de la arquitectura de seguridad offline-first, respaldos cifrados con hash SHA-256, sincronización P2P con resolución de conflictos HTTP 409 y empaquetado desktop en instalador Windows (Inno Setup) con preservación garantizada de la base de datos SQLite para CEPRO MICAELA 2.0.", { bold: true, color: navyBlue, size: 19, after: 80 }),`;

const newDocxTitle = `new Paragraph({
          spacing: { before: 50, after: 80, line: 240 },
          children: [
            new TextRun({
              text: "Título de la Tarea Significativa Seleccionada (Subrayada en el Registro Semanal): ",
              bold: true,
              color: navyBlue,
              size: 19,
              font: "Arial",
              underline: { type: UnderlineType.SINGLE, color: navyBlue }
            }),
            new TextRun({
              text: "Implementación de la arquitectura de seguridad offline-first, respaldos cifrados con hash SHA-256, sincronización P2P con resolución de conflictos HTTP 409 y empaquetado desktop en instalador Windows (Inno Setup) con preservación garantizada de la base de datos SQLite para CEPRO MICAELA 2.0. ",
              bold: true,
              color: navyBlue,
              size: 19,
              font: "Arial"
            }),
            new TextRun({
              text: "(Seleccionada y subrayada en el Registro Semanal de Trabajos Efectuados: Semana 2, Jueves 22/10/2026)",
              italics: true,
              color: navyBlue,
              size: 17,
              font: "Arial"
            })
          ]
        }),`;

if (docxScript.includes(oldDocxTitle)) {
  docxScript = docxScript.replace(oldDocxTitle, newDocxTitle);
  console.log('✓ Título en Página 9 DOCX actualizado con subrayado y referencia cruzada.');
}

fs.writeFileSync(docxScriptPath, docxScript, 'utf8');
console.log('✓ Script DOCX guardado en:', docxScriptPath);
