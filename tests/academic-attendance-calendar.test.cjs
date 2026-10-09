const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const D = require('../scripts/offline-documents.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');
const { AcademicCalendarEngine, INSTITUTIONAL_HOLIDAYS_2026 } = require('../scripts/academic-calendar-engine.cjs');

const artifactsDir = path.join(__dirname, 'offline-artifacts', 'academic-calendar');
fs.mkdirSync(artifactsDir, { recursive: true });

function createFixture(customGroupConfig = {}) {
  const dbDir = fs.mkdtempSync(path.join(artifactsDir, 'test-db-'));
  const core = new OfflineCore(dbDir);
  core.setup({
    username: 'director',
    name: 'Dirección Académica CETPRO',
    password: 'Password123!',
    institutionName: 'CETPRO Micaela Bastidas'
  });
  const director = core.users()[0];
  const prog = core.records('programs').find(p => p.id === 'PROG-005') || core.records('programs')[0];
  let mod = core.records('modules').find(m => m.id === 'MOD-009') || core.records('modules')[0];
  mod = { ...mod, academicYear: '2026' };
  core.putRecord('modules', mod);

  const group = core.saveGroup(director, {
    name: 'Computación e Informática - Grupo A',
    programId: prog.id,
    moduleId: mod.id,
    periodId: '2026-I',
    units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7', 'EFSRT'],
    turno: 'Mañana',
    modalidad: 'Presencial',
    ...customGroupConfig
  });

  const teacher = core.saveUser(director, {
    username: 'docente.computacion',
    name: 'Prof. Mario Vargas Llosa',
    password: 'DocentePassword123!',
    role: 'DOCENTE',
    assignments: [{ groupId: group.id, units: group.units }]
  });
  const docente = core.user(teacher.id);

  // Estudiantes
  const students = [
    { document: '10000001', name: 'Zapata Castro, Ana Sofía' },
    { document: '10000002', name: 'Alvarez Quispe, Carlos Alberto' },
    { document: '10000003', name: 'Benitez Mamani, Bruno Enrique' }
  ].map(s => {
    const student = core.saveStudent(director, { ...s, sex: 'M', birthDate: '2001-01-01' });
    const enrollment = core.enroll(director, { studentId: student.id, groupId: group.id, startDate: '2026-03-16' });
    return { student, enrollment };
  });

  // Helper para guardar settings
  const put = (kind, target, fields, unit) => D.saveSettings(core, director, {
    scope: { kind, ...(target ? { target } : {}), ...(unit ? { unit } : {}) },
    fields,
    rev: core.record('documentSettings', D.idFor({ kind, target, unit }))?.rev || null
  });

  put('institution', null, {
    nombre: 'CETPRO Micaela Bastidas',
    tipoGestion: 'PÚBLICA',
    codigoModular: '0734567',
    dre: 'DRE PUNO',
    ugel: 'UGEL SAN ROMÁN',
    departamento: 'PUNO',
    provincia: 'SAN ROMÁN',
    distrito: 'JULIACA'
  });

  put('group', group.id, {
    seccion: 'A',
    turno: 'Mañana',
    modalidad: 'Presencial',
    fechaInicio: '2026-03-16',
    fechaFin: '2026-07-24',
    periodClase: 'Marzo a Julio de 2026'
  });

  put('curriculum', mod.id, {
    year: '2026',
    periodId: '2026-I',
    nombre: mod.nombre || 'Ofimática',
    programName: prog.nombre || 'Computación e Informática',
    unitsJson: JSON.stringify([
      { code: 'UD1', name: 'Ofimática y Documentos', hours: 48, credits: 2, days: 8, fechaInicio: '2026-03-16' },
      { code: 'UD2', name: 'Hojas de Cálculo', hours: 48, credits: 2, days: 10, fechaInicio: '2026-04-01' },
      { code: 'UD3', name: 'Presentaciones', hours: 48, credits: 2, days: 8, fechaInicio: '2026-04-20' },
      { code: 'UD4', name: 'Base de Datos', hours: 48, credits: 2, days: 8, fechaInicio: '2026-05-04' },
      { code: 'UD5', name: 'Diseño Gráfico', hours: 48, credits: 2, days: 8, fechaInicio: '2026-05-18' },
      { code: 'UD6', name: 'Animación Digital', hours: 48, credits: 2, days: 8, fechaInicio: '2026-06-01' },
      { code: 'UD7', name: 'Internet y Correo', hours: 48, credits: 2, days: 8, fechaInicio: '2026-06-15' },
      { code: 'EFSRT', name: 'Experiencias Formativas', hours: 192, credits: 6 }
    ])
  });

  return { core, director, docente, group, students, put };
}

// =========================================================================
// T01. Unidad didáctica con 8 fechas válidas de clase: genera exactamente 8 columnas
// =========================================================================
test('T01: Unidad didáctica con 8 fechas válidas genera exactamente 8 columnas', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-03-16',
    targetDays: 8,
    diasClase: [1, 2, 3, 4, 5]
  });
  assert.equal(res.success, true);
  assert.equal(res.dates.length, 8, 'Debe generar exactamente 8 fechas');
  assert.equal(res.dates[0].fecha, '2026-03-16');
  assert.equal(res.dates[7].fecha, '2026-03-25');
  assert.equal(res.dates[0].dayAbbr, 'Lu');
  assert.equal(res.dates[0].dayNum, '16');
});

// =========================================================================
// T02. Unidad didáctica con 18 fechas válidas de clase: genera exactamente 18 columnas
// =========================================================================
test('T02: Unidad didáctica con 18 fechas válidas genera exactamente 18 columnas', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-04-20',
    targetDays: 18,
    diasClase: [1, 2, 3, 4, 5]
  });
  assert.equal(res.success, true);
  assert.equal(res.dates.length, 18, 'Debe generar exactamente 18 fechas');
  // Mayo 01 es feriado nacional (Día del Trabajo) y debe ser omitido
  assert.ok(!res.dates.some(d => d.fecha === '2026-05-01'), 'No debe incluir el feriado 2026-05-01');
});

// =========================================================================
// T03. Unidad didáctica con 35 fechas válidas de clase: genera exactamente 35 columnas
// =========================================================================
test('T03: Unidad didáctica con 35 fechas válidas genera exactamente 35 columnas', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-03-16',
    targetDays: 35,
    diasClase: [1, 2, 3, 4, 5]
  });
  assert.equal(res.success, true);
  assert.equal(res.dates.length, 35, 'Debe generar exactamente 35 fechas');
});

// =========================================================================
// T04. Unidad didáctica con más de 35 fechas (ej. 43 fechas): distribución en páginas consecutivas sin desbordamiento
// =========================================================================
test('T04: Unidad didáctica con 43 fechas genera páginas consecutivas sin desbordamiento', async () => {
  const f = createFixture();
  try {
    const allUnits = [
      { code: 'UD1', name: 'Desarrollo Web Fullstack Avanzado', hours: 258, credits: 11, days: 43, fechaInicio: '2026-03-16' },
      { code: 'UD2', name: 'Hojas de Cálculo', hours: 48, credits: 2, days: 10, fechaInicio: '2026-04-01' },
      { code: 'UD3', name: 'Presentaciones', hours: 48, credits: 2, days: 8, fechaInicio: '2026-04-20' },
      { code: 'UD4', name: 'Base de Datos', hours: 48, credits: 2, days: 8, fechaInicio: '2026-05-04' },
      { code: 'UD5', name: 'Diseño Gráfico', hours: 48, credits: 2, days: 8, fechaInicio: '2026-05-18' },
      { code: 'UD6', name: 'Animación Digital', hours: 48, credits: 2, days: 8, fechaInicio: '2026-06-01' },
      { code: 'UD7', name: 'Internet y Correo', hours: 48, credits: 2, days: 8, fechaInicio: '2026-06-15' },
      { code: 'EFSRT', name: 'Experiencias Formativas', hours: 192, credits: 6 }
    ];
    f.put('curriculum', f.group.moduleId, {
      year: '2026',
      periodId: '2026-I',
      nombre: 'Ofimática',
      programName: 'Computación e Informática',
      unitsJson: JSON.stringify(allUnits)
    });

    const doc = f.core.document(f.director, {
      templateId: 'TMPL-06',
      groupId: f.group.id,
      unit: 'UD1'
    });
    assert.equal(doc.academicDates.length, 43, 'Doc debe contener 43 fechas calculadas');

    const bytes = await renderPDF(path.resolve(__dirname, '..'), doc, f.director);
    fs.writeFileSync(path.join(artifactsDir, 'T04_TMPL-06_43fechas.pdf'), bytes);

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: true }).promise;
    assert.ok(pdf.numPages >= 2, 'Unidad de 43 fechas debe generar al menos 2 páginas para TMPL-06');
  } finally {
    f.core.close();
  }
});

// =========================================================================
// T05. Horario lunes, miércoles y viernes: no genera martes ni jueves
// =========================================================================
test('T05: Horario lunes, miércoles y viernes excluye martes y jueves', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-03-16',
    targetDays: 12,
    diasClase: [1, 3, 5] // Solo Lu, Mi, Vi
  });
  assert.equal(res.success, true);
  assert.equal(res.dates.length, 12);
  for (const d of res.dates) {
    assert.ok([1, 3, 5].includes(d.dayOfWeek), `Día ${d.fecha} (${d.dayAbbr}) debe ser Lu, Mi o Vi`);
    assert.notEqual(d.dayOfWeek, 2, 'No debe ser martes');
    assert.notEqual(d.dayOfWeek, 4, 'No debe ser jueves');
    assert.notEqual(d.dayOfWeek, 0, 'No debe ser domingo');
    assert.notEqual(d.dayOfWeek, 6, 'No debe ser sábado');
  }
});

// =========================================================================
// T06. Cruce de fin de mes: agrupa correctamente los días por mes en el encabezado
// =========================================================================
test('T06: Cruce de fin de mes agrupa correctamente los días por mes en encabezados', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-03-25',
    targetDays: 10,
    diasClase: [1, 2, 3, 4, 5]
  });
  assert.equal(res.success, true);
  assert.equal(res.dates.length, 10);
  assert.equal(res.monthSpans.length, 2, 'Debe haber 2 meses (Marzo y Abril)');
  assert.equal(res.monthSpans[0].monthName, 'Marzo');
  assert.equal(res.monthSpans[1].monthName, 'Abril');
  assert.equal(res.monthSpans[0].startCol, 0);
  assert.equal(res.monthSpans[0].count + res.monthSpans[1].count, 10, 'Suma de columnas debe ser 10');
});

// =========================================================================
// T07. Cruce de cambio de año (diciembre a enero): calcula fechas y años sin error
// =========================================================================
test('T07: Cruce de cambio de año (diciembre 2026 a enero 2027) sin error', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-12-21',
    fechaFin: '2027-01-15',
    diasClase: [1, 2, 3, 4, 5]
  });
  assert.equal(res.success, true);
  assert.ok(res.dates.length > 0);
  const decDates = res.dates.filter(d => d.year === 2026 && d.monthIndex === 11);
  const janDates = res.dates.filter(d => d.year === 2027 && d.monthIndex === 0);
  assert.ok(decDates.length > 0, 'Debe contener fechas de diciembre 2026');
  assert.ok(janDates.length > 0, 'Debe contener fechas de enero 2027');
  // Navidad (2026-12-25) y Año Nuevo (2027-01-01) deben excluirse
  assert.ok(!res.dates.some(d => d.fecha === '2026-12-25'), 'Navidad debe excluirse');
  assert.ok(!res.dates.some(d => d.fecha === '2027-01-01'), 'Año nuevo debe excluirse');
});

// =========================================================================
// T08. Feriado dentro del periodo: no se genera columna para esa fecha
// =========================================================================
test('T08: Feriado institucional (Combate de Angamos 08/10) excluido de columnas', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-10-01',
    fechaFin: '2026-10-15',
    diasClase: [1, 2, 3, 4, 5]
  });
  assert.equal(res.success, true);
  const angamos = res.dates.find(d => d.fecha === '2026-10-08');
  assert.equal(angamos, undefined, 'El feriado 08/10 no debe tener columna de asistencia');
});

// =========================================================================
// T09. Reprogramación o recuperación autorizada en feriado o fin de semana
// =========================================================================
test('T09: Recuperación autorizada en feriado genera columna válida', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '2026-10-01',
    fechaFin: '2026-10-15',
    diasClase: [1, 2, 3, 4, 5],
    recuperaciones: ['2026-10-08'] // Angamos recuperado
  });
  assert.equal(res.success, true);
  const recovered = res.dates.find(d => d.fecha === '2026-10-08');
  assert.ok(recovered, 'La fecha recuperada debe estar presente en las columnas');
  assert.equal(recovered.isRecovery, true);
});

// =========================================================================
// T10. Unidad didáctica sin fechas configuradas: reporte claro sin inventar 35 columnas
// =========================================================================
test('T10: Unidad didáctica sin fechas no inventa 35 columnas y emite advertencia', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({
    fechaInicio: '',
    fechaFin: '',
    targetDays: null,
    recordedSessions: []
  });
  assert.equal(res.success, false);
  assert.equal(res.dates.length, 0, 'No debe inventar columnas falsas');
  assert.match(res.error, /Falta configurar la fecha de inicio/i);
});

// =========================================================================
// T11. Dos unidades del mismo módulo con diferente cantidad de días
// =========================================================================
test('T11: Dos UDs del mismo módulo generan independientemente su propia cantidad de columnas', () => {
  const engine = new AcademicCalendarEngine();
  const ud1 = engine.resolveAcademicDates({ fechaInicio: '2026-03-16', targetDays: 8 });
  const ud2 = engine.resolveAcademicDates({ fechaInicio: '2026-03-30', targetDays: 18 });
  assert.equal(ud1.dates.length, 8);
  assert.equal(ud2.dates.length, 18);
  assert.notEqual(ud1.dates.length, ud2.dates.length);
});

// =========================================================================
// T12. Dos grupos diferentes de la misma unidad didáctica: programaciones independientes
// =========================================================================
test('T12: Dos grupos diferentes de la misma UD tienen calendarios independientes', () => {
  const engine = new AcademicCalendarEngine();
  // Grupo A: Lunes a Viernes
  const grpA = engine.resolveAcademicDates({
    fechaInicio: '2026-03-16',
    targetDays: 10,
    diasClase: [1, 2, 3, 4, 5]
  });
  // Grupo B: Lunes, Miércoles y Viernes
  const grpB = engine.resolveAcademicDates({
    fechaInicio: '2026-03-16',
    targetDays: 10,
    diasClase: [1, 3, 5]
  });
  assert.equal(grpA.dates.length, 10);
  assert.equal(grpB.dates.length, 10);
  assert.notEqual(grpA.dates[1].fecha, grpB.dates[1].fecha, 'Grupo A día 2 es martes; Grupo B día 2 es miércoles');
});

// =========================================================================
// T13. Lista de estudiantes con orden alfabético estricto según apellidos y nombres
// =========================================================================
test('T13: Lista de estudiantes ordenada alfabéticamente por apellidos y nombres', () => {
  const f = createFixture();
  try {
    const doc = f.core.document(f.director, {
      templateId: 'TMPL-06',
      groupId: f.group.id,
      unit: 'UD1'
    });
    const names = doc.students.map(s => s.student.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'es'));
    assert.deepEqual(names, sorted, 'La nómina de estudiantes debe estar en orden alfabético estricto');
    assert.equal(names[0], 'Alvarez Quispe, Carlos Alberto');
    assert.equal(names[1], 'Benitez Mamani, Bruno Enrique');
    assert.equal(names[2], 'Zapata Castro, Ana Sofía');
  } finally {
    f.core.close();
  }
});

// =========================================================================
// T14. Cálculo de totales (asistencias, faltas, justificadas, tardanzas) coherente con columnas reales
// =========================================================================
test('T14: Totales de asistencia calculados coherentemente con columnas reales', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({ fechaInicio: '2026-03-16', targetDays: 8 });
  const enrollmentId = 'EN-001';
  const attendances = [
    { enrollmentId, date: '2026-03-16', session: '1', value: 'P' },
    { enrollmentId, date: '2026-03-17', session: '1', value: 'P' },
    { enrollmentId, date: '2026-03-18', session: '1', value: 'T' },
    { enrollmentId, date: '2026-03-19', session: '1', value: 'F' },
    { enrollmentId, date: '2026-03-20', session: '1', value: 'J' },
    { enrollmentId, date: '2026-03-23', session: '1', value: 'P' },
    { enrollmentId, date: '2026-03-24', session: '1', value: 'P' },
    { enrollmentId, date: '2026-03-25', session: '1', value: 'P' }
  ];
  const summary = engine.calculateStudentSummary(enrollmentId, res.dates, attendances);
  assert.equal(summary.P, 5, 'Presentes debe ser 5');
  assert.equal(summary.T, 1, 'Tardanzas debe ser 1');
  assert.equal(summary.F, 1, 'Faltas debe ser 1');
  assert.equal(summary.J, 1, 'Justificadas debe ser 1');
  assert.equal(summary.totalPresences, 6, 'Total presencias (P + T) debe ser 6');
  assert.equal(summary.totalAbsences, 2, 'Total ausencias (F + J) debe ser 2');
});

// =========================================================================
// T15. Porcentaje de inasistencia calculado sobre el total de fechas válidas de la unidad
// =========================================================================
test('T15: Porcentaje de inasistencias calculado sobre total de fechas reales (8 días)', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({ fechaInicio: '2026-03-16', targetDays: 8 });
  const enrollmentId = 'EN-001';
  // 2 inasistencias en 8 fechas = 25%
  const attendances = [
    { enrollmentId, date: '2026-03-16', session: '1', value: 'F' },
    { enrollmentId, date: '2026-03-17', session: '1', value: 'F' }
  ];
  const summary = engine.calculateStudentSummary(enrollmentId, res.dates, attendances);
  assert.equal(summary.absencePercent, 25, '2 faltas en 8 días debe ser exactamente 25%');
  assert.notEqual(summary.absencePercent, 5.71, 'No debe calcularse dividiendo entre 35');
});

// =========================================================================
// T16. Estudiante matriculado después de la fecha de inicio: días previos sin computar como falta
// =========================================================================
test('T16: Estudiante matriculado tardíamente no se computa con faltas en fechas previas', () => {
  const engine = new AcademicCalendarEngine();
  const res = engine.resolveAcademicDates({ fechaInicio: '2026-03-16', targetDays: 8 });
  const enrollmentId = 'EN-TARDE';
  const startDate = '2026-03-23'; // Se matriculó a la mitad de la UD
  const attendances = [
    { enrollmentId, date: '2026-03-23', session: '1', value: 'P' },
    { enrollmentId, date: '2026-03-24', session: '1', value: 'P' },
    { enrollmentId, date: '2026-03-25', session: '1', value: 'P' }
  ];
  const summary = engine.calculateStudentSummary(enrollmentId, res.dates, attendances, startDate);
  assert.equal(summary.F, 0, 'No debe acumular faltas previas a su matrícula');
  assert.equal(summary.P, 3);
  assert.equal(summary.totalProgramadas, 3, 'Solo 3 fechas fueron programadas para su matrícula activa');
  assert.equal(res.dates.length - summary.totalProgramadas, 5, 'Días previos a su matrícula deben ser 5');
});

// =========================================================================
// T17. Guardado offline y persistencia: datos de asistencia se conservan en SQLite
// =========================================================================
test('T17: Guardado offline conserva marcas de asistencia en SQLite', () => {
  const f = createFixture();
  try {
    const student = f.students[0];
    f.core.saveAcademic(f.docente, 'attendance', {
      groupId: f.group.id,
      unit: 'UD1',
      date: '2026-03-16',
      session: '1',
      rows: [{ enrollmentId: student.enrollment.id, value: 'P' }]
    });

    const saved = f.core.scoped(f.docente, 'attendance').find(
      r => r.enrollmentId === student.enrollment.id && r.date === '2026-03-16' && r.session === '1'
    );
    assert.ok(saved, 'La marca de asistencia debe existir en SQLite');
    assert.equal(saved.value, 'P');
  } finally {
    f.core.close();
  }
});

// =========================================================================
// T18. Integridad referencial: no se borran notas ni matrículas
// =========================================================================
test('T18: Actualización de asistencia no altera notas ni matrículas existentes', () => {
  const f = createFixture();
  try {
    const student = f.students[0];
    // Guardar nota
    f.core.saveAcademic(f.docente, 'grades', {
      groupId: f.group.id,
      unit: 'UD1',
      indicator: 'IL1',
      rows: [{ enrollmentId: student.enrollment.id, value: 18.5 }]
    });

    // Guardar asistencia
    f.core.saveAcademic(f.docente, 'attendance', {
      groupId: f.group.id,
      unit: 'UD1',
      date: '2026-03-16',
      session: '1',
      rows: [{ enrollmentId: student.enrollment.id, value: 'P' }]
    });

    // Verificar que la nota sigue intacta
    const grade = f.core.scoped(f.docente, 'grades').find(
      r => r.enrollmentId === student.enrollment.id && r.indicator === 'IL1'
    );
    assert.ok(grade, 'La nota debe conservarse intacta');
    assert.equal(grade.value, 18.5);

    // Verificar que la matrícula sigue activa
    const enrollment = f.core.record('enrollments', student.enrollment.id);
    assert.equal(enrollment.active, true);
  } finally {
    f.core.close();
  }
});

// =========================================================================
// T19. Plantillas hermanas (TMPL-05 a TMPL-10): compatibilidad verificada
// =========================================================================
test('T19: Plantillas hermanas TMPL-05 a TMPL-10 se renderizan correctamente sin romper layout', async () => {
  const f = createFixture();
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    for (const tid of ['TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10']) {
      const doc = f.core.document(f.director, { templateId: tid, groupId: f.group.id, unit: 'UD1' });
      assert.ok(doc.academicDates, `${tid} debe contener academicDates`);
      const bytes = await renderPDF(path.resolve(__dirname, '..'), doc, f.director);
      fs.writeFileSync(path.join(artifactsDir, `T19_${tid}.pdf`), bytes);
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: true }).promise;
      assert.ok(pdf.numPages >= 1, `${tid} debe generar al menos 1 página válida`);
    }
  } finally {
    f.core.close();
  }
});

// =========================================================================
// T20. Rendimiento de generación de PDF: tiempo de respuesta menor a 3 segundos
// =========================================================================
test('T20: Rendimiento de generación de PDF es menor a 3000 ms para 40 estudiantes', async () => {
  const f = createFixture();
  try {
    // Matricular 40 estudiantes
    for (let i = 4; i <= 40; i++) {
      const s = f.core.saveStudent(f.director, {
        document: String(10000000 + i),
        name: `Estudiante Rendimiento ${String(i).padStart(2, '0')}`,
        sex: 'M',
        birthDate: '2001-01-01'
      });
      f.core.enroll(f.director, { studentId: s.id, groupId: f.group.id, startDate: '2026-03-16' });
    }

    const allUnits = [
      { code: 'UD1', name: 'Unidad de Rendimiento', hours: 210, credits: 7, days: 35, fechaInicio: '2026-03-16' },
      { code: 'UD2', name: 'Hojas de Cálculo', hours: 48, credits: 2, days: 10, fechaInicio: '2026-04-01' },
      { code: 'UD3', name: 'Presentaciones', hours: 48, credits: 2, days: 8, fechaInicio: '2026-04-20' },
      { code: 'UD4', name: 'Base de Datos', hours: 48, credits: 2, days: 8, fechaInicio: '2026-05-04' },
      { code: 'UD5', name: 'Diseño Gráfico', hours: 48, credits: 2, days: 8, fechaInicio: '2026-05-18' },
      { code: 'UD6', name: 'Animación Digital', hours: 48, credits: 2, days: 8, fechaInicio: '2026-06-01' },
      { code: 'UD7', name: 'Internet y Correo', hours: 48, credits: 2, days: 8, fechaInicio: '2026-06-15' },
      { code: 'EFSRT', name: 'Experiencias Formativas', hours: 192, credits: 6 }
    ];
    f.put('curriculum', f.group.moduleId, {
      year: '2026',
      periodId: '2026-I',
      nombre: 'Ofimática',
      programName: 'Computación e Informática',
      unitsJson: JSON.stringify(allUnits)
    });

    const doc = f.core.document(f.director, { templateId: 'TMPL-06', groupId: f.group.id, unit: 'UD1' });
    assert.equal(doc.students.length, 40);

    const start = performance.now();
    const bytes = await renderPDF(path.resolve(__dirname, '..'), doc, f.director);
    const duration = performance.now() - start;

    fs.writeFileSync(path.join(artifactsDir, 'T20_TMPL-06_40estudiantes.pdf'), bytes);
    assert.ok(bytes.length > 50000, 'El PDF generado debe tener contenido válido');
    assert.ok(duration < 3000, `La generación del PDF tomó ${duration.toFixed(2)} ms (debe ser menor a 3000 ms)`);
  } finally {
    f.core.close();
  }
});
