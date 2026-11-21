const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./helpers/official-fixture.cjs');
const { configure } = require('../scripts/configure-official-2026.cjs');
const D = require('../scripts/offline-documents.cjs');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const CeproBdCatalog = require('../scripts/cepro-bd-catalog.cjs');
const { createService } = require('../scripts/offline-http.cjs');

async function withServer(setupFn, runFn) {
  const f = fixture();
  let extra = null;
  let directory = null;
  try {
    configure(f.c, f.d);
    directory = f.c.directory;
    if (setupFn) extra = setupFn(f.c, f.d);
  } finally {
    f.c.close();
  }
  const service = createService({ root: path.resolve(__dirname, '..'), directory });
  const server = service.server();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  const requestRaw = async (route, body, token) => {
    const response = await fetch(base + route, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, buffer };
  };
  const request = async (route, body, token) => {
    const response = await requestRaw(route, body, token);
    const text = response.buffer.toString('utf8');
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: response.status, body: json };
  };
  try {
    await runFn({ service, request, requestRaw, extra });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    service.core.close();
  }
}

function createEmptyGroup(core, director, section, turno = 'Noche') {
  const refGroup = core.record('groups', 'GRP-BD-001');
  return core.saveGroup(director, {
    programId: refGroup.programId,
    moduleId: refGroup.moduleId,
    periodId: refGroup.periodId,
    units: [...refGroup.units],
    section,
    turno,
    name: `Grupo Prueba Eliminación ${section}`,
  });
}

test('rechaza eliminar grupo abierto con 0 estudiantes y grupo cerrado con estudiantes activos', async () => {
  await withServer(
    (core, director) => {
      const openEmpty = createEmptyGroup(core, director, 'Z');
      const openWithStudent = createEmptyGroup(core, director, 'Y');
      const student = core.saveStudent(director, {
        document: '88880001',
        name: 'PRUEBA ACTIVO, Alumno Uno',
      });
      core.enroll(director, {
        studentId: student.id,
        groupId: openWithStudent.id,
        startDate: '2026-03-20',
      });
      const closedWithStudent = core.closure(director, {
        groupId: openWithStudent.id,
        rev: openWithStudent.rev,
        closed: true,
        reason: 'Cierre de prueba con matrícula activa',
      });
      return { openEmpty, closedWithStudent };
    },
    async ({ request, extra }) => {
      const login = await request('login', { username: 'director', password: 'Director2026!' });
      assert.equal(login.status, 200);
      const token = login.body.token;

      const resOpen = await request(
        'groups/delete',
        { id: extra.openEmpty.id, rev: extra.openEmpty.rev, reason: 'Intento sobre grupo abierto' },
        token
      );
      assert.equal(resOpen.status, 409);
      assert.match(resOpen.body.error, /cerrar registro|abierto/i);

      const resActiveStudents = await request(
        'groups/delete',
        {
          id: extra.closedWithStudent.id,
          rev: extra.closedWithStudent.rev,
          reason: 'Intento con alumno activo',
        },
        token
      );
      assert.equal(resActiveStudents.status, 409);
      assert.match(resActiveStudents.body.error, /0 estudiantes/i);
    }
  );
});

test('rechaza eliminar grupo cerrado sin alumnos si tiene solicitud pendiente, nota registrada o entrega documental', () => {
  const f = fixture();
  configure(f.c, f.d);
  try {
    const core = f.c;
    const director = f.d;
    const docente = core.users().find((u) => u.username === 'alejandrina.ayna');

    // 1) Solicitud pendiente
    const gReq = createEmptyGroup(core, director, 'W');
    core.reassignGroupTeacher(director, {
      groupId: gReq.id,
      teacherId: docente.id,
      units: gReq.units,
    });
    core.requestStudentRegistration(core.user(docente.id), {
      groupId: gReq.id,
      document: '88880002',
      name: 'SOLICITUD PENDIENTE, Alumno',
    });
    const gReqClosed = core.closure(director, {
      groupId: gReq.id,
      rev: gReq.rev,
      closed: true,
      reason: 'Cerrar con solicitud pendiente',
    });
    assert.throws(
      () =>
        core.deleteGroup(director, {
          id: gReqClosed.id,
          rev: gReqClosed.rev,
          reason: 'Intento con solicitud pendiente',
        }),
      (err) => err.status === 409 && /solicitudes.*pendientes/i.test(err.message)
    );

    // 2) Calificación real registrada sobre matrícula luego retirada
    const gGrade = createEmptyGroup(core, director, 'V');
    core.reassignGroupTeacher(director, {
      groupId: gGrade.id,
      teacherId: docente.id,
      units: gGrade.units,
    });
    const st = core.saveStudent(director, {
      document: '88880003',
      name: 'CON NOTA, Alumno',
    });
    const en = core.enroll(director, {
      studentId: st.id,
      groupId: gGrade.id,
      startDate: '2026-03-20',
    });
    core.saveAcademic(core.user(docente.id), 'grades', {
      groupId: gGrade.id,
      unit: 'UD1',
      indicator: 'IL1',
      rows: [{ enrollmentId: en.id, value: 16 }],
    });
    core.retireEnrollment(director, {
      id: en.id,
      rev: en.rev,
      date: '2026-03-25',
      reason: 'Retiro tras registrar nota',
    });
    const gGradeClosed = core.closure(director, {
      groupId: gGrade.id,
      rev: gGrade.rev,
      closed: true,
      reason: 'Cierre con nota',
    });
    assert.throws(
      () =>
        core.deleteGroup(director, {
          id: gGradeClosed.id,
          rev: gGradeClosed.rev,
          reason: 'Intento con nota registrada',
        }),
      (err) => err.status === 409 && /calificaciones|asistencias|entregas/i.test(err.message)
    );

    // 3) Entrega documental registrada
    const gSub = createEmptyGroup(core, director, 'U');
    core.write(director, 'documentSubmissions', {
      id: 'SUB-TEST-LOCK',
      groupId: gSub.id,
      unit: 'UD1',
      templateId: 'TMPL-05',
      authorId: docente.id,
      authorName: docente.name,
      status: 'ENTREGADO',
      pdf: '',
      createdAt: new Date().toISOString(),
    });
    const gSubClosed = core.closure(director, {
      groupId: gSub.id,
      rev: gSub.rev,
      closed: true,
      reason: 'Cierre con entrega documental',
    });
    assert.throws(
      () =>
        core.deleteGroup(director, {
          id: gSubClosed.id,
          rev: gSubClosed.rev,
          reason: 'Intento con entrega',
        }),
      (err) => err.status === 409 && /calificaciones|asistencias|entregas/i.test(err.message)
    );
  } finally {
    f.c.close();
  }
});

test('bloquea eliminación para SECRETARIA y DOCENTE (403) aunque el grupo esté cerrado y vacío', async () => {
  await withServer(
    (core, director) => {
      const g = createEmptyGroup(core, director, 'T');
      return core.closure(director, {
        groupId: g.id,
        rev: g.rev,
        closed: true,
        reason: 'Cierre para prueba RBAC',
      });
    },
    async ({ request, extra }) => {
      const secLogin = await request('login', { username: 'carmen.vilca', password: 'Carmen2026!' });
      assert.equal(secLogin.status, 200);
      const secRes = await request(
        'groups/delete',
        { id: extra.id, rev: extra.rev, reason: 'Intento secretaría' },
        secLogin.body.token
      );
      assert.equal(secRes.status, 403);

      const docLogin = await request('login', {
        username: 'alejandrina.ayna',
        password: 'Alejandrina2026!',
      });
      assert.equal(docLogin.status, 200);
      const docRes = await request(
        'groups/delete',
        { id: extra.id, rev: extra.rev, reason: 'Intento docente' },
        docLogin.body.token
      );
      assert.equal(docRes.status, 403);
    }
  );
});

test('DIRECTOR elimina grupo cerrado con 0 alumnos vía HTTP, libera docente, archiva config, limpia workspace y conserva salud SQLite', async () => {
  await withServer(
    (core, director) => {
      const g = createEmptyGroup(core, director, 'S');
      const teacher = core.users().find((u) => u.username === 'magda.chura');
      core.reassignGroupTeacher(director, {
        groupId: g.id,
        teacherId: teacher.id,
        units: g.units,
      });
      D.saveSettings(core, director, {
        scope: { kind: 'unit', target: g.id, unit: 'UD1' },
        fields: { capacity: 'Capacidad temporal de grupo vacío' },
        rev: null,
      });
      D.saveSettings(core, director, {
        scope: { kind: 'unitCurriculum', target: g.id, unit: 'UD1' },
        fields: { dateOrigin: 'REFERENCIAL_TEST' },
        rev: null,
      });
      const closed = core.closure(director, {
        groupId: g.id,
        rev: g.rev,
        closed: true,
        reason: 'Grupo cerrado sin alumnos para eliminación',
      });
      return { closed, teacherId: teacher.id };
    },
    async ({ service, request, extra }) => {
      const login = await request('login', { username: 'director', password: 'Director2026!' });
      assert.equal(login.status, 200);
      const token = login.body.token;

      // Seleccionar el grupo como workspace activo antes de eliminarlo
      const sel = await request(
        'workspace',
        {
          year: '2026',
          programId: extra.closed.programId,
          moduleId: extra.closed.moduleId,
          groupId: extra.closed.id,
          mode: 'MODULE',
        },
        token
      );
      assert.equal(sel.status, 200);

      const del = await request(
        'groups/delete',
        {
          id: extra.closed.id,
          rev: extra.closed.rev,
          reason: 'Cierre y eliminación de grupo vacío',
        },
        token
      );
      assert.equal(del.status, 200);
      assert.equal(del.body.archived, true);
      assert.equal(del.body.deleteReason, 'Cierre y eliminación de grupo vacío');
      assert.ok(del.body.deletedAt);

      // Desaparece de dashboard (con y sin workspace activo) y de workspace/options
      const dash = await request('dashboard', undefined, token);
      assert.equal(dash.status, 200);
      assert.equal(dash.body.workspace, null);
      assert.equal(dash.body.groups.some((g) => g.id === extra.closed.id), false);

      const opts = await request('workspace/options', undefined, token);
      assert.equal(opts.status, 200);
      assert.equal(opts.body.groups.some((g) => g.id === extra.closed.id), false);

      // Docente desasignado en users y userDirectory
      const teacherUser = service.core.user(extra.teacherId);
      assert.equal(teacherUser.assignments.length, 0);
      assert.equal(teacherUser.assignmentPending, true);
      const dirUser = service.core.record('userDirectory', extra.teacherId);
      assert.equal(dirUser.assignments.length, 0);
      assert.equal(dirUser.assignmentPending, true);

      // documentSettings del grupo archivados
      for (const settingId of [
        `group:${extra.closed.id}`,
        `unit:${extra.closed.id}:UD1`,
        `unitCurriculum:${extra.closed.id}:UD1`,
      ]) {
        const rec = service.core.record('documentSettings', settingId);
        if (rec) assert.equal(rec.archived, true);
      }

      const director = service.core.users().find((u) => u.username === 'director');
      const health = service.core.databaseHealth(director);
      assert.equal(health.healthy, true);
      assert.deepEqual(health.errors, []);
    }
  );
});

test('DIRECTOR elimina grupo cerrado con 0 alumnos activos preservando matrícula retirada y emisión histórica en SQLite y API', async () => {
  await withServer(
    (core, director) => {
      const g = createEmptyGroup(core, director, 'R');
      const st = core.saveStudent(director, {
        document: '88880004',
        name: 'RETIRADO HISTORICO, Alumno',
      });
      const en = core.enroll(director, {
        studentId: st.id,
        groupId: g.id,
        startDate: '2026-03-20',
      });
      const doc = core.document(director, {
        groupId: g.id,
        templateId: 'TMPL-20',
        enrollmentId: en.id,
      });
      const pdfBytes = Buffer.from('%PDF-1.4\n%copia-historica-tmpl20\n');
      const emission = core.recordDocumentEmission(director, doc, pdfBytes);
      core.retireEnrollment(director, {
        id: en.id,
        rev: en.rev,
        date: '2026-03-25',
        reason: 'Retiro antes de cerrar y eliminar grupo vacío',
      });
      const closed = core.closure(director, {
        groupId: g.id,
        rev: g.rev,
        closed: true,
        reason: 'Cierre de grupo sin estudiantes activos',
      });
      return { closed, enrollmentId: en.id, emissionId: emission.id };
    },
    async ({ service, request, requestRaw, extra }) => {
      const login = await request('login', { username: 'director', password: 'Director2026!' });
      assert.equal(login.status, 200);
      const token = login.body.token;

      // Control optimista estricto de revisión (sin rev o rev obsoleto => 409)
      const missingRev = await request(
        'groups/delete',
        { id: extra.closed.id, reason: 'Sin revisión' },
        token
      );
      assert.equal(missingRev.status, 409);

      const staleRev = await request(
        'groups/delete',
        { id: extra.closed.id, rev: 'rev-obsoleta-000', reason: 'Revisión obsoleta' },
        token
      );
      assert.equal(staleRev.status, 409);

      const del = await request(
        'groups/delete',
        {
          id: extra.closed.id,
          rev: extra.closed.rev,
          reason: 'Grupo cerrado con 0 alumnos activos',
        },
        token
      );
      assert.equal(del.status, 200);
      assert.equal(del.body.archived, true);

      // Respaldo preventivo generado antes de archivar el grupo
      const backupsDir = path.join(service.core.directory, 'backups');
      const backupFiles = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];
      assert.ok(backupFiles.some((name) => name.includes('antes-eliminar-grupo')));

      // Trazabilidad preservada intacta en SQLite y accesible por API para Dirección y Secretaría
      const retiredEn = service.core.record('enrollments', extra.enrollmentId);
      assert.ok(retiredEn);
      assert.equal(retiredEn.active, false);
      const preservedEmission = service.core.record('documentEmissions', extra.emissionId);
      assert.ok(preservedEmission);

      const dirEmissions = await request(
        `document/emissions?groupId=${encodeURIComponent(extra.closed.id)}`,
        undefined,
        token
      );
      assert.equal(dirEmissions.status, 200);
      assert.ok(dirEmissions.body.some((item) => item.id === extra.emissionId));

      const reprint = await requestRaw(
        'document/emissions/reprint',
        { id: extra.emissionId },
        token
      );
      assert.equal(reprint.status, 200);
      assert.ok(reprint.buffer.toString('utf8').startsWith('%PDF-1.4'));

      const secLogin = await request('login', { username: 'carmen.vilca', password: 'Carmen2026!' });
      assert.equal(secLogin.status, 200);
      const secEmissions = await request(
        `document/emissions?groupId=${encodeURIComponent(extra.closed.id)}`,
        undefined,
        secLogin.body.token
      );
      assert.equal(secEmissions.status, 200);
      assert.ok(secEmissions.body.some((item) => item.id === extra.emissionId));

      // Aislamiento DOCENTE: nunca ve emisiones de un aula archivada ni ajena
      const docLogin = await request('login', {
        username: 'alejandrina.ayna',
        password: 'Alejandrina2026!',
      });
      assert.equal(docLogin.status, 200);
      const docEmissions = await request(
        `document/emissions?groupId=${encodeURIComponent(extra.closed.id)}`,
        undefined,
        docLogin.body.token
      );
      assert.equal(docEmissions.status, 200);
      assert.equal(docEmissions.body.some((item) => item.id === extra.emissionId), false);

      // Auditoría registra contadores de preservación
      const auditRow = service.core.db
        .prepare("SELECT value FROM audit WHERE json_extract(value, '$.action') = 'GROUP_DELETED' ORDER BY rowid DESC LIMIT 1")
        .get();
      assert.ok(auditRow);
      const auditEntry = JSON.parse(auditRow.value);
      assert.equal(auditEntry.detail.closed, true);
      assert.equal(auditEntry.detail.retiredEnrollmentsPreserved, 1);
      assert.equal(auditEntry.detail.documentEmissionsPreserved, 1);

      // Salud SQLite íntegra sin errores
      const director = service.core.users().find((u) => u.username === 'director');
      const health = service.core.databaseHealth(director);
      assert.equal(health.healthy, true);
      assert.deepEqual(health.errors, []);
    }
  );
});

test('registros documentSettings sin rev (bug legado) se detectan, permiten deleteGroup en caliente y se autorreparan al abrir OfflineCore', () => {
  const f = fixture();
  configure(f.c, f.d);
  const directory = f.c.directory;
  try {
    const core = f.c;
    const director = f.d;

    // Parte A: eliminar en caliente cuando existen unit:<id>:UD* sin rev (undefined)
    const gLive = createEmptyGroup(core, director, 'P');
    core.putRecord('documentSettings', {
      id: `unit:${gLive.id}:UD1`,
      scope: { kind: 'unit', target: gLive.id, unit: 'UD1' },
      fields: { name: 'Unidad Didáctica UD1' },
    });
    core.putRecord('documentSettings', {
      id: `unit:${gLive.id}:EFSRT`,
      scope: { kind: 'unit', target: gLive.id, unit: 'EFSRT' },
      fields: { name: 'EFSRT' },
    });

    const healthBeforeHot = core.databaseHealth(director);
    assert.ok(
      healthBeforeHot.warnings.some((w) => w.code === 'MISSING_REVISION' && w.id === `unit:${gLive.id}:UD1`)
    );

    const gLiveClosed = core.closure(director, {
      groupId: gLive.id,
      rev: gLive.rev,
      closed: true,
      reason: 'Cierre de grupo con settings heredados sin rev',
    });
    const deletedHot = core.deleteGroup(director, {
      id: gLiveClosed.id,
      rev: gLiveClosed.rev,
      reason: 'Eliminación en caliente con settings sin rev',
    });
    assert.equal(deletedHot.archived, true);
    const archivedSetting = core.record('documentSettings', `unit:${gLive.id}:UD1`);
    assert.equal(archivedSetting.archived, true);
    assert.ok(typeof archivedSetting.rev === 'string' && archivedSetting.rev.length > 0);

    // Concurrencia optimista estricta sigue exigiendo rev cuando sí existe
    assert.throws(
      () =>
        core.write(
          director,
          'documentSettings',
          { ...archivedSetting, fields: { name: 'Cambio sin rev' } },
          null
        ),
      (err) => err.status === 409
    );

    // Parte B: autorreparación automática al abrir OfflineCore
    const gReopen = createEmptyGroup(core, director, 'Q');
    core.putRecord('documentSettings', {
      id: `unit:${gReopen.id}:UD1`,
      scope: { kind: 'unit', target: gReopen.id, unit: 'UD1' },
      fields: { name: 'Unidad sin rev antes de reiniciar' },
    });
    const gReopenClosed = core.closure(director, {
      groupId: gReopen.id,
      rev: gReopen.rev,
      closed: true,
      reason: 'Cierre previo a reinicio',
    });
    assert.ok(
      core
        .databaseHealth(director)
        .warnings.some((w) => w.code === 'MISSING_REVISION' && w.id === `unit:${gReopen.id}:UD1`)
    );
    core.close();

    const reopened = new OfflineCore(directory, null);
    try {
      const dirDirector = reopened.users().find((u) => u.role === 'DIRECTOR');
      const repairedSetting = reopened.record('documentSettings', `unit:${gReopen.id}:UD1`);
      assert.ok(typeof repairedSetting.rev === 'string' && repairedSetting.rev.length > 0);

      const healthAfterReopen = reopened.databaseHealth(dirDirector);
      assert.equal(healthAfterReopen.healthy, true);
      assert.deepEqual(healthAfterReopen.errors, []);
      assert.equal(
        healthAfterReopen.warnings.some((w) => w.code === 'MISSING_REVISION'),
        false
      );

      const deletedAfterReopen = reopened.deleteGroup(dirDirector, {
        id: gReopenClosed.id,
        rev: gReopenClosed.rev,
        reason: 'Eliminación tras autorreparación',
      });
      assert.equal(deletedAfterReopen.archived, true);
    } finally {
      reopened.close();
    }
  } finally {
    try {
      f.c.close();
    } catch {}
  }
});

test('CeproBdCatalog.seedCatalog sella rev en registros unit: y omite grupos archivados', () => {
  const f = fixture();
  configure(f.c, f.d);
  try {
    const core = f.c;
    const director = f.d;

    const existingMod = core.record('modules', 'MOD-001');
    core.write(
      director,
      'modules',
      {
        ...(existingMod || {}),
        id: 'MOD-001',
        nombre: 'Módulo 001 Prueba Catálogo',
        programaId: 'PROG-001',
        academicYear: '2026',
        archived: false,
      },
      existingMod ? existingMod.rev : null
    );

    const gActive = core.saveGroup(director, {
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      periodId: '2026-I',
      units: ['UD1', 'EFSRT'],
      section: 'M',
      turno: 'Noche',
      name: 'Automotriz Activo MOD-001',
    });

    const gClosed = core.saveGroup(director, {
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      periodId: '2026-I',
      units: ['UD1', 'EFSRT'],
      section: 'N',
      turno: 'Noche',
      name: 'Automotriz Archivado MOD-001',
    });
    const gClosedDone = core.closure(director, {
      groupId: gClosed.id,
      rev: gClosed.rev,
      closed: true,
      reason: 'Cierre previo a archivado',
    });
    core.deleteGroup(director, {
      id: gClosedDone.id,
      rev: gClosedDone.rev,
      reason: 'Grupo archivado antes de proyectar catálogo',
    });

    CeproBdCatalog.seedCatalog(core, { user: director });

    const activeUnit = core.record('documentSettings', `unit:${gActive.id}:UD1`);
    assert.ok(activeUnit, 'Debe crearse unit: para grupo activo');
    assert.ok(typeof activeUnit.rev === 'string' && activeUnit.rev.length > 0);

    const archivedUnit = core.record('documentSettings', `unit:${gClosed.id}:UD1`);
    assert.equal(archivedUnit, null, 'No debe recrear unit: para un grupo ya archivado');

    const health = core.databaseHealth(director);
    assert.equal(health.healthy, true);
    assert.equal(
      health.warnings.some((w) => w.code === 'MISSING_REVISION'),
      false
    );
  } finally {
    f.c.close();
  }
});
