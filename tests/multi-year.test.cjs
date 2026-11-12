/**
 * tests/multi-year.test.cjs
 * 
 * Verificación del motor multi-año (2027, 2028, 2029...):
 * - Clonación no destructiva con preservación de canonicalCode.
 * - Cero arrastre de matrículas o calificaciones hacia años futuros.
 * - Mantenimiento de la integridad de los periodos (2027-I, 2027-II).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const AcademicConfig = require('../scripts/academic-config.cjs');
const DocumentSettings = require('../scripts/offline-documents.cjs');

const artifactsDir = path.join(__dirname, 'offline-artifacts', 'multi-year');

test('Fase 5: Motor Multi-Año 2027+ y Reutilización Limpia', async (t) => {
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

  // Inicializar año base 2026
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

    core.putRecord('programs', { id: 'PROG-001', canonicalCode: 'PROG-001', nombre: 'Computación e Informática', academicYear: '2026' });
    core.putRecord('modules', { id: 'MOD-001', canonicalCode: 'MOD-001', nombre: 'Ofimática', programaId: 'PROG-001', academicYear: '2026' });

    DocumentSettings.saveSettings(core, director, {
      scope: { kind: 'curriculum', target: 'MOD-001' },
      fields: {
        year: '2026',
        periodId: '2026-I',
        nombre: 'Ofimática',
        programName: 'Computación e Informática',
        hours: 528,
        credits: 22,
        unitsJson: JSON.stringify([
          { code: 'UD1', name: 'Procesador de Textos', hours: 336, credits: 14, fechaInicio: '2026-03-16', fechaFin: '2026-05-15' },
          { code: 'EFSRT', name: 'Prácticas Iniciales', hours: 192, credits: 8, fechaInicio: '2026-05-16', fechaFin: '2026-07-24' }
        ])
      },
      rev: null
    });

    // Registrar matrícula y nota en 2026
    const group2026 = core.saveGroup(director, {
      name: 'Aula 2026-A',
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      periodId: '2026-I',
      section: 'A',
      units: ['UD1', 'EFSRT']
    });

    const student = core.saveStudent(director, { name: 'Alumno 2026', document: '77778888' });
    const enrollment = core.enroll(director, { groupId: group2026.id, studentId: student.id, startDate: '2026-03-16' });
  });

  await t.test('1. Clonar año 2026 hacia 2027 preserva canonicalCode en módulos', () => {
    const cloneResult = AcademicConfig.cloneYear(core, director, {
      sourceYear: '2026',
      year: '2027'
    });

    assert.equal(cloneResult.year, '2027');

    const year2027 = core.record('documentSettings', 'academicYear:2027');
    assert.ok(year2027, 'academicYear:2027 debe existir');
    assert.equal(year2027.fields.hours, 1056);

    const period2027I = core.record('documentSettings', 'academicPeriod:2027-I');
    assert.ok(period2027I, 'academicPeriod:2027-I debe existir');
    assert.equal(period2027I.fields.year, '2027');

    const modules2027 = core.records('modules').filter((m) => m.academicYear === '2027');
    assert.equal(modules2027.length, 1);
    const mod2027 = modules2027[0];
    assert.equal(mod2027.id, 'MOD-2027-MOD-001');
    assert.equal(mod2027.canonicalCode, 'MOD-001', 'El módulo clonado DEBE conservar canonicalCode MOD-001');

    const curr2027 = core.record('documentSettings', `curriculum:${mod2027.id}`);
    assert.ok(curr2027, 'El currículo del módulo 2027 debe existir');
    assert.equal(curr2027.fields.periodId, '2027-I');
  });

  await t.test('2. Cero arrastre de datos operativos de 2026 hacia 2027', () => {
    // Matrículas deben pertenecer exclusivamente al periodo donde fueron creadas
    const enrollments2026 = core.records('enrollments').filter((e) => e.periodId === '2026-I');
    assert.equal(enrollments2026.length, 1);

    const enrollments2027 = core.records('enrollments').filter((e) => e.periodId && e.periodId.startsWith('2027'));
    assert.equal(enrollments2027.length, 0, 'El nuevo año 2027 DEBE iniciar con 0 matrículas (padrón limpio)');

    const grades2027 = core.records('grades').filter((g) => g.periodId && g.periodId.startsWith('2027'));
    assert.equal(grades2027.length, 0, 'El nuevo año 2027 DEBE iniciar con 0 calificaciones');
  });

  core.close();
});
