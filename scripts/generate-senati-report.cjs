const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, HeadingLevel, ImageRun } = require('docx');
const puppeteer = require('puppeteer');

const BASE_DIR = path.resolve('C:/CETPRO/CETPRO_MODERNIZACION_V2');
const OUTPUT_DIR = path.join(BASE_DIR, 'informes_senati');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Generando Informe SENATI en Word (.docx) y PDF...');
