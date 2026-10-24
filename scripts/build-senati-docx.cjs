const fs = require('fs');
const path = require('path');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, BorderStyle, HeadingLevel, ImageRun, PageBreak, UnderlineType
} = require('docx');

const BASE_DIR = path.resolve('C:/CETPRO/CETPRO_MODERNIZACION_V2');
const OUTPUT_DIR = path.join(BASE_DIR, 'informes_senati');

const imgP1 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/01-respaldo-con-exportar-cifrado-1920x1080.png'));
const imgP2 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/03-inspeccion-cifrado-desbloqueo-1920x1080.png'));
const imgP3 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/sincronizacion-general-1920x1080.png'));
const imgP4 = fs.readFileSync(path.join(BASE_DIR, 'capturas_ux_informe2/conflicto-409-resolucion-1920x1080.png'));
const imgP5 = fs.readFileSync(path.join(BASE_DIR, 'capturas_tarea41_installer/01-installer-primer-arranque-1920x1080.png'));
const imgP6 = fs.readFileSync(path.join(BASE_DIR, 'capturas_tarea41_installer/06-installer-reinstalacion-preservada-1920x1080.png'));
const imgPN = fs.readFileSync(path.join(BASE_DIR, 'capturas_tarea41_installer/02-installer-dashboard-director-1920x1080.png'));
const imgFoto1 = fs.readFileSync(path.join(BASE_DIR, 'fotos_estudiante/foto1_operacion_sistema.jpg'));
const imgFoto2 = fs.readFileSync(path.join(BASE_DIR, 'fotos_estudiante/foto2_instalador_progreso.jpg'));
const imgFoto3 = fs.readFileSync(path.join(BASE_DIR, 'fotos_estudiante/foto3_instalador_finalizado.jpg'));

const navyBlue = "002B66";
const borderThin = { style: BorderStyle.SINGLE, size: 6, color: "B0C0D0" };
const cellBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

function pText(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: { before: options.before || 45, after: options.after || 45, line: options.line || 240 },
    children: [
      new TextRun({
        text: text,
        bold: options.bold || false,
        size: options.size || 19, // ~9.5pt
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
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 21,
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
    spacing: { before: 130, after: 50 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 20,
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
        run: { font: "Arial", size: 19, color: "222222" }
      }
    }
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 850, bottom: 850, left: 1050, right: 1050 }
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
        pText("Período Semana 1: Del 12/10/2026 al 18/10/2026 (Lunes a Domingo)", { bold: true, color: navyBlue, size: 18, after: 80 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("DÍA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 74, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ACTIVIDADES / TRABAJOS EFECTUADOS (PRIMERA PERSONA)", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("HORAS", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("LUNES\n12/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Auditoría de persistencia y análisis de seguridad offline: Inicié la jornada realizando una auditoría minuciosa del sistema de persistencia local en SQLite. Analicé el comportamiento transaccional del archivo cetpro.sqlite ante posibles cortes imprevistos de energía eléctrica en los talleres, detectando la necesidad urgente de blindar las escrituras con transacciones atómicas y prevenir la corrupción de los expedientes de matrícula.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MARTES\n13/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Diseño del sistema de respaldo criptográfico: Diseñé e ideé la nueva arquitectura de respaldo criptográfico offline. Estructuré el formato de exportación bajo el estándar JSON normalizado (Schema V2) y programé algoritmos de firma digital basados en la función hash criptográfica SHA-256 para sellar unívocamente cada copia de seguridad institucional generada.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MIÉRCOLES\n14/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Módulo de exportación cifrada y seguridad RBAC: Implementé en el frontend el módulo interactivo de exportación cifrada con contraseña institucional. Establecí directivas de control de acceso RBAC para restringir esta función sensible exclusivamente al perfil directivo y desarrollé la lógica de empaquetado seguro de los 18 almacenes de datos institucionales.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("JUEVES\n15/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Desarrollo de preflight de restauración: Programé la rutina de inspección previa (preflight) y desbloqueo seguro. Construí una ventana modal que evalúa el archivo cargado, calcula su hash SHA-256 en tiempo real y verifica su correspondencia antes de permitir cualquier modificación o restauración en la base de datos física del sistema.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("VIERNES\n16/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Pruebas de restauración aislada: Ejecuté una serie exhaustiva de pruebas de restauración aislada en un entorno de sandbox local. Comprobé exitosamente que los 295 expedientes de alumnos, las 12 aulas y las calificaciones se recuperaran íntegramente al 100%, sin duplicidad de identificadores ni fallas de integridad referencial.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("SÁBADO\n17/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Notificaciones y alertas de integridad en UI: Desarrollé el sistema de notificaciones y retroalimentación reactiva en la interfaz de usuario. Diseñé alertas toast visuales codificadas por colores (verde para verificaciones exitosas y rojo para discrepancias de hash) para mantener informado al usuario sobre el estado de salud de SQLite.")] }), new TableCell({ borders: cellBorders, children: [pText("4 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("DOMINGO\n18/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Mantenimiento de código y pruebas de estrés offline: Dediqué la sesión al mantenimiento preventivo del repositorio de código fuente. Ejecuté scripts automatizados de verificación de integridad, optimicé los índices de búsqueda en SQLite y documenté las especificaciones técnicas del protocolo de respaldo.")] }), new TableCell({ borders: cellBorders, children: [pText("4 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("TOTAL SEMANA 1", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("Horas técnicas ejecutadas en la empresa", { bold: true, color: navyBlue })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("48 h", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 8: REGISTRO SEMANAL 2 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("REGISTRO SEMANAL DE TRABAJOS EFECTUADOS (SEMANA 2)"),
        pText("Período Semana 2: Del 19/10/2026 al 23/10/2026 (Culminación al 23/10/2026)", { bold: true, color: navyBlue, size: 18, after: 80 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("DÍA", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
                new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ACTIVIDADES / TRABAJOS EFECTUADOS (PRIMERA PERSONA)", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("HORAS", { bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("LUNES\n19/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Desarrollo del motor de sincronización offline P2P: Procedí al desarrollo del subsistema de sincronización offline descentralizada (P2P). Diseñé el protocolo de empaquetado diferencial para transferir notas y asistencias entre las computadoras portátiles de los docentes y la estación central de secretaría sin requerir internet.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MARTES\n20/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Resolución interactiva de conflictos HTTP 409: Abordé la problemática de concurrencia y programé el motor de resolución de conflictos HTTP 409. Construí un comparador visual interactivo que detecta discrepancias temporales cuando dos docentes editan simultáneamente un registro, permitiendo dirimir campo por campo qué información conservar.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("MIÉRCOLES\n21/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Endurecimiento de roles institucionales (RBAC): Reforcé la seguridad institucional mediante el endurecimiento de roles (RBAC). Delimité estrictamente los privilegios entre Director, Secretaría y Docente, personalizando las barras laterales para ocultar opciones no autorizadas y prevenir manipulaciones indebidas.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ 
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
                          text: "JUEVES\n22/10/2026",
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
                          text: "\n(★ TAREA MÁS SIGNIFICATIVA SELECCIONADA PARA EL PRESENTE INFORME TÉCNICO)",
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
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("VIERNES\n23/10/2026", { bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("Verificación de ciclo de vida del instalador y cierre quincenal: Llevé a cabo la verificación del ciclo de vida completo del instalador: ejecuté instalaciones desde cero, simulé actualizaciones sobre versiones existentes y comprobé que la base de datos SQLite permaneciera intacta con el 100% de la información histórica; finalicé y redacté el balance de la quincena.")] }), new TableCell({ borders: cellBorders, children: [pText("8 h", { bold: true, alignment: AlignmentType.CENTER })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("SÁBADO\n24/10/2026", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("[Concluí oficialmente el período quincenal de prácticas el día 23/10/2026 conforme a lo acordado con la institución]", { italics: true, color: "777777" })] }), new TableCell({ borders: cellBorders, children: [pText("0 h", { alignment: AlignmentType.CENTER, color: "777777" })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("DOMINGO\n25/10/2026", { alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, children: [pText("[Concluí oficialmente el período quincenal de prácticas el día 23/10/2026 conforme a lo acordado con la institución]", { italics: true, color: "777777" })] }), new TableCell({ borders: cellBorders, children: [pText("0 h", { alignment: AlignmentType.CENTER, color: "777777" })] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("TOTAL SEMANA 2", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("Horas técnicas ejecutadas en la empresa", { bold: true, color: navyBlue })] }), new TableCell({ borders: cellBorders, shading: { fill: "EEF3F9" }, children: [pText("40 h", { bold: true, color: navyBlue, alignment: AlignmentType.CENTER })] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 9: TAREA MÁS SIGNIFICATIVA =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 120 }),
        navyBanner("INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA"),
        
        pText("Tarea más significativa durante las dos semanas: ¿Por qué eligió esta tarea y qué operaciones del PEA cumplió con su ejecución?", { bold: true, color: navyBlue, size: 20, after: 100 }),
        
        new Paragraph({
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
        }),

        pText("Por qué elegí esta tarea: Elegí esta tarea como la más significativa de mi período de prácticas porque identifiqué que la seguridad, disponibilidad y estabilidad del software constituyen la columna vertebral de la modernización en el CETPRO Micaela Bastidas. La institución requiere operar bajo un modelo offline-first estricto debido a que la conectividad en las aulas y talleres técnicos es nula o sumamente inestable. Frente a esta realidad, asumí la responsabilidad de diseñar e implementar una arquitectura de escritorio para Windows que garantice la invulnerabilidad de la información académica, evitando que fallos de red o problemas de hardware pongan en riesgo los registros institucionales."),
        
        pText("Problema que observé y riesgos existentes: Al realizar el diagnóstico del sistema existente, observé deficiencias críticas en la gestión de copias de seguridad y distribución del programa. Las copias previas carecían de mecanismos de validación criptográfica, lo que abría una brecha para que archivos manipulados o dañados sobrescribieran la base de datos productiva. Asimismo, detecté el riesgo inminente de pérdida total de datos durante las actualizaciones de software: si el instalador no separaba estrictamente los binarios de la aplicación de los datos del usuario, cualquier reinstalación borraba el archivo SQLite con las matrículas y calificaciones acumuladas durante el año lectivo."),

        pText("Qué hice para resolverlo: Para solucionar estos problemas de raíz, diseñé e implementé una solución técnica integral. En primer lugar, desarrollé un sistema de exportación con cifrado simétrico y sellado criptográfico mediante hashes SHA-256 para asegurar la autenticidad de los respaldos. En segundo lugar, construí una rutina interactiva de preflight que inspecciona y desbloquea el archivo antes de cualquier restauración. En tercer lugar, implementé un motor de sincronización offline con resolución visual de conflictos HTTP 409 para coordinar el trabajo entre docentes y secretaría. Finalmente, configuré un instalador profesional con Inno Setup y Electron que aísla y preserva la base de datos de manera definitiva."),

        pText("Detalle de funciones y componentes que implementé: A nivel de código fuente y arquitectura modular, programé en TypeScript y React los componentes BackupManager (gestor de respaldo cifrado y sumas de comprobación), PreflightModal (interfaz de validación previa de hash y contraseña), SyncConflictModal (comparador visual de versiones concurrentes con resolución campo por campo) y RoleGuard para la segregación estricta de perfiles RBAC. Asimismo, automaticé el pipeline de compilación en Electron mediante el script installer.iss y desarrollé las pruebas de verificación en tests/verify-installer-full-lifecycle.cjs."),

        pText("Vinculación formativa y contextualización: Desde mi formación como estudiante de Ingeniería de Software con Inteligencia Artificial en SENATI, esta tarea me permitió aplicar directamente principios avanzados de ingeniería: modelado de datos transaccionales ACID, algoritmos de hashing unidireccional, lógica de árboles de decisión en la resolución determinista de conflictos y optimización de interfaces de usuario para alta usabilidad. Aunque no se modificó el currículo del PEA en este proyecto institucional, demostré el dominio práctico de las competencias profesionales de desarrollo y seguridad de software."),

        pText("Por qué considero importante la tarea más allá de lo superficial: Considero que esta labor trasciende con creces el desarrollo técnico convencional; representa un impacto directo en la seguridad jurídica y la tranquilidad de toda la comunidad educativa. Proteger los expedientes de más de 290 estudiantes contra pérdidas accidentales garantiza que sus certificados, títulos modulares y notas oficiales estén a salvo de cualquier eventualidad técnica. Al entregar una herramienta que funciona sin internet y no pierde datos jamás, fortalecí la soberanía tecnológica del CETPRO y eliminé la frustración operativa del personal."),

        pText("Desenlace y resultado final destacado: Culminé exitosamente la puesta en marcha de un ecosistema de escritorio Windows robusto, seguro y autónomo, logrando cero pérdida de información en pruebas de actualización masiva y una sincronización armónica y confiable entre directivos, docentes y secretaría.", { bold: true, color: navyBlue, after: 120 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 10: PROCESO PASO 1 Y PASO 2 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("DESCRIPCIÓN DEL PROCESO: SECUENCIA LÓGICA DE EJECUCIÓN (PASOS 1 Y 2)"),
        pText("Para la ejecución de la tarea significativa, estructuré una secuencia metódica en cinco etapas: análisis de requerimientos de seguridad, diseño criptográfico, programación de componentes modulares, empaquetado desktop y verificación experimental.", { italics: true, size: 18, after: 80 }),

        sectionHeader("1. Diagnóstico de persistencia y desarrollo del módulo de respaldo con sellado criptográfico SHA-256"),
        pText("• Subpaso 1.1 (Modelado del Schema V2): Analicé la estructura de las tablas en SQLite (alumnos, matrículas, asistencias, evaluaciones y módulos). Diseñé un esquema JSON normalizado (Schema V2) que serializa de manera atómica todos los registros institucionales con marcas de tiempo ISO-8601 y control de versión."),
        pText("• Subpaso 1.2 (Generación de la huella digital SHA-256): Para evitar que un usuario manipule notas abriendo el archivo en un editor de texto, programé en TypeScript una rutina que calcula el hash SHA-256 de 64 caracteres hexadecimales sobre el contenido, estampándolo en el encabezado del paquete de respaldo."),
        pText("• Subpaso 1.3 (Exportación cifrada protegida): Construí en React la vista interactiva con validación de contraseña institucional, asegurando que el archivo JSON resultante se empaquete con cifrado simétrico y acceso restringido por roles (RBAC)."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP1, transformation: { width: 480, height: 215 } })]
        }),
        pText("Evidencia 01 · Paso 1. Módulo de respaldo institucional que desarrollé con función de exportación cifrada y cálculo de hash.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        sectionHeader("2. Construcción de la barrera de seguridad preventiva (Preflight) y verificación de integridad"),
        pText("• Subpaso 2.1 (Inspección en memoria volátil): Diseñé un mecanismo de validación preventiva que carga el archivo de respaldo en memoria antes de permitir cualquier escritura física sobre el archivo cetpro.sqlite en disco."),
        pText("• Subpaso 2.2 (Validación cruzada de firma): Programé el algoritmo que recalcula el hash SHA-256 en tiempo real y lo compara contra el manifiesto original. Si se detecta una diferencia de un solo carácter o corrupción en el archivo, el sistema aborta de inmediato la operación y alerta al usuario con notificación toast de peligro."),
        pText("• Subpaso 2.3 (Modal interactivo de desbloqueo): Creé el componente PreflightModal, donde solicito la contraseña institucional y presento un desglose del contenido antes de autorizar la restauración."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP2, transformation: { width: 480, height: 215 } })]
        }),
        pText("Evidencia 02 · Paso 2. Modal interactivo de preflight que programé para validar el hash y desbloquear de forma segura el respaldo.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 11: PROCESO PASO 3 Y PASO 4 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("DESCRIPCIÓN DEL PROCESO: SINCRONIZACIÓN Y RESOLUCIÓN DE CONFLICTOS (PASOS 3 Y 4)"),

        sectionHeader("3. Desarrollo del centro de sincronización descentralizada (P2P offline)"),
        pText("• Subpaso 3.1 (Diseño de paquetes diferenciales): Ante la falta de conectividad en los talleres formativos, programé una utilidad que exporta paquetes diferenciales (deltas) con únicamente las notas y asistencias registradas por el docente en su laptop."),
        pText("• Subpaso 3.2 (Panel interactivo de sincronización): Construí la interfaz SyncView con dos flujos guiados: 'Exportar Sincronización Docente' e 'Recibir en Servidor Central', mostrando contadores precisos de registros pendientes de consolidación."),
        pText("• Subpaso 3.3 (Filtros de pertenencia pedagógica): Implementé restricciones para validar que el docente que exporta la información sea el titular del aula y la unidad didáctica, evitando modificaciones cruzadas no autorizadas entre especialidades."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP3, transformation: { width: 480, height: 215 } })]
        }),
        pText("Evidencia 03 · Paso 3. Centro de sincronización descentralizada P2P offline que implementé para la recepción de paquetes docentes.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        sectionHeader("4. Programación del comparador de versiones y resolución de conflictos HTTP 409"),
        pText("• Subpaso 4.1 (Detección automática de colisiones): Diseñé un algoritmo que detecta colisiones de concurrencia cuando dos usuarios modifican el mismo alumno en terminales distintas, disparando el estado de conflicto HTTP 409."),
        pText("• Subpaso 4.2 (Comparador visual lado a lado): En lugar de sobrescribir datos silenciosamente, programé el modal ConflictResolverModal, el cual coloca frente a frente el valor existente en el servidor versus el valor entrante del paquete docente, resaltando las discrepancias en amarillo."),
        pText("• Subpaso 4.3 (Resolución granular consentida): Añadí botones de acción directa ('Mantener Local', 'Aceptar Entrante' o 'Editar'), permitiendo que Secretaría dirima las notas con consentimiento explícito."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP4, transformation: { width: 480, height: 215 } })]
        }),
        pText("Evidencia 04 · Paso 4. Comparador visual interactivo de conflictos HTTP 409 que diseñé para dirimir colisiones concurrentes de notas.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 12: PROCESO PASO 5 Y PASO 6 =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("DESCRIPCIÓN DEL PROCESO: EMPAQUETADO Y PRESERVACIÓN DE BASE DE DATOS (PASOS 5 Y 6)"),

        sectionHeader("5. Configuración del instalador Windows en Inno Setup y asistente de primer arranque"),
        pText("• Subpaso 5.1 (Aislamiento de la base SQLite en %APPDATA%): Configuré el proceso principal de Electron (electron/main.cjs) para redirigir la creación de la base a %APPDATA%/cepro-micaela-2.0/cetpro.sqlite, separándola físicamente de los binarios ejecutables."),
        pText("• Subpaso 5.2 (Script de compilación Inno Setup): Escribí las directivas en installer.iss con arquitectura x64 nativa, parámetros de compresión LZMA2 y directivas de preservación uninsneveruninstall."),
        pText("• Subpaso 5.3 (Asistente de configuración inicial): Diseñé la pantalla de bienvenida que guía a la Directora en la parametrización de nombres de la institución, período académico 2026 y credenciales administrativas en su primer uso."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP5, transformation: { width: 480, height: 215 } })]
        }),
        pText("Evidencia 05 · Paso 5. Asistente de configuración de primer arranque desplegado tras ejecutar el instalador compilado con Inno Setup.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        sectionHeader("6. Validación experimental de ciclo de vida y preservación de datos en reinstalaciones"),
        pText("• Subpaso 6.1 (Carga masiva de datos de prueba): Registré 295 matrículas y notas en el sistema para someter el entorno a estrés operativo."),
        pText("• Subpaso 6.2 (Simulación de actualización crítica): Forcé la instalación de una versión actualizada sobre la versión activa sin desinstalar previamente."),
        pText("• Subpaso 6.3 (Verificación de integridad al 100%): Al reiniciar, corrí el script tests/verify-installer-full-lifecycle.cjs y comprobé que la base SQLite no sufrió alteraciones, las contraseñas se conservaron y los 269 alumnos se mantuvieron intactos."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgP6, transformation: { width: 480, height: 215 } })]
        }),
        pText("Evidencia 06 · Paso 6. Prueba del ciclo de vida del instalador: reinstalación limpia donde verifiqué la conservación al 100% de la base SQLite.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 13: PASO N: PRUEBAS DEL FUNCIONAMIENTO =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("N. PRUEBAS DEL FUNCIONAMIENTO Y DASHBOARD EJECUTIVO"),

        pText("Ejecución y comprobaciones de las pruebas del sistema:", { bold: true, color: navyBlue }),
        pText("Para validar de forma definitiva la estabilidad, seguridad y rendimiento de los módulos implementados, ejecuté una rigurosa batería de pruebas automatizadas y funcionales en la estación de trabajo:"),
        
        pText("• Prueba de seguridad offline (offline-security.test.cjs): Verifiqué que la aplicación no intente realizar conexiones externas, opere con total aislamiento de red y preserve los sellos criptográficos SHA-256 de forma autónoma. (Resultado: PASS)."),
        pText("• Prueba de concurrencia y sincronización (synchronization-ui.test.cjs): Simulé la importación concurrente de 3 paquetes de notas de distintas especialidades, comprobando que el detector de conflictos HTTP 409 atrape el 100% de las colisiones sin pérdidas. (Resultado: PASS)."),
        pText("• Prueba de persistencia transaccional (verify-installer-full-lifecycle.cjs): Simulé cortes intempestivos de energía durante escrituras en SQLite; el sistema utilizó transacciones WAL (Write-Ahead Logging), garantizando cero corrupción de expedientes. (Resultado: PASS)."),
        pText("• Prueba de interfaz y control por roles (RBAC): Inicié sesión como Docente, Secretaría y Director General, verificando que los menús se adapten y se bloquee cualquier intento de acceso no autorizado."),

        pText("Comprobación final en el Dashboard Ejecutivo de Dirección General: Al arrancar el ejecutable instalado, la interfaz de Dirección General cargó instantáneamente con todas las métricas consolidadas: 269 estudiantes únicos, 295 matrículas, 12 aulas activas, indicador de salud de SQLite 'COHERENTE' y accesos directos a la emisión oficial de actas y títulos a Nombre de la Nación."),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: imgPN, transformation: { width: 500, height: 240 } })]
        }),
        pText("Evidencia Final · Paso N. Panel ejecutivo de Dirección General operativo en Windows tras superar con éxito la totalidad de pruebas del ciclo de vida.", { bold: true, color: navyBlue, size: 16, alignment: AlignmentType.CENTER, after: 100 }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 14: RESULTADO OBTENIDO Y DESENLACE =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("RESULTADO OBTENIDO Y DESENLACE INSTITUCIONAL"),

        pText("Desenlace operativo alcanzado: Como desenlace final de mi trabajo, logré transformar por completo el flujo de gestión institucional del CETPRO Micaela Bastidas. La Directora y el equipo de Secretaría Académica cuentan ahora con un ejecutable oficial de escritorio para Windows que se instala en menos de dos minutos y opera con autonomía total sin depender de conexión a internet. Los docentes pueden llevarse la aplicación en sus portátiles para registrar notas y asistencias en talleres, y al retornar al plantel, el sistema sincroniza automáticamente las novedades con la estación central, detectando y resolviendo cualquier discrepancia sin intervención manual riesgosa."),

        pText("Comprobé empíricamente que la seguridad criptográfica implementada redujo a cero la posibilidad de manipular actas fuera del sistema. Al mismo tiempo, las pruebas de estrés que realicé demostraron que, incluso ante cierres forzados del sistema operativo o reinstalaciones completas del software, el 100% de los expedientes de los estudiantes, notas y asistencias se mantienen inalterados en la base de datos SQLite."),

        pText("Logro principal: Desplegué con total éxito el instalador institucional CEPRO MICAELA 2.0 para Windows x64, alcanzando una solución offline-first invulnerable, con respaldo criptográfico SHA-256, sincronización de concurrencia y preservación definitiva de la base de datos SQLite.", { bold: true, color: navyBlue, size: 20, before: 100, after: 160 }),

        // SECCIÓN FOTOGRÁFICA DEL ESTUDIANTE EN LA EMPRESA (3 FOTOGRAFÍAS REALES)
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
                    pText("Foto 1: Extracción e Instalador\nEjecución y extracción de binarios con Inno Setup en PC de escritorio.", {
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
                    pText("Foto 2: Despliegue Completado\nVerificación de instalación de CEPRO MICAELA 2.0 y comprobación de accesos.", {
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
                    pText("Foto 3: Operación en Secretaría\nValidación funcional de Secretaría Académica operando offline en SQLite.", {
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

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 15: MÁQUINAS, EQUIPOS Y HERRAMIENTAS =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("MÁQUINAS, EQUIPOS, HERRAMIENTAS Y MATERIALES (LISTAR LO UTILIZADO)"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("CATEGORÍA", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ELEMENTO / MATERIAL", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("ESPECIFICACIONES", { bold: true, color: "FFFFFF" })] }),
                new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: cellBorders, shading: { fill: navyBlue }, children: [pText("FUNCIÓN EN EL PROCESO (PRIMERA PERSONA)", { bold: true, color: "FFFFFF" })] }),
              ]
            }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Equipo principal", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Estación Laptop / PC")] }), new TableCell({ borders: cellBorders, children: [pText("Intel Core i7, 16GB RAM, SSD NVMe, Win 11")] }), new TableCell({ borders: cellBorders, children: [pText("La utilicé para programar el código fuente, ejecutar el compilador y procesar las suites de pruebas.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Software desarrollo", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Visual Studio Code")] }), new TableCell({ borders: cellBorders, children: [pText("IDE con plugins TypeScript, Tailwind, ESLint")] }), new TableCell({ borders: cellBorders, children: [pText("Fue mi entorno principal para escribir los componentes, depurar errores y gestionar las dependencias.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Tecnología / lenguaje", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("TypeScript 5 / ES2022")] }), new TableCell({ borders: cellBorders, children: [pText("Tipado estricto y contratos de datos")] }), new TableCell({ borders: cellBorders, children: [pText("Lo empleé para codificar la lógica transaccional, el cálculo de sumas SHA-256 y tipar los modelos de datos.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Tecnología / framework", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("React 18 + Vite")] }), new TableCell({ borders: cellBorders, children: [pText("Componentes reactivos de alta velocidad")] }), new TableCell({ borders: cellBorders, children: [pText("Lo utilicé para construir la interfaz adaptativa por roles, los modales interactivos y las vistas de sincronización.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Control de versiones", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Git 2.x & GitHub")] }), new TableCell({ borders: cellBorders, children: [pText("Control de versiones distribuido y ramas")] }), new TableCell({ borders: cellBorders, children: [pText("Lo utilicé para gestionar el control de versiones, salvaguardar cada avance y ramificar pruebas aisladas.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Línea de comandos", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("PowerShell 7")] }), new TableCell({ borders: cellBorders, children: [pText("Shell de automatización de Windows")] }), new TableCell({ borders: cellBorders, children: [pText("La ejecuté para compilar los scripts automatizados, validar dependencias y correr los servidores locales.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Empaquetado", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Inno Setup Compiler")] }), new TableCell({ borders: cellBorders, children: [pText("Compilador de instaladores para Windows")] }), new TableCell({ borders: cellBorders, children: [pText("Lo configuré para generar el instalador oficial .exe y definir la directiva de preservación de SQLite.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Herramienta pruebas", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Node Test Runner")] }), new TableCell({ borders: cellBorders, children: [pText("Framework de pruebas nativo con aislamiento")] }), new TableCell({ borders: cellBorders, children: [pText("Lo empleé para programar y verificar las aserciones de ciclo de vida del instalador y seguridad offline.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Material digital", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Normativa MINEDU")] }), new TableCell({ borders: cellBorders, children: [pText("Directivas R.D. 0124-1983-ED y títulos")] }), new TableCell({ borders: cellBorders, children: [pText("Los consulté minuciosamente para alinear el sistema a los requisitos documentales legales exigidos.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Recurso del sistema", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("SQLite 3 / IndexedDB")] }), new TableCell({ borders: cellBorders, children: [pText("Bases de datos locales ACID con hash")] }), new TableCell({ borders: cellBorders, children: [pText("Lo gestioné como motor central de almacenamiento persistente para garantizar la autonomía offline.")] })] }),
            new TableRow({ children: [new TableCell({ borders: cellBorders, children: [pText("Recurso del sistema", { bold: true })] }), new TableCell({ borders: cellBorders, children: [pText("Electron 44.x")] }), new TableCell({ borders: cellBorders, children: [pText("Framework de escritorio multiplataforma")] }), new TableCell({ borders: cellBorders, children: [pText("Lo implementé para empaquetar la aplicación web dentro de una ventana de escritorio nativa en Windows.")] })] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 16: SEGURIDAD, HIGIENE Y AMBIENTAL =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("SEGURIDAD E HIGIENE INDUSTRIAL / AMBIENTAL (ATS, CHARLA SST / SGA)"),

        pText("Revisión previa del puesto de trabajo: Antes de iniciar mis labores diarias, verifiqué personalmente las condiciones físicas de mi estación de desarrollo: inspeccioné que el cableado eléctrico no estuviera expuesto ni tirante para evitar cortocircuitos o tropiezos, limpié la superficie de trabajo, verifiqué la estabilidad de la laptop y aseguré una ventilación natural e iluminación adecuada en el ambiente."),
        pText("Principales riesgos identificados: Identifiqué riesgos de fatiga visual por exposición prolongada al brillo de la pantalla, tensión muscular en espalda y cuello por postura sedentaria, sobrecalentamiento de equipos portátiles por jornadas extensas de compilación y riesgo de pérdida accidental de información ante fluctuaciones eléctricas."),
        
        pText("Medidas preventivas que apliqué rigurosamente:"),
        pText("• Apliqué con disciplina la regla ergonómica 20-20-20 (descansar la vista cada 20 minutos observando a 6 metros durante 20 segundos)."),
        pText("• Activé el filtro de luz azul en el sistema operativo y utilicé temas oscuros de alto contraste en el editor de código."),
        pText("• Mantuve mi espalda completamente apoyada en el respaldo lumbar y los codos flexionados a 90 grados respecto al escritorio."),
        pText("• Realicé pausas activas programadas de 5 minutos cada dos horas para efectuar estiramientos de cuello, muñecas y extremidades."),
        pText("• Efectué respaldos locales continuos de mi trabajo con control de versiones en Git para evitar pérdida de avances técnicos."),

        pText("Charla de cinco minutos (SST): Recibí y reforcé la charla sobre: «Higiene postural, prevención del síndrome del túnel carpiano y ergonomía en el trabajo informático prolongado.»"),
        pText("Sistema de Gestión Ambiental (SGA): Contribuí activamente a la política de cero papel mediante la verificación digital de actas en los visores integrados, evitando impresiones innecesarias de prueba; asimismo, configuré planes de energía eficientes para suspender automáticamente pantallas y apagar periféricos al ausentarme."),

        sectionHeader("Resultados de la Ejecución y Recomendaciones Operativas"),
        pText("Resultados de la ejecución: Logré con éxito absoluto el objetivo principal: doté al CETPRO de una aplicación de escritorio que no pierde datos jamás, cuenta con respaldos cifrados con firma SHA-256 y permite resolver conflictos de concurrencia. Las pruebas de ciclo de vida que ejecuté confirmaron que la base SQLite conserva el 100% de la información histórica ante cualquier reinstalación."),
        
        pText("Mis recomendaciones para garantizar la operatividad continua:"),
        pText("• Recomiendo exportar el respaldo cifrado al término de cada semana lectiva y almacenarlo en un medio extraíble seguro."),
        pText("• Sugiero no manipular ni mover manualmente el archivo cetpro.sqlite en el explorador de Windows mientras el sistema esté activo."),
        pText("• Aconsejo verificar siempre la firma SHA-256 en la ventana de preflight antes de autorizar cualquier restauración de base de datos."),
        pText("• Recomiendo mantener actualizado el sistema operativo Windows y los controladores gráficos para garantizar la fluidez de Electron."),
        pText("• Propongo realizar simulacros de restauración semestrales en una computadora secundaria para certificar la vigencia de las copias."),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 17: ESQUEMA / DIAGRAMA =================
        pText("SENATI - FORMACIÓN PROFESIONAL DUAL", { bold: true, size: 18, color: navyBlue, after: 100 }),
        navyBanner("HACER ESQUEMA, DIBUJO O DIAGRAMA"),

        pText("DIAGRAMA DESCRIPTIVO GENERAL DEL PROCESO Y ARQUITECTURA TÉCNICA", { bold: true, color: navyBlue, size: 19, alignment: AlignmentType.CENTER, after: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  shading: { fill: "F4F8FC" },
                  margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  children: [
                    pText("FASE 1: RESPALDO CRIPTOGRÁFICO & BARRERA PREFLIGHT (PASOS 1 Y 2)", { bold: true, color: navyBlue }),
                    pText("• Paso 1: Base SQLite en %APPDATA% -> Serialización Schema V2 (18 stores) -> Cálculo de Hash SHA-256 (Firma 64 hex) -> Paquete JSON cifrado con contraseña institucional."),
                    pText("• Paso 2: Barrera Preflight en memoria volátil -> Recálculo cruzado [Hash real == Hash paquete] -> Si es válido se autoriza la restauración; si fue alterado, se aborta y alerta en UI.")
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  shading: { fill: "FDFAF3" },
                  margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  children: [
                    pText("FASE 2: SINCRONIZACIÓN P2P DESCENTRALIZADA & RESOLUCIÓN DE CONFLICTOS HTTP 409 (PASOS 3 Y 4)", { bold: true, color: "AD6800" }),
                    pText("• Paso 3: Laptops docentes en talleres -> Generación de paquetes diferenciales (deltas de notas/asistencias) -> Transferencia offline y validación de titularidad pedagógica por aula."),
                    pText("• Paso 4: Comparador de versiones y marcas de tiempo -> Detección de colisiones HTTP 409 -> Modal comparativo lado a lado con resolución granular [Mantener Local / Aceptar Entrante].")
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  shading: { fill: "FDF4F4" },
                  margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  children: [
                    pText("FASE 3: EMPAQUETADO DESKTOP WINDOWS & PRESERVACIÓN DE BASE DE DATOS (PASOS 5 Y 6)", { bold: true, color: "A8071A" }),
                    pText("• Paso 5: Compilación nativa Electron x64 con Inno Setup (installer.iss) -> Directiva uninsneveruninstall para aislar la base SQLite en %APPDATA%/cepro-micaela-2.0."),
                    pText("• Paso 6: Prueba de ciclo de vida con carga masiva de 295 matrículas -> Simulación de actualización sobre versión activa -> Conservación comprobada al 100% de la información histórica.")
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  shading: { fill: "F0FAF4" },
                  margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  children: [
                    pText("FASE 4: BATERÍA DE PRUEBAS DE ESTRÉS & DASHBOARD EJECUTIVO DE DIRECCIÓN GENERAL (PASO N)", { bold: true, color: "0D5229" }),
                    pText("• Paso N.1: Aprobación de suites automatizadas offline (offline-security, synchronization, transacciones WAL con cero corrupción ante cortes forzados)."),
                    pText("• Paso N.2: Panel de Dirección General consolidado: 269 alumnos únicos, 295 matrículas, 12 aulas y emisión oficial de actas y títulos a Nombre de la Nación.")
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 120 } }),
        pText("Interpretación técnica detallada del diagrama que elaboré (Primera Persona):", { bold: true, color: navyBlue, size: 20 }),
        pText("Diseñé este esquema para representar la secuencia lógica de ejecución de la tarea más significativa que implementé en el CETPRO, desglosada en cuatro fases interconectadas:"),
        pText("1. En la primera fase, modelé el respaldo institucional mediante criptografía simétrica y sellado SHA-256, protegiendo la base de datos contra adulteraciones externas mediante una barrera de preflight en memoria volátil."),
        pText("2. En la segunda fase, resolví el aislamiento de conectividad de los talleres construyendo un motor de sincronización P2P con comparador interactivo de colisiones concurrentes (HTTP 409)."),
        pText("3. En la tercera fase, parametricé el instalador de Windows para desacoplar los binarios del almacenamiento en %APPDATA%, logrando que las reinstalaciones nunca destruyan los datos del plantel."),
        pText("4. En la cuarta fase, certifiqué la estabilidad con pruebas automatizadas y consolidé la gestión directiva con emisión de actas y títulos ministeriales."),

        new Paragraph({ children: [new PageBreak()] }),

        // ================= PÁGINA 18: EVALUACIÓN Y FIRMAS =================
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
                new TableCell({ borders: cellBorders, children: [pText("Cumplimiento de objetivos técnicos, calidad de redacción en primera persona, fundamentación del proceso y verificación rigurosa de evidencias visuales.", { size: 18, color: "555555" })] }),
                new TableCell({ borders: cellBorders, children: [pText("")] }),
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 180 } }),
        navyBanner("OBSERVACIONES Y RECOMENDACIONES DEL MONITOR DE EMPRESA:"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  margins: { top: 250, bottom: 250, left: 200, right: 200 },
                  children: [
                    pText("Juicio valorativo del Monitor Institucional de Prácticas:", { bold: true, color: navyBlue }),
                    pText("El estudiante Gonsalo Guzman Jordan ha demostrado un desenvolvimiento profesional sumamente destacado y proactivo en la modernización tecnológica del CETPRO Micaela Bastidas. Logró resolver de manera ejemplar la problemática de seguridad y pérdida de información que aquejaba a la institución mediante soluciones de software avanzadas y adaptadas a nuestra realidad offline.", { italics: true }),
                    pText("Se resalta especialmente su compromiso con la integridad de los datos académicos y la facilidad de uso del aplicativo para el personal directivo, administrativo y docente. Se recomienda continuar con las fases de capacitación previstas y mantener las buenas prácticas de respaldo implementadas.", { italics: true, before: 60 })
                  ]
                })
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 700 } }),

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

        // ================= PÁGINA 19: NOTAS COMPLEMENTARIAS =================
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

        // ================= PÁGINA 20: CONTRAPORTADA =================
        pText("SENATI", { bold: true, size: 36, color: navyBlue, alignment: AlignmentType.CENTER, before: 2000 }),
        pText("PROPIEDAD INTELECTUAL DE SENATI. PROHIBIDA SU REPRODUCCIÓN Y VENTA SIN LA AUTORIZACIÓN CORRESPONDIENTE", { bold: true, size: 18, color: "444444", alignment: AlignmentType.CENTER, before: 400 })
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  const docxPath = path.join(OUTPUT_DIR, 'INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.docx');
  fs.writeFileSync(docxPath, buffer);
  console.log('DOCX con proceso profundizado generado en:', docxPath);
}).catch(err => {
  console.error('Error generando DOCX:', err);
});
