const fs = require('fs');
const path = require('path');

const docxScriptPath = 'C:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/build-senati-docx.cjs';
let script = fs.readFileSync(docxScriptPath, 'utf8');

// 1. Add image definitions if not present
if (!script.includes('imgFoto1')) {
  const insertMarker = "const imgPN = fs.readFileSync(path.join(BASE_DIR, 'capturas_tarea41_installer/02-installer-dashboard-director-1920x1080.png'));";
  const newImages = `${insertMarker}
const imgFoto1 = fs.readFileSync(path.join(BASE_DIR, 'fotos_estudiante/foto1_operacion_sistema.jpg'));
const imgFoto2 = fs.readFileSync(path.join(BASE_DIR, 'fotos_estudiante/foto2_instalador_progreso.jpg'));
const imgFoto3 = fs.readFileSync(path.join(BASE_DIR, 'fotos_estudiante/foto3_instalador_finalizado.jpg'));`;

  script = script.replace(insertMarker, newImages);
  console.log('✓ Fotos del estudiante agregadas a la carga de imágenes en DOCX.');
}

// 2. Replace the photo placeholder table on Page 14
const oldTableStart = "// CUADRO ENMARCADO PARA LA FOTO DEL ESTUDIANTE";
const oldTableEnd = "new Paragraph({ children: [new PageBreak()] }),\n\n        // ================= PÁGINA 15: MÁQUINAS, EQUIPOS Y HERRAMIENTAS =================";

const idxStart = script.indexOf(oldTableStart);
const idxEnd = script.indexOf(oldTableEnd);

if (idxStart !== -1 && idxEnd !== -1) {
  const newPhotoTable = `// SECCIÓN FOTOGRÁFICA DEL ESTUDIANTE EN LA EMPRESA (3 FOTOGRAFÍAS REALES)
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 3,
                  borders: cellBorders,
                  shading: { fill: navyBlue },
                  margins: { top: 60, bottom: 60, left: 100, right: 100 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "ESPACIO DE EVIDENCIA FOTOGRÁFICA DEL ESTUDIANTE EN LA EMPRESA",
                          bold: true,
                          size: 19,
                          color: "FFFFFF",
                          font: "Arial"
                        }),
                        new TextRun({
                          text: "  |  GONSALO GUZMAN JORDAN (ID: 001499194)",
                          size: 17,
                          color: "E0E8F5",
                          font: "Arial"
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  borders: cellBorders,
                  margins: { top: 50, bottom: 50, left: 50, right: 50 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new ImageRun({ data: imgFoto2, transformation: { width: 175, height: 131 } })]
                    }),
                    pText("Foto 1: Extracción e Instalador\\nEjecución y extracción de binarios con Inno Setup en PC de escritorio.", {
                      size: 14,
                      alignment: AlignmentType.CENTER,
                      before: 30,
                      after: 20
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  borders: cellBorders,
                  margins: { top: 50, bottom: 50, left: 50, right: 50 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new ImageRun({ data: imgFoto3, transformation: { width: 175, height: 131 } })]
                    }),
                    pText("Foto 2: Despliegue Completado\\nVerificación de instalación de CEPRO MICAELA 2.0 y comprobación de accesos.", {
                      size: 14,
                      alignment: AlignmentType.CENTER,
                      before: 30,
                      after: 20
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  borders: cellBorders,
                  margins: { top: 50, bottom: 50, left: 50, right: 50 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new ImageRun({ data: imgFoto1, transformation: { width: 175, height: 131 } })]
                    }),
                    pText("Foto 3: Operación en Secretaría\\nValidación funcional de Secretaría Académica operando offline en SQLite.", {
                      size: 14,
                      alignment: AlignmentType.CENTER,
                      before: 30,
                      after: 20
                    })
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 3,
                  borders: cellBorders,
                  shading: { fill: "F0F5FA" },
                  margins: { top: 50, bottom: 50, left: 80, right: 80 },
                  children: [
                    pText("Constatación técnica presencial: Se certifica la presencia y participación activa del estudiante Gonsalo Guzman Jordan desarrollando presencialmente la tarea más significativa: compilación, empaquetado desktop y validación operativa en el CETPRO Micaela Bastidas.", {
                      bold: true,
                      size: 15,
                      color: navyBlue,
                      alignment: AlignmentType.LEFT
                    })
                  ]
                })
              ]
            })
          ]
        }),

        `;

  script = script.substring(0, idxStart) + newPhotoTable + script.substring(idxEnd);
  console.log('✓ Tabla de fotos del estudiante reemplazada en script DOCX.');
} else {
  console.error('No se encontraron los marcadores de la tabla en DOCX:', { idxStart, idxEnd });
}

fs.writeFileSync(docxScriptPath, script, 'utf8');
console.log('✓ Script build-senati-docx.cjs actualizado.');
