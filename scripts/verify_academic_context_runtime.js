/* ACADEMIC-CONTEXT-01: navegador + IndexedDB aislada, sin asignar CETPRO_DB. */
const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const URL = 'http://127.0.0.1:8080/app/index.html#/inicio';
const TEST_DB = 'CETPRO_ACADEMIC_CONTEXT_01_TEST_DB';
async function isServerRunning() {
  return new Promise(resolve => {
    const request = http.get(URL, response => { response.resume(); resolve(response.statusCode === 200); });
    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => { request.destroy(); resolve(false); });
  });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await isServerRunning()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('No se inició el servidor local de pruebas.');
}
function caseCheck(results, id, passed, detail = '') {
  results.push({ id, passed: Boolean(passed), detail });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}${detail ? ': ' + detail : ''}`);
}

async function run() {
  const results = [];
  let server = null;
  if (!await isServerRunning()) {
    server = fork(require.resolve('./dev-server.js'), [], { silent: true });
    await waitForServer();
  }
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  const externalRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:8080/') && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) {
      externalRequests.push(request.url());
    }
  });
  try {
    await page.goto(URL, { waitUntil: 'networkidle0' });
    const fixture = await page.evaluate(async dbName => {
      const { initDB } = await import('/app/js/db/database.js');
      const db = await initDB(dbName);
      const vector = [36, 15, 24, 17, 25, 20, 26, 70, 28, 7, 20, 7];
      const programIds = ['PROG-001', 'PROG-002', 'PROG-003', 'PROG-004', 'PROG-005', 'PROG-006', 'PROG-007'];
      const programs = programIds.map((id, i) => ({ id, nombre: `PROGRAMA AISLADO ${i + 1}`, estado: 'ACTIVO' }));
      const modules = programIds.flatMap((id, i) => [1, 2].map(n => ({
        id: `TEST-MOD-${i + 1}-${n}`, programaId: id,
        nombre: `MÓDULO AISLADO ${i + 1}.${n}`, nombreOficial: `MÓDULO AISLADO ${i + 1}.${n}`
      })));
      const enrollments = [];
      const students = [];
      vector.forEach((count, groupIndex) => {
        const code = `TEST-GRP-${String(groupIndex + 1).padStart(3, '0')}`;
        for (let index = 0; index < count; index++) {
          const id = `TEST-MAT-${String(enrollments.length + 1).padStart(3, '0')}`;
          const studentId = `TEST-EST-${String(students.length + 1).padStart(3, '0')}`;
          students.push({ id: studentId, nombres: `PERSONA ${students.length + 1}` });
          enrollments.push({ id, estudianteId: studentId, grupoCode: code,
            programaId: programIds[groupIndex % programIds.length], moduloId: null,
            periodoId: null, incidencias: [{ codigo: 'MODULO_PENDIENTE' }] });
        }
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['programas', 'modulos', 'matriculas', 'estudiantes', 'institucion'], 'readwrite');
        programs.forEach(item => tx.objectStore('programas').put(item));
        modules.forEach(item => tx.objectStore('modulos').put(item));
        enrollments.forEach(item => tx.objectStore('matriculas').put(item));
        students.forEach(item => tx.objectStore('estudiantes').put(item));
        tx.objectStore('institucion').put({ id: 'TEST-INST', nombre: 'INSTITUCIÓN AISLADA' });
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
      return { vector, total: enrollments.length, firstGroup: 'TEST-GRP-001',
        secondGroup: 'TEST-GRP-002', firstModule: modules[0].id,
        secondModule: modules[1].id, wrongModule: modules[2].id };
    }, TEST_DB);
    const state = await page.evaluate(async () => {
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      return new GroupAssignmentService().listGroups();
    });
    caseCheck(results, 'T-AC01-01', state.groupsTotal === 12 && state.groups.every(group => group.groupCode.startsWith('TEST-GRP-')), 'Listado derivado del store, 12 grupos');
    caseCheck(results, 'T-AC01-02', state.groups.reduce((total, group) => total + group.enrollmentCount, 0) === 295 &&
      state.groups.map(group => group.enrollmentCount).every((count, i) => count === fixture.vector[i]), 'Vector dinámico 295');
    caseCheck(results, 'T-AC01-03', state.groupsUnassigned === 12 && state.groupsAssigned === 0 &&
      state.groupsInconsistent === 0 && state.b004CandidateForPhysicalConfirmation === false &&
      state.b004Resolved === false, 'Ninguna asignación automática; B-004 abierta');
    const moduleChoices = await page.evaluate(async programId => {
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      return new GroupAssignmentService().modulesForProgram(programId);
    }, 'PROG-001');
    caseCheck(results, 'T-AC01-04', moduleChoices.length === 2 && moduleChoices.every(module => module.programaId === 'PROG-001'), 'Selector desde modulos de DB aislada');
    const enrollmentFilter = await page.evaluate(async () => {
      const { EnrollmentsView } = await import('/app/js/ui/enrollments-view.js');
      await EnrollmentsView.render(document.querySelector('#main-content'));
      return { options: [...document.querySelectorAll('#filter-group option')].map(option => option.textContent),
        legacyModal: Boolean(document.querySelector('#group-config-modal')) };
    });
    caseCheck(results, 'T-AC01-04B', enrollmentFilter.options.length === 13 &&
      enrollmentFilter.options.some(option => option.includes('TEST-GRP-001 (36 matrículas)')) &&
      !enrollmentFilter.legacyModal, 'Filtro Matrículas desde DB; modal legado retirado');
    await page.evaluate(async () => {
      history.replaceState(null, '', '#/grupos');
      const { GroupAssignmentView } = await import('/app/js/ui/group-assignment-view.js');
      await GroupAssignmentView.render(document.querySelector('#main-content'));
    });
    const uiBefore = await page.evaluate(() => ({ rows: document.querySelectorAll('.group-action').length,
      value: document.querySelector('#group-module-select')?.value,
      summary: document.querySelector('#group-assignment-summary')?.textContent }));
    caseCheck(results, 'T-AC01-05', uiBefore.rows === 12 && uiBefore.summary.includes('12 grupos'), 'UX lista 12 grupos sin fixture hardcodeado');
    await page.$eval('.group-action', button => button.click());
    await page.waitForFunction(() => document.querySelector('#group-assignment-dialog')?.style.display === 'flex');
    const opened = await page.evaluate(() => ({ value: document.querySelector('#group-module-select').value,
      disabled: document.querySelector('#group-confirm').disabled }));
    caseCheck(results, 'T-AC01-06', opened.value === '' && opened.disabled, 'Abrir no preselecciona ni guarda');
    await page.select('#group-module-select', fixture.firstModule);
    const selected = await page.evaluate(() => ({ impact: document.querySelector('#group-selected-impact').textContent,
      enabled: !document.querySelector('#group-confirm').disabled }));
    const beforeSelectionWrite = await page.evaluate(async code => {
      const { EnrollmentRepository } = await import('/app/js/repositories/enrollment-repository.js');
      return (await new EnrollmentRepository().getByGrupoCode(code)).every(item => item.moduloId === null);
    }, fixture.firstGroup);
    caseCheck(results, 'T-AC01-06A', selected.enabled && selected.impact.includes('36 matrículas afectadas') &&
      beforeSelectionWrite, 'Seleccionar muestra impacto pero no persiste');
    page.once('dialog', dialog => dialog.dismiss());
    await page.$eval('#group-confirm', button => button.click());
    const afterRejectedConfirm = await page.evaluate(async code => {
      const { EnrollmentRepository } = await import('/app/js/repositories/enrollment-repository.js');
      return (await new EnrollmentRepository().getByGrupoCode(code)).every(item => item.moduloId === null);
    }, fixture.firstGroup);
    caseCheck(results, 'T-AC01-06B', afterRejectedConfirm, 'Rechazar confirmación no guarda');
    await page.$eval('#group-cancel', button => button.click());
    const beforeAssignment = await page.evaluate(async code => {
      const { EnrollmentRepository } = await import('/app/js/repositories/enrollment-repository.js');
      return (await new EnrollmentRepository().getByGrupoCode(code)).every(item => item.moduloId === null);
    }, fixture.firstGroup);
    caseCheck(results, 'T-AC01-07', beforeAssignment, 'Cancelar no modifica matrículas');

    const assign = params => page.evaluate(async input => {
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      try { return { ok: true, result: await new GroupAssignmentService().assignModule(input) }; }
      catch (error) { return { ok: false, message: error.message }; }
    }, params);
    const common = { groupCode: fixture.firstGroup, expectedProgramId: 'PROG-001', expectedCount: 36 };
    const denied = await assign({ ...common, moduloId: fixture.firstModule });
    caseCheck(results, 'T-AC01-08', !denied.ok && /confirmar/i.test(denied.message), 'Servicio exige confirmación');
    const wrong = await assign({ ...common, moduloId: fixture.wrongModule, confirmed: true });
    caseCheck(results, 'T-AC01-09', !wrong.ok && /no pertenece al programa del grupo/i.test(wrong.message), 'Programa cruzado bloqueado');
    const stale = await assign({ ...common, expectedCount: 35, moduloId: fixture.firstModule, confirmed: true });
    const staleNoWrite = await page.evaluate(async code => {
      const { EnrollmentRepository } = await import('/app/js/repositories/enrollment-repository.js');
      return (await new EnrollmentRepository().getByGrupoCode(code)).every(item => item.moduloId === null);
    }, fixture.firstGroup);
    caseCheck(results, 'T-AC01-10', !stale.ok && staleNoWrite, 'Transacción aborta con impacto obsoleto, cero escritura parcial');
    const rollbackAfterWrites = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      const { EnrollmentRepository } = await import('/app/js/repositories/enrollment-repository.js');
      const db = getDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('auditoria', 'readwrite');
        tx.objectStore('auditoria').add({ id: 'TEST-AUDIT-DUPLICATE', accion: 'FIXTURE' });
        tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
      });
      const dbProvider = () => ({ transaction(stores, mode) {
        const raw = db.transaction(stores, mode);
        const realObjectStore = raw.objectStore.bind(raw);
        return new Proxy(raw, {
          get(target, key) {
            if (key === 'objectStore') return name => {
              const store = realObjectStore(name);
              if (name !== 'auditoria') return store;
              return { add: record => store.add({ ...record, id: 'TEST-AUDIT-DUPLICATE' }) };
            };
            const value = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
          set(target, key, value) { return Reflect.set(target, key, value, target); }
        });
      } });
      let rejected = false;
      try {
        await new GroupAssignmentService({ dbProvider }).assignModule({
          groupCode: 'TEST-GRP-003', moduloId: 'TEST-MOD-3-1',
          expectedProgramId: 'PROG-003', expectedCount: 24, confirmed: true
        });
      } catch { rejected = true; }
      const members = await new EnrollmentRepository().getByGrupoCode('TEST-GRP-003');
      return { rejected, count: members.length, allNull: members.every(item => item.moduloId === null) };
    });
    caseCheck(results, 'T-AC01-10B', rollbackAfterWrites.rejected &&
      rollbackAfterWrites.count === 24 && rollbackAfterWrites.allNull,
      'Fallo de auditoría tras encolar 24 updates revierte el grupo completo');
    const valid = await assign({ ...common, moduloId: fixture.firstModule, confirmed: true });
    const post = await page.evaluate(async ({ firstGroup, secondGroup, firstModule }) => {
      const { EnrollmentRepository } = await import('/app/js/repositories/enrollment-repository.js');
      const repo = new EnrollmentRepository();
      const first = await repo.getByGrupoCode(firstGroup);
      const second = await repo.getByGrupoCode(secondGroup);
      return { count: first.length, all: first.every(item => item.moduloId === firstModule),
        noPending: first.every(item => !item.incidencias.some(issue => issue.codigo === 'MODULO_PENDIENTE')),
        other: second.every(item => item.moduloId === null && item.periodoId === null) };
    }, fixture);
    caseCheck(results, 'T-AC01-11', valid.ok && valid.result.affectedCount === 36 && post.count === 36 && post.all && post.noPending && post.other,
      '36 matrículas actualizadas; otro grupo intacto');
    const audit = await page.evaluate(async id => {
      const { getDB } = await import('/app/js/db/database.js');
      const db = getDB();
      return new Promise(resolve => {
        const request = db.transaction('auditoria', 'readonly').objectStore('auditoria').get(id);
        request.onsuccess = () => resolve(request.result || null);
      });
    }, valid.result.auditId);
    caseCheck(results, 'T-AC01-12', audit?.estadoNuevo?.matriculasAfectadas === 36 &&
      audit?.estadoAnterior?.moduloId === null && audit?.estadoNuevo?.moduloId === fixture.firstModule &&
      !JSON.stringify(audit).includes('TEST-EST-'), 'Auditoría atómica sin datos personales');
    const reassignDenied = await assign({ ...common, moduloId: fixture.secondModule, confirmed: true,
      expectedPreviousModuloId: fixture.firstModule });
    const reassigned = await assign({ ...common, moduloId: fixture.secondModule, confirmed: true,
      changeConfirmed: true, expectedPreviousModuloId: fixture.firstModule });
    caseCheck(results, 'T-AC01-13', !reassignDenied.ok && /Cambiar módulo/i.test(reassignDenied.message) &&
      reassigned.ok && reassigned.result.previousModuloId === fixture.firstModule && reassigned.result.moduloId === fixture.secondModule,
      'Reasignación exige acción explícita y audita anterior → nuevo');

    await page.evaluate(async ({ secondGroup, wrongModule }) => {
      const { getDB } = await import('/app/js/db/database.js');
      const db = getDB();
      const members = await new Promise(resolve => {
        const request = db.transaction('matriculas', 'readonly').objectStore('matriculas').index('grupoCode').getAll(secondGroup);
        request.onsuccess = () => resolve(request.result);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('matriculas', 'readwrite');
        tx.objectStore('matriculas').put({ ...members[0], moduloId: wrongModule });
        tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
      });
    }, fixture);
    const inconsistent = await page.evaluate(async code => {
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const summary = await new GroupAssignmentService().listGroups();
      let blocked = false;
      try { await new DocumentDataService().buildGroupContext(code); } catch { blocked = true; }
      return { status: summary.groups.find(group => group.groupCode === code)?.status,
        groupsInconsistent: summary.groupsInconsistent, blocked };
    }, fixture.secondGroup);
    caseCheck(results, 'T-AC01-14', inconsistent.status === 'INCONSISTENTE' && inconsistent.groupsInconsistent === 1 && inconsistent.blocked,
      'Grupo mixto no alimenta documentos');
    const groupContext = await page.evaluate(async code => {
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const context = await new DocumentDataService().buildGroupContext(code);
      return { count: context.enrollments.length, students: context.students.length,
        module: context.module.id, program: context.program.id, period: context.period,
        units: context.units, curriculum: context.curriculum, source: context.source };
    }, fixture.firstGroup);
    caseCheck(results, 'T-AC01-15', groupContext.count === 36 && groupContext.students === 36 &&
      groupContext.module === fixture.secondModule && groupContext.program === 'PROG-001' &&
      Object.keys(groupContext.period).length === 0 && groupContext.units.length === 0 &&
      groupContext.curriculum.units.length === 0 && groupContext.source.periodStatus === 'BLOCKED_B007' &&
      groupContext.source.curriculumStatus === 'BLOCKED_B002', 'buildGroupContext sin periodo/currículo inventados');
    const counts = await page.evaluate(async dbName => {
      const { getDB } = await import('/app/js/db/database.js');
      const test = getDB();
      const count = async (db, store) => new Promise(resolve => {
        const request = db.transaction(store, 'readonly').objectStore(store).count();
        request.onsuccess = () => resolve(request.result);
      });
      const result = { testDb: test.name, students: await count(test, 'estudiantes'),
        enrollments: await count(test, 'matriculas'), periods: await count(test, 'periodos'),
        units: await count(test, 'unidades') };
      // El gate candidato no abre ni siquiera una CETPRO_DB vacía del perfil headless.
      result.productDbOpened = false;
      return result;
    }, TEST_DB);
    caseCheck(results, 'T-AC01-16', counts.testDb === TEST_DB && counts.students === 295 && counts.enrollments === 295 &&
      counts.periods === 0 && counts.units === 0 && counts.productDbOpened === false,
      'Pruebas en DB aislada; CETPRO_DB nunca se abre');
    caseCheck(results, 'T-AC01-17', pageErrors.length === 0, `Consola sin errores JS (${pageErrors.length})`);
    await page.reload({ waitUntil: 'networkidle0' });
    const reloaded = await page.evaluate(async dbName => {
      const { initDB } = await import('/app/js/db/database.js');
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      const { GroupAssignmentView } = await import('/app/js/ui/group-assignment-view.js');
      await initDB(dbName);
      await GroupAssignmentView.render(document.querySelector('#main-content'));
      const summary = await new GroupAssignmentService().listGroups();
      return { total: summary.groupsTotal, assigned: summary.groupsAssigned,
        inconsistent: summary.groupsInconsistent,
        moduleId: summary.groups.find(group => group.groupCode === 'TEST-GRP-001')?.moduloId,
        rows: document.querySelectorAll('.group-action').length };
    }, TEST_DB);
    caseCheck(results, 'T-AC01-18', reloaded.total === 12 && reloaded.assigned === 1 &&
      reloaded.inconsistent === 1 && reloaded.moduleId === fixture.secondModule && reloaded.rows === 11,
      'Recarga de DB aislada conserva asignación y estado');
    caseCheck(results, 'T-AC01-19', externalRequests.length === 0, `Cero llamadas obligatorias a Internet (${externalRequests.length})`);
    const outcome = { total: results.length, passed: results.filter(item => item.passed).length,
      failed: results.filter(item => !item.passed).length, dbName: TEST_DB, results };
    console.log(JSON.stringify(outcome, null, 2));
    return outcome;
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

if (require.main === module) run().then(result => {
  if (result.failed) process.exitCode = 1;
}).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
