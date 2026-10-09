const { OfflineCore } = require('../scripts/offline-core.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const core = new OfflineCore('private-data');
const director = core.users().find(u => u.role === 'DIRECTOR');

const testGroups = [
  { gid: 'GRP-BD-004', prog: 'MECÁNICA AUTOMOTRIZ', mod: 'M1', unit: 'UD2' },
  { gid: 'GRP-BD-004-M2', prog: 'MECÁNICA AUTOMOTRIZ', mod: 'M2', unit: 'UD2' },
  { gid: 'GRP-BD-005', prog: 'MECÁNICA DE MOTOS', mod: 'M1', unit: 'UD1' },
  { gid: 'GRP-BD-005-M2', prog: 'MECÁNICA DE MOTOS', mod: 'M2', unit: 'UD3' },
  { gid: 'GRP-BD-006', prog: 'CARPINTERÍA METÁLICA', mod: 'M1', unit: 'UD2' },
  { gid: 'GRP-BD-006-M2', prog: 'CARPINTERÍA METÁLICA', mod: 'M2', unit: 'UD2' },
  { gid: 'GRP-BD-001', prog: 'PELUQUERÍA Y BARBERÍA', mod: 'M1', unit: 'UD2' },
  { gid: 'GRP-BD-001-M2', prog: 'PELUQUERÍA Y BARBERÍA', mod: 'M2', unit: 'UD4' },
  { gid: 'GRP-BD-007', prog: 'COMPUTACIÓN E INFORMÁTICA', mod: 'M1', unit: 'UD2' },
  { gid: 'GRP-BD-007-M2', prog: 'COMPUTACIÓN E INFORMÁTICA', mod: 'M2', unit: 'UD2' },
  { gid: 'GRP-BD-009', prog: 'CORTE Y ENSAMBLAJE', mod: 'M1', unit: 'UD1' },
  { gid: 'GRP-BD-009-M2', prog: 'CORTE Y ENSAMBLAJE', mod: 'M2', unit: 'UD3' },
  { gid: 'GRP-BD-012', prog: 'SISTEMAS ELÉCTRICOS', mod: 'M1', unit: 'UD3' },
  { gid: 'GRP-BD-012-M2', prog: 'SISTEMAS ELÉCTRICOS', mod: 'M2', unit: 'UD1' }
];

async function run() {
  console.log('=== TEST 1: MODO ORDINARIO (REAL) ===');
  for (const item of testGroups) {
    const doc = core.document(director, { groupId: item.gid, templateId: 'TMPL-06', unit: item.unit, demoFill: false });
    console.log(`[${item.prog} - ${item.mod}] ${item.unit} -> Nombre: "${doc.unitData?.name || 'N/A'}" | Fechas: ${doc.academicDates.length} | Preflight: ${doc.preflight.filled}/${doc.preflight.total}`);
  }

  console.log('\n=== TEST 2: MODO DEMOSTRACIÓN (SIMULACIÓN COMPLETA) ===');
  for (const item of testGroups) {
    const doc = core.document(director, { groupId: item.gid, templateId: 'TMPL-06', unit: item.unit, demoFill: true });
    console.log(`[${item.prog} - ${item.mod}] ${item.unit} -> Nombre: "${doc.unitData?.name}" | Rango: ${doc.unitData?.fechaInicio} a ${doc.unitData?.fechaFin} | Fechas: ${doc.academicDates.length} | Alumnos: ${doc.students.length} | Marcas: ${doc.attendance.length} | Preflight: ${doc.preflight.complete ? '100% OK' : 'INCOMPLETO'}`);
    
    // Probar render físico de PDF
    const pdfBytes = await renderPDF(root, doc, director);
    if (!pdfBytes || pdfBytes.length < 50000) {
      throw new Error(`Fallo en render PDF para ${item.gid} ${item.unit}`);
    }
  }
  console.log('\n>>> TODOS LOS 14 GRUPOS Y 7 CARRERAS RENDERIZARON PDF VÁLIDO CON ÉXITO! <<<');
}

run().catch(e => { console.error(e); process.exit(1); });
