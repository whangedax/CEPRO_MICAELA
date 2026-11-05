/**
 * tests/cepro-bd-catalog.test.cjs
 * 
 * SUITE DE VALIDACIÓN AUTOMATIZADA: CATÁLOGO DOCUMENTAL CEPRO_BD 2026
 * CEPRO_MICAELA 2.0 — Release 2.0
 * 
 * Contrato: CTR-ACAD-2026-CATALOG-01
 * Cobertura:
 * 1. Validación de Conteos Canónicos (7 programas, 14 módulos, 129 capacidades, 378 indicadores de capacidad, 258 indicadores de competencia, 24 issues, 150 páginas).
 * 2. Idempotencia en 2 ejecuciones consecutivas (0 duplicados, PRAGMA quick_check = ok, 286 matrículas intactas).
 * 3. Endpoints HTTP y Roles RBAC (GET catálogo, POST save-program OCC 409, POST resolve-issue 403/200, POST save-parameter, POST sync-to-curriculum).
 * 4. Preservación absoluta de los 21 manifiestos de preflight MINEDU (21/21 READY).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const CeproBdCatalog = require('../scripts/cepro-bd-catalog.cjs');
const { validateDevSandbox } = require('../scripts/dev-sandbox-guard.cjs');

test('CEPRO_BD 2026 — 1. Validación de Conteos Canónicos del Catálogo Documental', async (t) => {
  const catalog = CeproBdCatalog.parseCatalog();

  await t.test('1.1. Metadatos de fuente oficial y foliación digital', () => {
    assert.equal(catalog.year, '2026');
    assert.equal(catalog.totalPages, 150);
    assert.equal(catalog.sourceMetadata.document, 'BD CEPRO DOCUMENTOS.pdf');
    assert.equal(catalog.sourceMetadata.sha256, 'ba7960b3db9ae24010b8201cc852fa8f6dd3923b66f5586f25cc846ab36a9620');
    assert.equal(catalog.sourceMetadata.codeModular, '1027648');
  });

  await t.test('1.2. 7 Programas oficiales y 14 Módulos formativos', () => {
    assert.equal(catalog.programs.length, 7);
    assert.equal(catalog.summary.modulesCount, 14);

    const progIds = catalog.programs.map(p => p.programId).sort();
    assert.deepEqual(progIds, ['PROG-001', 'PROG-002', 'PROG-003', 'PROG-004', 'PROG-005', 'PROG-006', 'PROG-007']);

    const codes = catalog.programs.map(p => p.codeCeProBd).sort();
    assert.deepEqual(codes, ['AUTO', 'CE', 'CI', 'CM', 'ELE', 'MOT', 'PB']);
  });

  await t.test('1.3. Conteo exacto de 129 Capacidades de Formulación (Nivel 2A)', () => {
    assert.equal(catalog.summary.capacidadesCount, 129);

    const counts = Object.fromEntries(catalog.programs.map(p => [p.codeCeProBd, p.capacidades.length]));
    assert.equal(counts.AUTO, 10, 'Mecánica Automotriz debe tener 10 capacidades');
    assert.equal(counts.MOT, 35, 'Mecánica de Motos debe tener 35 capacidades');
    assert.equal(counts.CM, 14, 'Carpintería Metálica debe tener 14 capacidades');
    assert.equal(counts.PB, 15, 'Peluquería y Barbería debe tener 15 capacidades');
    assert.equal(counts.CI, 11, 'Computación e Informática debe tener 11 capacidades');
    assert.equal(counts.CE, 32, 'Corte y Ensamblaje debe tener 32 capacidades');
    assert.equal(counts.ELE, 12, 'Sistemas Eléctricos debe tener 12 capacidades');
  });

  await t.test('1.4. Conteo exacto de 378 Indicadores de Capacidad Vigesimales (Nivel 2B)', () => {
    assert.equal(catalog.summary.indicadoresCapacidadCount, 378);

    const counts = Object.fromEntries(catalog.programs.map(p => [p.codeCeProBd, p.indicadoresCapacidad.length]));
    assert.equal(counts.AUTO, 34, 'Mecánica Automotriz debe tener 34 indicadores de capacidad');
    assert.equal(counts.MOT, 147, 'Mecánica de Motos debe tener 147 indicadores de capacidad');
    assert.equal(counts.CM, 42, 'Carpintería Metálica debe tener 42 indicadores de capacidad');
    assert.equal(counts.PB, 66, 'Peluquería y Barbería debe tener 66 indicadores de capacidad');
    assert.equal(counts.CI, 35, 'Computación e Informática debe tener 35 indicadores de capacidad');
    assert.equal(counts.CE, 32, 'Corte y Ensamblaje debe tener 32 indicadores de capacidad');
    assert.equal(counts.ELE, 22, 'Sistemas Eléctricos debe tener 22 indicadores de capacidad');
  });

  await t.test('1.5. Conteo exacto de 258 Indicadores de Logro de Competencia UC/CE (Nivel 1)', () => {
    assert.equal(catalog.summary.indicadoresCompetenciaCount, 258);

    const counts = Object.fromEntries(catalog.programs.map(p => [p.codeCeProBd, p.indicadoresCompetencia.length]));
    assert.equal(counts.AUTO, 40, 'Mecánica Automotriz debe tener 40 indicadores de competencia');
    assert.equal(counts.MOT, 50, 'Mecánica de Motos debe tener 50 indicadores de competencia');
    assert.equal(counts.CM, 44, 'Carpintería Metálica debe tener 44 indicadores de competencia');
    assert.equal(counts.PB, 34, 'Peluquería y Barbería debe tener 34 indicadores de competencia');
    assert.equal(counts.CI, 19, 'Computación e Informática debe tener 19 indicadores de competencia');
    assert.equal(counts.CE, 26, 'Corte y Ensamblaje debe tener 26 indicadores de competencia');
    assert.equal(counts.ELE, 45, 'Sistemas Eléctricos debe tener 45 indicadores de competencia');
  });

  await t.test('1.6. Conteo exacto de 24 Incidencias y Cuarentena', () => {
    assert.equal(catalog.summary.issuesCount, 24);
    assert.ok(catalog.summary.quarantineCount >= 1);

    const audIssues = catalog.issues.filter(i => i.issueId.startsWith('AUD-'));
    assert.equal(audIssues.length, 16, 'Deben existir 16 incidencias AUD');

    const autoIssues = catalog.issues.filter(i => i.issueId.startsWith('AUTO-Q'));
    assert.equal(autoIssues.length, 8, 'Deben existir 8 incidencias AUTO-Q');
  });
});

test('CEPRO_BD 2026 — 2. Idempotencia y Cero Regresión en Siembra', async (t) => {
  const sandboxDir = path.resolve(__dirname, '..', 'dev-sandbox', 'data');
  validateDevSandbox({ dataDir: sandboxDir });

  const core = new OfflineCore(sandboxDir, null);

  try {
    const director = core.users().find(u => u.role === 'DIRECTOR');
    assert.ok(director, 'Debe existir cuenta de Director');

    const enrollmentsBefore = core.records('enrollments').filter(e => e.active).length;
    assert.equal(enrollmentsBefore, 286, 'Debe haber exactamente 286 matrículas previas 1:1');

    await t.test('2.1. Primera ejecución de seedCatalog', () => {
      const summary1 = CeproBdCatalog.seedCatalog(core, { user: director });
      assert.equal(summary1.programsCount, 7);
      assert.equal(summary1.capacidadesCount, 129);
      assert.equal(summary1.indicadoresCapacidadCount, 378);
      assert.equal(summary1.indicadoresCompetenciaCount, 258);
      assert.equal(summary1.issuesCount, 24);
    });

    await t.test('2.2. Segunda ejecución consecutiva (idempotencia estricta)', () => {
      const summary2 = CeproBdCatalog.seedCatalog(core, { user: director });
      assert.equal(summary2.programsCount, 7);
      assert.equal(summary2.capacidadesCount, 129);
      assert.equal(summary2.indicadoresCapacidadCount, 378);
      assert.equal(summary2.indicadoresCompetenciaCount, 258);
      assert.equal(summary2.issuesCount, 24);

      // Comprobar que no hay duplicados de programas
      const progRecords = core.records('documentSettings').filter(r => r.scope?.kind === 'catalogProgram');
      assert.equal(progRecords.length, 7, 'Deben existir exactamente 7 registros catalogProgram');
    });

    await t.test('2.3. Preservación absoluta de las 286 matrículas y quick_check = ok', () => {
      const enrollmentsAfter = core.records('enrollments').filter(e => e.active).length;
      assert.equal(enrollmentsAfter, 286, 'Las matrículas deben ser exactamente 286');

      const integrity = core.db.prepare('PRAGMA quick_check').get();
      assert.equal(Object.values(integrity)[0], 'ok', 'PRAGMA quick_check debe ser ok');
    });
  } finally {
    core.close();
  }
});

test('CEPRO_BD 2026 — 3. Endpoints API REST y Seguridad RBAC', async (t) => {
  const sandboxDir = path.resolve(__dirname, '..', 'dev-sandbox', 'data');
  const core = new OfflineCore(sandboxDir, null);

  try {
    const director = core.users().find(u => u.role === 'DIRECTOR');
    const secretaria = core.users().find(u => u.role === 'SECRETARIA');
    const docente = core.users().find(u => u.role === 'DOCENTE');

    assert.ok(director && secretaria && docente, 'Deben existir usuarios multi-rol');

    await t.test('3.1. GET /api/academic/documentary-catalog (Global para Director)', () => {
      const res = CeproBdCatalog.getCatalog(core, director);
      assert.equal(res.success, true);
      assert.equal(res.summary.programsCount, 7);
      assert.equal(res.summary.capacidadesCount, 129);
      assert.equal(res.summary.indicadoresCapacidadCount, 378);
      assert.equal(res.summary.indicadoresCompetenciaCount, 258);
      assert.equal(res.summary.issuesCount, 24);
      assert.equal(res.summary.activeStudentsCount, 286);
      assert.equal(res.summary.activeClassroomsCount, 16);
    });

    await t.test('3.2. GET /api/academic/documentary-catalog?programId=PROG-001 (Filtrado)', () => {
      const res = CeproBdCatalog.getCatalog(core, director, { programId: 'PROG-001' });
      assert.equal(res.success, true);
      assert.equal(res.programs.length, 1);
      assert.equal(res.programs[0].programId, 'PROG-001');
      assert.equal(res.programs[0].codeCeProBd, 'AUTO');
      assert.equal(res.programs[0].capacidades.length, 10);
    });

    await t.test('3.3. GET /api/academic/documentary-catalog (Vista contextual para Docente)', () => {
      const res = CeproBdCatalog.getCatalog(core, docente);
      assert.equal(res.success, true);
      assert.ok(res.programs.length >= 1, 'Docente debe ver sus programas autorizados');
    });

    await t.test('3.4. POST /api/academic/documentary-catalog/save-program (OCC y rev)', () => {
      const currentProg = core.record('documentSettings', 'catalogProgram:PROG-001');
      assert.ok(currentProg, 'Debe existir PROG-001');

      // Intentar guardar con rev incorrecto (409 OCC)
      assert.throws(() => {
        CeproBdCatalog.saveProgramCatalog(core, director, {
          programId: 'PROG-001',
          expectedRev: 'rev-invalido-de-prueba',
          programData: { horasDeclaradas: 1056 }
        });
      }, (err) => {
        assert.equal(err.status, 409);
        return true;
      });

      // Guardar con rev correcto
      const resOk = CeproBdCatalog.saveProgramCatalog(core, director, {
        programId: 'PROG-001',
        expectedRev: currentProg.rev,
        programData: { horasDeclaradas: 1056 },
        changeReason: 'Verificación de prueba unitaria'
      });
      assert.equal(resOk.success, true);
      assert.equal(resOk.programId, 'PROG-001');
      assert.ok(resOk.rev);

      // Docente no tiene permiso para guardar programa (403)
      assert.throws(() => {
        CeproBdCatalog.saveProgramCatalog(core, docente, {
          programId: 'PROG-001',
          programData: {}
        });
      }, (err) => {
        assert.equal(err.status, 403);
        return true;
      });
    });

    await t.test('3.5. POST /api/academic/documentary-catalog/resolve-issue (Director)', () => {
      // Docente no puede resolver (403)
      assert.throws(() => {
        CeproBdCatalog.resolveIssue(core, docente, {
          issueId: 'AUD-005',
          resolution: 'ACEPTADO',
          justification: 'Prueba no autorizada'
        });
      }, (err) => {
        assert.equal(err.status, 403);
        return true;
      });

      // Secretaría no puede resolver (403)
      assert.throws(() => {
        CeproBdCatalog.resolveIssue(core, secretaria, {
          issueId: 'AUD-005',
          resolution: 'ACEPTADO',
          justification: 'Prueba secretaria'
        });
      }, (err) => {
        assert.equal(err.status, 403);
        return true;
      });

      // Director resuelve exitosamente (200)
      const resOk = CeproBdCatalog.resolveIssue(core, director, {
        issueId: 'AUD-005',
        resolution: 'ACEPTADO',
        resolvedValue: '96 horas en UD Peinados (Módulo I = 528h)',
        justification: 'Aprobado según acta de consolidación curricular docente. Se asignan 3 créditos equivalentes a 32 horas de teoría y 64 horas de práctica, alcanzando 528h en el Módulo I y 1056h totales.',
        documentReference: 'RD-014-CETPRO'
      });
      assert.equal(resOk.success, true);
      assert.equal(resOk.issueId, 'AUD-005');
      assert.equal(resOk.status, 'RESUELTO');
      assert.equal(resOk.resolvedBy, director.username);

      // Comprobar que en getCatalog figura resuelto
      const updatedCat = CeproBdCatalog.getCatalog(core, director);
      const iss = updatedCat.issues.find(i => i.issueId === 'AUD-005');
      assert.equal(iss.estado, 'RESUELTO');
      assert.equal(iss.resueltoPor, director.username);
    });

    await t.test('3.6. POST /api/academic/documentary-catalog/save-parameter (Director)', () => {
      // Docente no puede (403)
      assert.throws(() => {
        CeproBdCatalog.saveParameter(core, docente, {
          paramKey: 'passing_score',
          paramValue: 14
        });
      }, (err) => {
        assert.equal(err.status, 403);
        return true;
      });

      // Director guarda exitosamente (200)
      const resOk = CeproBdCatalog.saveParameter(core, director, {
        paramKey: 'passing_score',
        paramValue: 13,
        description: 'Nota mínima aprobatoria oficial',
        category: 'EVALUACION'
      });
      assert.equal(resOk.success, true);
      assert.equal(resOk.paramKey, 'passing_score');
      assert.equal(resOk.paramValue, 13);
    });

    await t.test('3.7. POST /api/academic/documentary-catalog/sync-to-curriculum (Invariante 286)', () => {
      // Dry-run
      const resDry = CeproBdCatalog.syncToCurriculum(core, director, { dryRun: true });
      assert.equal(resDry.success, true);
      assert.equal(resDry.dryRun, true);
      assert.equal(resDry.syncedPrograms.length, 7);
      assert.equal(resDry.syncedModules.length, 14);
      assert.equal(resDry.enrollmentsPreserved, 286);
      assert.equal(resDry.preflightStatus.allReady, true);
      assert.equal(resDry.preflightStatus.verifiedTemplatesCount, 21);

      // Ejecución real
      const resReal = CeproBdCatalog.syncToCurriculum(core, director, { dryRun: false });
      assert.equal(resReal.success, true);
      assert.equal(resReal.dryRun, false);
      assert.equal(resReal.enrollmentsPreserved, 286);
    });
  } finally {
    core.close();
  }
});
