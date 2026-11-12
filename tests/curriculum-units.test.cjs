/**
 * tests/curriculum-units.test.cjs
 * 
 * Verificación de la gestión flexible de Unidades Didácticas (UDs),
 * preservación de notas con archivo lógico, IL1–IL5 y EFSRT.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const DocumentSettings = require('../scripts/offline-documents.cjs');
const CurriculumUnits = require('../scripts/curriculum-units.cjs');

const artifactsDir = path.join(__dirname, 'offline-artifacts', 'curriculum-units');

test('Fase 6: Flexibilidad de UDs, Preservación de Notas, IL1–IL5 y EFSRT', async (t) => {
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(artifactsDir, { recursive: true });

  const core = new OfflineCore(artifactsDir);
  core.setup({
    name: 'Lic. Eloy Valerio Paredes Feliciano',
    username: 'eloy.paredes',
    password: 'Password123!',
    institutionName: 'CETPRO MICAELA BASTIDAS'
  });
  const director = core.users().find((u) => u.username === 'eloy.paredes');

  // Inicializar periodos y catálogo
  core.transaction(() => {
    DocumentSettings.saveSettings(core, director, {
      scope: { kind: 'academicYear', target: '2026' },
      fields: { hours: 1056, credits: 44, calendarJson: '[]', directoryDate: '2026-03-01' },
      rev: null
    });
    DocumentSettings.saveSettings(core, director, {
      scope: { kind: 'academicPeriod', target: '2026-I' },
      fields: { year: '2026', fechaInicio: '2026-03-16', fechaFin: '2026-07-24' },
      rev: null
    });

    core.putRecord('programs', { id: 'PROG-002', canonicalCode: 'PROG-002', nombre: 'Peluquería y Barbería', academicYear: '2026' });
    core.putRecord('modules', { id: 'MOD-009', canonicalCode: 'MOD-009', nombre: 'Corte de Cabello y Barbería', programaId: 'PROG-002', academicYear: '2026' });

    DocumentSettings.saveSettings(core, director, {
      scope: { kind: 'curriculum', target: 'MOD-009' },
      fields: {
        year: '2026',
        periodId: '2026-I',
        nombre: 'Corte de Cabello y Barbería',
        programName: 'Peluquería y Barbería',
        hours: 528,
        credits: 22,
        unitsJson: JSON.stringify([
          { code: 'UD1', name: 'Bioseguridad y Diagnóstico Capilar', hours: 64, credits: 3 },
          { code: 'UD2', name: 'Técnicas de Corte Clásico', hours: 96, credits: 4 },
          { code: 'UD3', name: 'Diseño y Acabados de Barbería', hours: 96, credits: 4 },
          { code: 'UD4', name: 'Peinados y Brushing', hours: 80, credits: 3 },
          { code: 'EFSRT', name: 'Prácticas Formativas', hours: 192, credits: 8 }
        ])
      },
      rev: null
    });
  });

  const group = core.saveGroup(director, {
    name: 'Peluquería A1',
    programId: 'PROG-002',
    moduleId: 'MOD-009',
    periodId: '2026-I',
    section: 'A',
    units: ['UD1', 'UD2', 'UD3', 'UD4', 'EFSRT']
  });

  const docente = core.saveUser(director, {
    username: 'alejandrina.docente',
    name: 'Alejandrina Ayna',
    password: 'Password123!',
    role: 'DOCENTE',
    assignments: [{ groupId: group.id, section: 'A', periodId: '2026-I', programId: 'PROG-002', moduleId: 'MOD-009', units: ['UD1', 'UD2', 'UD3', 'UD4', 'EFSRT'] }]
  });
  const actorDocente = core.user(docente.id);

  let enrollment;

  await t.test('1. Agregar una nueva Unidad Didáctica al aula (flexibilidad curricular)', () => {
    const result = CurriculumUnits.addCurriculumUnit(core, director, {
      groupId: group.id,
      unit: {
        code: 'UD5',
        name: 'Tratamiento Capilar y Colorimetría Básica',
        hours: 80,
        credits: 3
      }
    });

    assert.ok(result.success);
    assert.equal(result.code, 'UD5');

    const updatedGroup = core.record('groups', group.id);
    assert.ok(updatedGroup.units.includes('UD5'), 'El aula debe incluir la nueva UD5');
    assert.equal(updatedGroup.units.length, 6, 'Debe tener 6 unidades (5 UDs + EFSRT)');
  });

  await t.test('2. Retirar una UD que NO tiene notas registradas (remoción limpia)', () => {
    const result = CurriculumUnits.removeCurriculumUnit(core, director, {
      groupId: group.id,
      unitCode: 'UD5'
    });

    assert.ok(result.success);
    assert.equal(result.action, 'REMOVED');

    const updatedGroup = core.record('groups', group.id);
    assert.ok(!updatedGroup.units.includes('UD5'), 'UD5 debe haber sido retirada de la lista activa');
  });

  await t.test('3. Regla Inviolable: Retirar una UD con notas registradas aplica ARCHIVO LÓGICO', () => {
    // Matricular alumno y registrar calificación en UD1
    const student = core.saveStudent(director, { name: 'Alumna María', document: '11223344' });
    enrollment = core.enroll(director, { groupId: group.id, studentId: student.id, startDate: '2026-03-16' });

    // Guardar calificación oficial en UD1
    core.saveAcademic(actorDocente, 'grades', {
      groupId: group.id,
      unit: 'UD1',
      indicator: 'IL1',
      rows: [{ enrollmentId: enrollment.id, value: 16 }]
    });

    // Intentar retirar UD1
    const result = CurriculumUnits.removeCurriculumUnit(core, director, {
      groupId: group.id,
      unitCode: 'UD1'
    });

    assert.ok(result.success);
    assert.equal(result.action, 'ARCHIVED', 'DEBE aplicar archivo lógico porque contiene notas registradas');
    assert.equal(result.preservedGradesCount, 1);

    const updatedGroup = core.record('groups', group.id);
    assert.ok(updatedGroup.archivedUnits.includes('UD1'), 'UD1 debe estar en archivedUnits');
    const activeUnits = updatedGroup.units.filter((u) => !(updatedGroup.archivedUnits || []).includes(u));
    assert.ok(!activeUnits.includes('UD1'), 'UD1 ya no debe figurar en las unidades operativas activas');

    // Verificar que las calificaciones históricas siguen en la base de datos intactas
    const gradesUD1 = core.records('grades').filter((g) => g.groupId === group.id && g.unit === 'UD1');
    assert.equal(gradesUD1.length, 1, 'Las notas históricas de UD1 NUNCA deben borrarse');
    assert.equal(gradesUD1[0].value, 16);
  });

  await t.test('4. Configuración y persistencia de Indicadores de Logro Pedagógicos (IL1 a IL5)', () => {
    const indicatorsData = {
      indicator1: 'Aplica medidas de higiene, esterilización y bioseguridad en el salón de barbería',
      indicator2: 'Ejecuta técnicas de corte clásico a tijera y máquina con precisión',
      indicator3: 'Realiza degradados (fade) y diseño de contornos respetando la morfología del cliente',
      indicator4: 'Aplica técnicas de afeitado tradicional y perfilado de barba con toalla caliente',
      indicator5: 'Demuestra trato empático, puntualidad y ética profesional con los usuarios'
    };

    const saveResult = CurriculumUnits.saveIndicators(core, actorDocente, {
      groupId: group.id,
      unitCode: 'UD2',
      indicators: indicatorsData
    });

    assert.ok(saveResult.success);
    assert.equal(saveResult.fields.indicator1, indicatorsData.indicator1);
    assert.equal(saveResult.fields.indicator5, indicatorsData.indicator5);

    const stored = core.record('documentSettings', `unit:${group.id}:UD2`);
    assert.ok(stored, 'El registro de indicadores debe existir en documentSettings');
    assert.equal(stored.fields.indicator3, indicatorsData.indicator3);
  });

  await t.test('5. Configuración de parámetros y criterios 1 al 9 de EFSRT', () => {
    const practiceData = {
      companyName: 'Salón y Barbería San Román E.I.R.L.',
      companyAddress: 'Jr. Mariano Melgar 450, Juliaca',
      efsrtFinalGrade: 18,
      criterion1: 3,
      criterion2: 2,
      criterion3: 2,
      criterion4: 3,
      criterion5: 3,
      criterion6: 3,
      criterion7: 1,
      criterion8: 2,
      criterion9: 1
    };

    const saveResult = CurriculumUnits.savePracticeSettings(core, actorDocente, {
      enrollmentId: enrollment.id,
      practiceFields: practiceData
    });

    assert.ok(saveResult.success);
    assert.equal(saveResult.fields.companyName, practiceData.companyName);
    assert.equal(saveResult.fields.criterion1, 3);
    assert.equal(saveResult.fields.efsrtFinalGrade, 18);

    const stored = core.record('documentSettings', `practice:${enrollment.id}:EFSRT`);
    assert.ok(stored);
    assert.equal(stored.fields.companyAddress, practiceData.companyAddress);
  });

  core.close();
});
