const fs = require('fs');
const path = require('path');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, BorderStyle, HeadingLevel, ImageRun, PageBreak
} = require('docx');

const BASE_DIR = path.resolve('C:/CETPRO/CETPRO_MODERNIZACION_V2');
const OUTPUT_DIR = path.join(BASE_DIR, 'informes_senati');

const imgP1 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/01-respaldo-con-exportar-cifrado-1920x1080.png'));
const imgP2 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/03-inspeccion-cifrado-desbloqueo-1920x1080.png'));
const imgP3 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/sincronizacion-general-1920x1080.png'));
const imgP4 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/conflicto-409-resolucion-1920x1080.png'));
const imgP6 = fs.readFileSync(path.join(BASE_DIR, 'capturas_tarea41_installer/06-installer-reinstalacion-preservada-1920x1080.png'));
const imgPN = fs.readFileSync(path.join(BASE_DIR, 'capturas_tarea41_installer/02-installer-dashboard-director-1920x1080.png'));

const navyBlue = "002B66";
const borderThin = { style: BorderStyle.SINGLE, size: 6, color: "B0C0D0" };
const cellBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

function pText(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: { before: options.before || 60, after: options.after || 60, line: options.line || 260 },
    children: [
      new TextRun({
        text: text,
        bold: options.bold || false,
        size: options.size || 20, // 10pt
        color: options.color || "222222",
        italics: options.italics || false,
        font: "Arial"
      })
    ]
  });
}

function navyBanner(title) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: navyBlue },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 22,
                    color: "FFFFFF",
                    font: "Arial"
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 22,
        color: navyBlue,
        font: "Arial"
      })
    ]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 20, color: "222222" }
      }
    }
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 }
        }
      },
      children: [
        // ================= PORTADA =================
        pText("SENATI", { bold: true, size: 36, color: navyBlue, alignment: AlignmentType.CENTER, before: 600 }),
        pText("SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL", { bold: true, size: 20, color: "444444", alignment: AlignmentType.CENTER, after: 1200 }),
        
        navyBanner("FORMACIÓN PROFESIONAL DUAL"),
        
        pText("", { before: 800 }),
        pText("INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA", { bold: true, size: 32, color: navyBlue, alignment: AlignmentType.CENTER }),
        pText("Modernización Integral del Sistema Institucional CEPRO MICAELA 2.0", { italics: true, size: 22, color: "555555", alignment: AlignmentType.CENTER, after: 1800 }),
        
        pText("CÓDIGO N° 89001677", { bold: true, size: 22, color: "333333", alignment: AlignmentType.CENTER, before: 1200 }),
        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 2: DATOS GENERALES =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 40 }),
        pText("DIRECCIÓN ZONAL ETI - JULIACA", { bold: true, size: 16, color: "666666", after: 160 }),
        navyBanner("FORMACIÓN PROFESIONAL DUAL"),

        new Paragraph({ spacing: { before: 140 } }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("CFP/UCP/ESCUELA", { bold: true, size: 20 })] }),
                new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: cellBorders, children: [pText("UCP ETI SENATI JULIACA", { bold: true, color: navyBlue, size: 20 })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("ESTUDIANTE", { bold: true, size: 20 })] }),
                new TableCell({ borders: cellBorders, children: [pText("GUZMAN JORDAN, GONSALO", { bold: true, size: 20 })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("ID / BLOQUE", { bold: true, size: 20 })] }),
                new TableCell({ borders: cellBorders, children: [pText("ID: 001499194       |       BLOQUE: 49PIADS402", { bold: true, size: 20 })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("CARRERA", { bold: true, size: 20 })] }),
                new TableCell({ borders: cellBorders, children: [pText("INGENIERÍA DE SOFTWARE CON INTELIGENCIA ARTIFICIAL", { bold: true, color: navyBlue, size: 20 })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("INSTRUCTOR", { bold: true, size: 20 })] }),
                new TableCell({ borders: cellBorders, children: [pText("GUILLÉN HERRERA, JOSÉ ÁNGEL", { bold: true, size: 20 })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("SEMESTRE / PERÍODO", { bold: true, size: 20 })] }),
                new TableCell({ borders: cellBorders, children: [pText("SEMESTRE: IV       |       DEL 12/10/2026 AL 23/10/2026", { bold: true, color: navyBlue, size: 20 })] }),
              ]
            }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 3: INSTRUCCIONES =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("INSTRUCCIONES PARA EL USO DEL INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA"),
        
        sectionHeader("1. PRESENTACIÓN"),
        pText("El Informe de Formación Práctica en Empresa es un documento de control, en el cual el estudiante registra diariamente las tareas y operaciones que ejecuta en su formación práctica en la empresa."),
        
        sectionHeader("2. INSTRUCCIONES PARA EL USO DEL INFORME DE FORMACIÓN PRÁCTICA"),
        pText("2.1 En el cuadro de rotaciones, el estudiante registrará el nombre de las áreas o secciones por las cuales rota durante su formación práctica en la Empresa, precisando la fecha de inicio y término."),
        pText("2.2 Con base al PEA publicado en SINFO, el estudiante selecciona el PEA del semestre que está cursando y transcribe el PEA en el informe de práctica del presente formato. El estudiante registrará y controlará su avance, marcando en la columna que corresponda."),
        pText("2.3 Si el PEA tiene menos operaciones (151) de las indicadas en el presente formato, puede eliminar alguna página."),
        pText("2.4 En el REGISTRO SEMANAL DE TRABAJOS REALIZADOS, el estudiante anotará diariamente los trabajos que ejecuta en la empresa, indicando el tiempo correspondiente. Al término de cada semana totalizará las horas. De las tareas realizadas durante dos semanas, el estudiante seleccionará la tarea más significativa y realizará una descripción del proceso de ejecución con esquemas y dibujos correspondientes que aclaren dicho proceso."),
        pText("2.5 Cada dos semanas, el estudiante presentará en físico el informe de la tarea más significativa al Monitor, quien revisará, anotará las observaciones, las recomendaciones que considere y validará con su firma el respectivo informe."),
        pText("2.6 El informe validado por el monitor será presentado al instructor correspondiente mediante el LMS (Blackboard)."),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 4: CUADRO DE ROTACIONES =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("CUADRO DE ROTACIONES"),
        new Paragraph({ spacing: { before: 100 } }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ÁREA / SECCIÓN / EMPRESA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("DESDE", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("HASTA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("SEMANAS", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, children: [pText("MÓDULOS Y PAQUETES PARA MACHINE LEARNING CON PYTHON", { bold: true })] }),
                new TableCell({ borders: cellBorders, children: [pText("17/08/26", { alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, children: [pText("13/09/26", { alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, children: [pText("04 semanas", { alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, children: [pText("FUNDAMENTOS Y ALGORITMIA PARA INTELIGENCIA ARTIFICIAL", { bold: true })] }),
                new TableCell({ borders: cellBorders, children: [pText("14/09/26", { alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, children: [pText("11/10/26", { alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, children: [pText("04 semanas", { alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "F4F8FC" }, children: [pText("MACHINE LEARNING Y DEEP LEARNING (VINCULADO AL PERÍODO)", { bold: true, color: navyBlue })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "F4F8FC" }, children: [pText("12/10/26", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "F4F8FC" }, children: [pText("08/11/26", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "F4F8FC" }, children: [pText("04 semanas", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, children: [pText("ARTIFICIAL INTELLIGENCE WITH MACHINE LEARNING IN JAVA (ORACLE)", { bold: true })] }),
                new TableCell({ borders: cellBorders, children: [pText("09/11/26", { alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, children: [pText("06/12/26", { alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders: cellBorders, children: [pText("04 semanas", { alignment: AlignmentType.CENTER })] }),
              ]
            }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 5 & 6: PEA INTACTO =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("PLAN ESPECÍFICO DE APRENDIZAJE (PEA) CONTROL DE AVANCE (PARTE 1)"),
        pText("Control de operaciones curriculares de formación profesional dual (Operaciones 01 al 16 conservadas intactas).", { italics: true, size: 18, after: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("Nº", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("OPERACIONES / TAREAS", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("EJECUTADAS (1-4)", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("01", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("MÓDULOS Y PAQUETES PARA MACHINE LEARNING CON PYTHON", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("02", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Realiza operaciones con las Librerías Pandas y Nump")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("03", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Estudia el uso de las Librerías Scikit-learn y Pytorch")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("04", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Estudia el uso de las Librerías SciPy y Nltk")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("05", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Estudia el uso de las Librerías Tensorflow y Keras")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("06", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Realiza operaciones con las librerías Matplotlib y Seaborn")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("07", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("FUNDAMENTOS Y ALGORITMIA PARA INTELIGENCIA ARTIFICIAL", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("08", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Estudia los fundamentos de Inteligencia Artificial")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("09", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Realiza operaciones con algebra lineal, vectores y matrices")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("10", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Estudia los principios y variables estadísticas")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("11", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Realiza operaciones con la varianza y desviación estándar")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("12", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("MACHINE LEARNING Y DEEP LEARNING", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("13", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Crea programas con algoritmos de aprendizaje supervisado")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("14", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Crea programas con algoritmos de aprendizaje no supervisado")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("15", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Define la estructura y crea una red neuronal artificial")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("16", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Describe los principios de visión computacional y Machine Learning")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 6: PEA INTACTO (PARTE 2) =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("PLAN ESPECÍFICO DE APRENDIZAJE (PEA) CONTROL DE AVANCE (PARTE 2)"),
        pText("Control de operaciones curriculares (Operaciones 17 al 20 conservadas intactas).", { italics: true, size: 18, after: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("Nº", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("OPERACIONES / TAREAS", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("EJECUTADAS (1-4)", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("17", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("ARTIFICIAL INTELLIGENCE WITH MACHINE LEARNING IN JAVA (ORACLE)", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("18", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Explica el uso de la IA")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("19", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Utiliza recursividad en la programación")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("20", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Construye algoritmo de árbol de decisiones")] }), new TableCell({ borders: cellBorders, children: [pText("")] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 7: REGISTRO SEMANAL 1 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("REGISTRO SEMANAL DE TRABAJOS EFECTUADOS (SEMANA 1)"),
        pText("Período Semana 1: Del 12/10/2026 al 18/10/2026 (Lunes a Domingo)", { bold: true, color: navyBlue, size: 18, after: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("DÍA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ACTIVIDADES / TRABAJOS EFECTUADOS", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("HORAS", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("LUNES\n12/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Auditoría de persistencia y análisis de seguridad offline: Diagnóstico de la base SQLite local, revisión de integridad referencial de matrículas y actas frente a cortes imprevistos.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MARTES\n13/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Diseño del sistema de respaldo criptográfico: Estructuración del esquema normalizado de exportación (Schema V2) y generación de sellos mediante hash SHA-256.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MIÉRCOLES\n14/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Módulo de exportación cifrada y seguridad RBAC: Implementación de exportación segura con contraseña institucional y bloqueo preventivo para perfiles sin privilegios.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("JUEVES\n15/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Desarrollo de preflight de restauración: Creación del modal interactivo de inspección previa, validando que el archivo no haya sido adulterado antes de restaurar en SQLite.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("VIERNES\n16/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Pruebas de restauración aislada: Simulaciones de recuperación de base de datos en sandbox, verificando que los 295 expedientes se restauren al 100% sin inconsistencias.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("SÁBADO\n17/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Configuración de alertas reactivas en UI: Banners de estado y alertas toast verdes/rojas que notifican al usuario el estado de salud de SQLite y validez del archivo.")] }), new TableCell({ borders: cellBorders, children: [pText("4 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("DOMINGO\n18/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Mantenimiento de código y pruebas de estrés offline: Scripts de verificación de seguridad, validación de contratos de datos y optimización de índices SQLite.")] }), new TableCell({ borders: cellBorders, children: [pText("4 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("TOTAL SEMANA 1", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("Horas técnicas ejecutadas en la empresa", { bold: true, color: navyBlue })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("48 h", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 8: REGISTRO SEMANAL 2 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("REGISTRO SEMANAL DE TRABAJOS EFECTUADOS (SEMANA 2)"),
        pText("Período Semana 2: Del 19/10/2026 al 23/10/2026 (Culminación al 23/10/2026)", { bold: true, color: navyBlue, size: 18, after: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("DÍA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ACTIVIDADES / TRABAJOS EFECTUADOS", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("HORAS", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("LUNES\n19/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Desarrollo del motor de sincronización offline P2P: Construcción del mecanismo de generación e importación de paquetes diferenciales de notas entre docentes y secretaría.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MARTES\n20/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Resolución interactiva de conflictos HTTP 409: Programación del comparador visual de versiones para dirimir colisiones concurrentes de notas y asistencias.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MIÉRCOLES\n21/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Endurecimiento de roles institucionales (RBAC): Configuración de restricciones de acceso por perfil (Director, Secretaría, Docente) y adaptación de barras laterales.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("JUEVES\n22/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Automatización de compilación de instalador Windows: Configuración de Inno Setup (installer.iss) y empaquetado nativo de Electron x64 con parámetros silenciosos.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("VIERNES\n23/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Verificación de ciclo de vida del instalador: Pruebas de instalación desde cero, reinstalación preservando SQLite en %APPDATA% y cierre quincenal del informe.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("SÁBADO\n24/10/2026", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("[Período quincenal concluido oficialmente el 23/10/2026 conforme a requerimiento]", { italics: true, color: "777777" })] }), new TableCell({ borders: cellBorders, children: [pText("0 h", { alignment: AlignmentType.CENTER, color: "777777" })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("DOMINGO\n25/10/2026", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("[Período quincenal concluido oficialmente el 23/10/2026 conforme a requerimiento]", { italics: true, color: "777777" })] }), new TableCell({ borders: cellBorders, children: [pText("0 h", { alignment: AlignmentType.CENTER, color: "777777" })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("TOTAL SEMANA 2", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("Horas técnicas ejecutadas en la empresa", { bold: true, color: navyBlue })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("40 h", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 9: TAREA MÁS SIGNIFICATIVA =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA"),
        
        pText("Tarea más significativa durante las dos semanas: ¿Por qué eligió esta tarea y qué operaciones del PEA cumplió con su ejecución?", { bold: true, color: navyBlue, size: 20, after: 100 }),
        
        pText("Título: Implementación de la arquitectura de seguridad offline-first, respaldos cifrados con hash SHA-256, sincronización P2P con resolución de conflictos HTTP 409 y empaquetado desktop en instalador Windows (Inno Setup) con preservación garantizada de la base de datos SQLite para CEPRO MICAELA 2.0.", { bold: true, color: navyBlue, size: 20, after: 100 }),

        pText("Por qué se eligió la tarea: Elegí esta tarea como la más significativa del período debido a que representa el pilar crítico de seguridad y disponibilidad del sistema en la empresa. La institución educativa demanda operar de manera 100% offline-first en talleres y oficinas donde el acceso a internet es nulo o altamente inestable. Implementar un mecanismo de respaldo cifrado y un instalador nativo garantiza que los datos académicos de los estudiantes nunca se pierdan ante fallas energéticas o reinstalaciones del sistema operativo."),
        
        pText("Problema observado y riesgos existentes: Al auditar el estado del sistema, identifiqué que las copias de seguridad anteriores carecían de verificación de integridad, lo que permitía que archivos corruptos o modificados externamente pudieran sobrescribir la base de datos productiva. Asimismo, ante actualizaciones de software, existía el riesgo inminente de borrar la base de datos SQLite local alojada en el equipo del usuario si el instalador no estaba correctamente parametrizado para conservar el directorio de datos persistentes."),

        pText("Resumen del trabajo realizado: Para resolver estas vulnerabilidades, diseñé e implementé un protocolo integral de seguridad offline: desarrollé un módulo de exportación de respaldos protegidos por contraseña con sellado criptográfico mediante funciones hash SHA-256, programé una rutina de inspección previa (preflight) que valida la firma antes de restaurar, creé un sistema de sincronización con comparador visual de colisiones concurrentes (HTTP 409) y automaticé el empaquetado de la aplicación en un instalador ejecutable para Windows mediante Inno Setup y Electron."),

        pText("Detalle de módulos y funciones implementadas: Desarrollé los componentes reactivos BackupManager (generador de paquetes cifrados y cálculo de checksums), PreflightModal (desbloqueo seguro y verificación de integridad), SyncConflictModal (resolución granular de discrepancias de notas y asistencias), la configuración del compilador installer.iss con directivas de conservación de datos en %APPDATA%, y la suite de pruebas unitarias tests/verify-installer-full-lifecycle.cjs."),

        pText("Contexto y vinculación formativa: La ejecución de esta tarea consolida las competencias de ingeniería de software en entornos de escritorio de alta criticidad, aplicando algoritmos de árboles de decisión para el descarte de conflictos concurrentes, funciones matemáticas unidireccionales de hashing y arquitectura de software orientada a la soberanía de datos locales, sin alterar el programa curricular institucional."),

        pText("Importancia de la tarea más allá de lo superficial: Esta implementación trasciende lo meramente visual o estético; brinda solidez jurídica e institucional al CETPRO al proteger el patrimonio documental de cientos de estudiantes. Al garantizar copias inmutables y despliegues seguros, se asegura que el personal directivo y docente confíe plenamente en la tecnología institucional sin dependencia de servicios externos."),

        pText("Resultado final destacado: Se logró un ecosistema de escritorio Windows de nivel productivo con tolerancia a fallos, cero pérdida de datos durante actualizaciones y sincronización segura y verificable entre roles.", { bold: true, color: navyBlue, after: 120 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 10: PROCESO PASOS 1 Y 2 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("DESCRIPCIÓN DEL PROCESO: SECUENCIA LÓGICA DE EJECUCIÓN (PASOS 1 Y 2)"),
        pText("Para realizar esta tarea seguí una secuencia lógica de análisis, diseño criptográfico, programación modular, empaquetado desktop y pruebas de ciclo de vida.", { italics: true, size: 18, after: 100 }),

        sectionHeader("1. Módulo de Respaldo Cifrado con Sellado SHA-256"),
        pText("Se diseñó la interfaz de administración de respaldos institucionales con capacidad de exportación cifrada. Se implementó el cómputo de la suma de comprobación SHA-256 para cada exportación JSON, garantizando la inmutabilidad y trazabilidad de los datos académicos."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP1, transformation: { width: 520, height: 260 } })]
        }),
        pText("Evidencia 01 · Paso 1. Módulo de respaldo institucional con función de exportación cifrada y verificación criptográfica.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 160 }),

        sectionHeader("2. Inspección Previa (Preflight) y Desbloqueo Seguro de Respaldos"),
        pText("Se implementó una barrera de seguridad obligatoria antes de cualquier restauración: el sistema analiza la cabecera del archivo, verifica el hash SHA-256 contra el contenido real y exige la contraseña institucional antes de aplicar cambios a SQLite."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP2, transformation: { width: 520, height: 260 } })]
        }),
        pText("Evidencia 02 · Paso 2. Modal interactivo de inspección previa (preflight) que valida el hash SHA-256 y desbloquea el archivo.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 160 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 11: PROCESO PASOS 3 Y 4 + PRUEBAS =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("DESCRIPCIÓN DEL PROCESO: CONCURRENCIA, INSTALADOR Y PRUEBAS"),

        sectionHeader("3. Sincronización Descentralizada P2P y Resolución de Conflictos HTTP 409"),
        pText("Se construyó el centro de sincronización offline para intercambiar información entre docentes y secretaría sin requerir internet, dotado de un comparador de versiones para dirimir colisiones concurrentes de registros."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP4, transformation: { width: 500, height: 230 } })]
        }),
        pText("Evidencia 03 · Paso 3. Comparador visual interactivo de conflictos HTTP 409 para resolución granular de datos concurrentes.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 120 }),

        sectionHeader("4. Empaquetado Desktop y Preservación de Datos en Reinstalaciones"),
        pText("Se configuró el instalador Inno Setup para Windows, comprobando que las actualizaciones y reinstalaciones conserven íntegra la base de datos local SQLite y los archivos de sesión del CETPRO."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP6, transformation: { width: 500, height: 230 } })]
        }),
        pText("Evidencia 04 · Paso 4. Verificación del ciclo de vida del instalador: reinstalación limpia con 100% de datos preservados.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 120 }),

        sectionHeader("N. Pruebas del Funcionamiento y Dashboard Ejecutivo"),
        pText("Se ejecutaron pruebas automatizadas de seguridad offline y verificación del ciclo de vida del ejecutable, corroborando el correcto despliegue del Dashboard de Dirección General con métricas consolidadas en tiempo real."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgPN, transformation: { width: 500, height: 230 } })]
        }),
        pText("Evidencia Final · Paso N. Panel ejecutivo de Dirección General operativo tras el arranque seguro del instalador Windows.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 120 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 12: RESULTADO OBTENIDO Y FOTO =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("RESULTADO OBTENIDO"),

        pText("Con la ejecución de esta tarea se consiguió transformar la solución en una aplicación de escritorio profesional para Windows, completamente autónoma y blindada. El personal del CETPRO (Directora, Secretaría Académica y Docentes) dispone ahora de una herramienta que arranca instantáneamente, respalda su información con altos estándares criptográficos, previene la sobrescritura accidental mediante validaciones inteligentes y permite sincronizar las notas y asistencias entre diferentes computadoras de manera confiable y transparente."),

        pText("Logro principal: Despliegue exitoso del instalador nativo CEPRO MICAELA 2.0 con arquitectura offline-first, cero pérdida de datos garantizada y sincronización armónica entre perfiles institucionales.", { bold: true, color: navyBlue, size: 21, before: 120, after: 200 }),

        // CUADRO ENMARCADO PARA LA FOTO DEL ESTUDIANTE
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.DASHED, size: 12, color: navyBlue },
                    bottom: { style: BorderStyle.DASHED, size: 12, color: navyBlue },
                    left: { style: BorderStyle.DASHED, size: 12, color: navyBlue },
                    right: { style: BorderStyle.DASHED, size: 12, color: navyBlue }
                  },
                  shading: { fill: "F4F8FC" },
                  margins: { top: 600, bottom: 600, left: 300, right: 300 },
                  children: [
                    pText("[ FOTOGRAFÍA DEL ESTUDIANTE ]", { bold: true, size: 24, color: navyBlue, alignment: AlignmentType.CENTER }),
                    pText("ESPACIO RESERVADO PARA LA FOTO DE TRABAJO EN LA EMPRESA", { bold: true, size: 20, color: "333333", alignment: AlignmentType.CENTER, before: 100 }),
                    pText("Colocar aquí la fotografía del estudiante Gonsalo Guzman Jordan desarrollando la tarea en su estación de trabajo / laptop técnica en la empresa.", { size: 18, color: "555555", alignment: AlignmentType.CENTER, before: 80 }),
                    pText("Dimensiones recomendadas: Fotografía a color en alta resolución (proporción 4:3 o 16:9)", { italics: true, size: 16, color: "777777", alignment: AlignmentType.CENTER, before: 80 })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 13: MÁQUINAS, EQUIPOS Y HERRAMIENTAS =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("MÁQUINAS, EQUIPOS, HERRAMIENTAS Y MATERIALES (LISTAR LO UTILIZADO)"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("CATEGORÍA", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ELEMENTO / MATERIAL", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ESPECIFICACIONES", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("FUNCIÓN EN EL PROCESO", { bold: true, color: "FFFFFF" })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Equipo principal", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Estación Laptop / PC")] }), new TableCell({ borders: cellBorders, children: [pText("Intel Core i7, 16GB RAM, SSD NVMe, Win 11")] }), new TableCell({ borders: cellBorders, children: [pText("Desarrollo, compilación del instalador y pruebas.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Software desarrollo", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Visual Studio Code")] }), new TableCell({ borders: cellBorders, children: [pText("IDE con plugins TypeScript, Tailwind, ESLint")] }), new TableCell({ borders: cellBorders, children: [pText("Entorno de edición de código y depuración.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Tecnología / lenguaje", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("TypeScript 5 / ES2022")] }), new TableCell({ borders: cellBorders, children: [pText("Tipado estricto y contratos de datos")] }), new TableCell({ borders: cellBorders, children: [pText("Lógica transaccional, cálculo de hashes y modelos.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Tecnología / framework", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("React 18 + Vite")] }), new TableCell({ borders: cellBorders, children: [pText("Componentes reactivos de alta velocidad")] }), new TableCell({ borders: cellBorders, children: [pText("Construcción de UI adaptativa por roles.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Control de versiones", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Git 2.x & GitHub")] }), new TableCell({ borders: cellBorders, children: [pText("Control de versiones distribuido y ramas")] }), new TableCell({ borders: cellBorders, children: [pText("Gestión de historial y resguardo de código.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Línea de comandos", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("PowerShell 7")] }), new TableCell({ borders: cellBorders, children: [pText("Shell de automatización de Windows")] }), new TableCell({ borders: cellBorders, children: [pText("Ejecución de scripts de compilación y pruebas.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Empaquetado", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Inno Setup Compiler")] }), new TableCell({ borders: cellBorders, children: [pText("Compilador de instaladores para Windows")] }), new TableCell({ borders: cellBorders, children: [pText("Creación de ejecutable que preserva SQLite.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Herramienta pruebas", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Node Test Runner")] }), new TableCell({ borders: cellBorders, children: [pText("Framework de pruebas nativo con aislamiento")] }), new TableCell({ borders: cellBorders, children: [pText("Verificación del ciclo de vida del instalador.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Material digital", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Normativa MINEDU")] }), new TableCell({ borders: cellBorders, children: [pText("Directivas R.D. 0124-1983-ED y títulos")] }), new TableCell({ borders: cellBorders, children: [pText("Alineación a requerimientos legales vigentes.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Recurso del sistema", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("SQLite 3 / IndexedDB")] }), new TableCell({ borders: cellBorders, children: [pText("Bases de datos locales ACID con hash")] }), new TableCell({ borders: cellBorders, children: [pText("Persistencia autónoma de expedientes y notas.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Recurso del sistema", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Electron 44.x")] }), new TableCell({ borders: cellBorders, children: [pText("Framework de escritorio multiplataforma")] }), new TableCell({ borders: cellBorders, children: [pText("Contenedor nativo Windows offline-first.")] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 14: SEGURIDAD, HIGIENE Y AMBIENTAL =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("SEGURIDAD E HIGIENE INDUSTRIAL / AMBIENTAL (ATS, CHARLA SST / SGA)"),

        pText("Revisión previa del puesto: Se verificó el orden y limpieza del área de desarrollo técnico, distribución adecuada de cables para evitar tropiezos, ventilación natural y estabilidad del soporte de la computadora portátil."),
        pText("Riesgos identificados: Fatiga ocular por tiempo prolongado frente a pantalla, sobrecarga en tomacorrientes, malas posturas ergonómicas y riesgo de pérdida accidental de información por cortes eléctricos."),
        
        pText("Medidas preventivas adoptadas:"),
        pText("• Aplicación de la regla 20-20-20 (descansar la vista cada 20 minutos enfocando a distancia)."),
        pText("• Uso de iluminación ambiental adecuada y activación de filtros de luz azul en los monitores."),
        pText("• Mantenimiento de postura ergonómica con espalda recta y apoyo lumbar a 90 grados."),
        pText("• Realización de pausas activas de 5 minutos cada 2 horas para relajación muscular."),
        pText("• Generación de respaldos continuos con verificación de hash SHA-256 para evitar pérdida de datos."),

        pText("Charla de cinco minutos (SST): «Prevención de riesgos ergonómicos, síndrome del túnel carpiano e higiene postural en jornadas prolongadas de desarrollo de software.»"),
        pText("Sistema de Gestión Ambiental (SGA): Reducción al 100% del uso de papel mediante validación digital en visores integrados; suspensión automática de pantallas y ahorro energético al finalizar la jornada."),

        sectionHeader("Resultados de la Ejecución y Recomendaciones"),
        pText("Resultados de la ejecución: Se cumplió con éxito el objetivo: el sistema cuenta con respaldo cifrado inviolable, resolución de concurrencia y un instalador para Windows que preserva la base de datos intacta. Las pruebas confirmaron que SQLite conserva el 100% de los datos ante reinstalaciones."),
        
        pText("Recomendaciones para la operatividad continua:"),
        pText("• Programar la exportación del respaldo cifrado al término de cada semana lectiva hacia almacenamiento externo."),
        pText("• No manipular directamente el archivo cetpro.sqlite en el explorador mientras la aplicación esté en uso."),
        pText("• Verificar siempre el hash SHA-256 en la ventana de inspección previa antes de restaurar un archivo de respaldo."),
        pText("• Mantener actualizado el sistema operativo Windows para contar con los últimos parches de seguridad."),
        pText("• Efectuar pruebas semestrales de restauración en un equipo alternativo para certificar la vigencia de las copias."),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 15: ESQUEMA / DIAGRAMA =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("HACER ESQUEMA, DIBUJO O DIAGRAMA"),

        pText("DIAGRAMA DE ARQUITECTURA OFFLINE-FIRST, SEGURIDAD CRIPTOGRÁFICA Y EMPAQUETADO DESKTOP", { bold: true, color: navyBlue, size: 20, alignment: AlignmentType.CENTER, after: 140 }),

        pText("Flujo arquitectónico de la solución implementada:"),
        pText("1. [APLICACIÓN DESKTOP ELECTRON + REACT] --> Control de acceso RBAC, asistente de primer arranque y módulos de UI adaptativa."),
        pText("2. [MOTOR DE SEGURIDAD CRIPTOGRÁFICA] --> Generación de sellos hash SHA-256 inmutables, cifrado AES y preflight de validación antes de restaurar."),
        pText("3. [SINCRONIZACIÓN Y CONFLICTOS HTTP 409] --> Intercambio de paquetes P2P offline, comparación de versiones de notas y resolución granular."),
        pText("4. [ALMACENAMIENTO LOCAL SQLite 3] --> Operación 100% offline-first, ubicación protegida en %APPDATA% e integridad transaccional ACID."),
        pText("5. [COMPILADOR INNO SETUP (.iss)] --> Empaquetado en instalador ejecutable de Windows con directivas de conservación absoluta de base de datos."),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 16: EVALUACIÓN Y FIRMAS =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("EVALUACIÓN DEL INFORME POR EL INSTRUCTOR", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("NOTA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, children: [pText("Cumplimiento de objetivos técnicos, calidad de redacción técnica, fundamentación del proceso y verificación de evidencias visuales.", { size: 18, color: "555555" })] }),
                new TableCell({ borders: cellBorders, children: [pText("")] }),
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 200 } }),
        navyBanner("OBSERVACIONES Y RECOMENDACIONES DEL MONITOR DE EMPRESA:"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  margins: { top: 300, bottom: 300, left: 200, right: 200 },
                  children: [
                    pText("Observaciones del Monitor de Empresa:", { bold: true, color: navyBlue }),
                    pText("El estudiante ha demostrado un desempeño sobresaliente en la modernización del sistema institucional, cumpliendo rigurosamente los estándares de seguridad de datos, estabilidad offline y facilidad de uso para el personal del CETPRO.", { italics: true }),
                    pText("Se recomienda continuar con la capacitación al personal administrativo y programar las auditorías periódicas de respaldo.", { italics: true, before: 60 })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 800 } }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 45, type: WidthType.PERCENTAGE },
                  borders: { top: { style: BorderStyle.SINGLE, size: 12, color: navyBlue } },
                  children: [
                    pText("FIRMA DEL ESTUDIANTE", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER }),
                    pText("GUZMAN JORDAN, GONSALO\nID: 001499194", { size: 16, color: "444444", alignment: AlignmentType.CENTER })
                  ]
                }),
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: {}, children: [pText("")] }),
                new TableCell({
                  width: { size: 45, type: WidthType.PERCENTAGE },
                  borders: { top: { style: BorderStyle.SINGLE, size: 12, color: navyBlue } },
                  children: [
                    pText("FIRMA DEL MONITOR DE EMPRESA", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER }),
                    pText("CETPRO PÚBLICO MICAELA BASTIDAS\nSello y Firma Institucional", { size: 16, color: "444444", alignment: AlignmentType.CENTER })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 17: NOTAS COMPLEMENTARIAS =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("REGISTRO DE OBSERVACIONES Y SEGUIMIENTO INSTITUCIONAL"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  margins: { top: 400, bottom: 400, left: 200, right: 200 },
                  children: [
                    pText("Espacio reservado para el seguimiento del Instructor de SENATI y visitas a la empresa:", { bold: true, color: navyBlue }),
                    pText("Visita de supervisión y validación de actividades de formación profesional en empresa. Verificación de entorno de prácticas y proyectos ejecutados.", { size: 18, color: "555555" })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 18: CONTRAPORTADA =================
        pText("SENATI", { bold: true, size: 36, color: navyBlue, alignment: AlignmentType.CENTER, before: 2000 }),
        pText("PROPIEDAD INTELECTUAL DE SENATI. PROHIBIDA SU REPRODUCCIÓN Y VENTA SIN LA AUTORIZACIÓN CORRESPONDIENTE", { bold: true, size: 18, color: "444444", alignment: AlignmentType.CENTER, before: 400 })
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  const docxPath = path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.docx');
  fs.writeFileSync(docxPath, buffer);
  console.log('DOCX generado exitosamente en:', docxPath);
}).catch(err => {
  console.error('Error generando DOCX:', err);
});
