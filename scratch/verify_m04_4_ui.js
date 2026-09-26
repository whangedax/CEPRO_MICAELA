import { STAGING_DATA } from '../app/js/data/staging-data.js';
import { parseNameParts, parseExcelDate } from '../app/js/services/productive-import-service.js';
import { escapeHtml, StudentsView } from '../app/js/ui/students-view.js';

console.log('=== VERIFICACIÓN DE INTEGRIDAD Y PRUEBA VISUAL UI M04.4 ===\n');

// 1. Reconstruir los 269 estudiantes según algoritmo M04.3
const docGroupMap = new Map();
const emptyDocRows = [];

STAGING_DATA.forEach(r => {
  const doc = (r.numeroDocumentoOriginal || '').trim();
  if (doc) {
    if (!docGroupMap.has(doc)) docGroupMap.set(doc, []);
    docGroupMap.get(doc).push(r);
  } else {
    emptyDocRows.push(r);
  }
});

const students = [];
let idx = 1;

docGroupMap.forEach((rows, doc) => {
  rows.sort((a, b) => a.filaOrigen - b.filaOrigen);
  const primaryRow = rows[0];
  const nameParts = parseNameParts(primaryRow.nombreCompletoOriginal);
  const nameVariants = Array.from(new Set(rows.map(r => r.nombreCompletoOriginal.trim())));
  const studentId = `EST-IMP-BD-${String(idx).padStart(3, '0')}`;
  idx++;

  students.push({
    id: studentId,
    idEstudiante: studentId,
    tipoDocumento: primaryRow.tipoDocumentoOriginal || 'DNI',
    numeroDocumento: doc,
    apellidoPaterno: nameParts.apellidoPaterno,
    apellidoMaterno: nameParts.apellidoMaterno,
    nombres: nameParts.nombres,
    nombresCompletoOriginal: primaryRow.nombreCompletoOriginal,
    variantesNombreOriginales: nameVariants,
    sexo: (primaryRow.sexoOriginal || 'M').toUpperCase().startsWith('H') ? 'H' : 'M',
    fechaNacimiento: parseExcelDate(primaryRow.fechaNacimientoOriginal),
    estado: 'ACTIVO',
    fuente: 'IMPORTACION_BD',
    observaciones: `Importado de BD.zip (${rows.length} apariciones en fuente)`,
    stagingCount: rows.length
  });
});

emptyDocRows.forEach(r => {
  const nameParts = parseNameParts(r.nombreCompletoOriginal);
  const studentId = `EST-IMP-BD-NODOC-${String(idx).padStart(3, '0')}`;
  idx++;

  students.push({
    id: studentId,
    idEstudiante: studentId,
    tipoDocumento: 'PENDIENTE',
    numeroDocumento: '',
    apellidoPaterno: nameParts.apellidoPaterno,
    apellidoMaterno: nameParts.apellidoMaterno,
    nombres: nameParts.nombres,
    nombresCompletoOriginal: r.nombreCompletoOriginal,
    variantesNombreOriginales: [r.nombreCompletoOriginal],
    sexo: (r.sexoOriginal || 'M').toUpperCase().startsWith('H') ? 'H' : 'M',
    fechaNacimiento: parseExcelDate(r.fechaNacimientoOriginal),
    estado: 'ACTIVO',
    fuente: 'IMPORTACION_BD',
    observaciones: `Estudiante sin documento (${r.archivoOrigen} fila ${r.filaOrigen})`,
    stagingCount: 1
  });
});

console.log('A) Total estudiantes construidos:', students.length); // 269
console.log('   Estudiantes con DNI no vacío:', students.filter(s => s.numeroDocumento).length); // 267
console.log('   Estudiantes sin DNI (Pendiente):', students.filter(s => !s.numeroDocumento).length); // 2

// Test B: Búsqueda por documento
const searchDoc = students.filter(s => s.numeroDocumento.includes('01704242'));
console.log('B) Búsqueda por documento "01704242":', searchDoc.length, searchDoc[0]?.nombresCompletoOriginal);

// Test C: Búsqueda por nombre
const searchName = students.filter(s => s.nombresCompletoOriginal.toUpperCase().includes('DELFINA'));
console.log('C) Búsqueda por nombre "DELFINA":', searchName.length, searchName[0]?.nombresCompletoOriginal);

// Test D: Estudiante con documento atípico
const atypicalDoc = students.find(s => s.numeroDocumento === 'O2037218');
console.log('D) Estudiante con doc alfanumérico O2037218:', atypicalDoc ? 'Encontrado OK' : 'No encontrado');

// Test E: Estudiante sin documento renderizado en HTML
const htmlOutput = StudentsView.renderStudentsList(students);
const containsPendiente = htmlOutput.includes('Pendiente');
console.log('E) Muestra "Pendiente" en HTML para sin documento:', containsPendiente);

// Test F: Estudiante con múltiples filas de origen
const multiRowStudent = students.find(s => s.stagingCount > 1);
console.log('F) Estudiante multi-matrícula:', multiRowStudent?.id, multiRowStudent?.numeroDocumento, 'Filas staging:', multiRowStudent?.stagingCount);

// Test G: Escritorio
console.log('G) HTML incluye vista escritorio desktop-only:', htmlOutput.includes('desktop-only'));

// Test H: Móvil
console.log('H) HTML incluye vista móvil mobile-only:', htmlOutput.includes('mobile-only'));
