import fs from 'fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function audit() {
  const namesStr = fs.readFileSync('scratch/unique_names.json', 'utf8');
  const studentNames = JSON.parse(namesStr);
  
  if (studentNames.length !== 269) {
    throw new Error(`Expected 269 students, found ${studentNames.length}`);
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const maxFontSize = 8;
  const minFontSizeLimit = 5.5;
  const boxWidth = 180.13;
  const paddingX = 2;
  const availableWidth = boxWidth - (2 * paddingX);

  let fitsAt8 = 0;
  let requiresLess8 = 0;
  let requiresLess7 = 0;
  let requiresLess6 = 0;
  let failsAt55 = 0;
  
  let worstStudent = null;
  let minRequiredSize = 8;
  
  const fails = [];

  studentNames.forEach(fullName => {
    
    let currentSize = maxFontSize;
    let requiredSize = maxFontSize;
    let fits = false;

    // find required size
    while (currentSize >= 0) {
      const textWidth = font.widthOfTextAtSize(fullName, currentSize);
      if (textWidth <= availableWidth) {
        requiredSize = currentSize;
        fits = true;
        break;
      }
      currentSize -= 0.1;
    }

    const requiredFixed = Number(requiredSize.toFixed(1));

    if (requiredFixed === 8) {
      fitsAt8++;
    } else {
      requiresLess8++;
      if (requiredFixed < 7) requiresLess7++;
      if (requiredFixed < 6) requiresLess6++;
      if (requiredFixed < minFontSizeLimit) {
        failsAt55++;
        fails.push(fullName);
      }
    }

    if (requiredFixed < minRequiredSize) {
      minRequiredSize = requiredFixed;
      worstStudent = fullName;
    }
  });

  const report = {
    worstStudent,
    minRequiredSize,
    fitsAt8,
    requiresLess8,
    requiresLess7,
    requiresLess6,
    failsAt55,
    failsList: fails
  };

  fs.writeFileSync('scratch/audit_names.json', JSON.stringify(report, null, 2));
  console.log('Auditoria completada.');
  console.table(report);
}

audit().catch(console.error);
