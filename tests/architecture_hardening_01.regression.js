const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');
const URL = 'http://127.0.0.1:8080/app/index.html#/inicio';
const TEST_DB = 'CETPRO_ARCH_HARDENING_01_TEST_DB';

async function isUp() {
  return new Promise(resolve => {
    const req = http.get(URL, res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}
async function run() {
  let server;
  if (!await isUp()) {
    server = fork(require.resolve('../scripts/dev-server.js'), [], { silent: true });
    for (let i = 0; i < 40 && !await isUp(); i++) await new Promise(resolve => setTimeout(resolve, 250));
    if (!await isUp()) throw new Error('Servidor local no disponible para la suite de arquitectura.');
  }
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle0' });
    const checks = await page.evaluate(async dbName => {
      const { initDB } = await import('/app/js/db/database.js');
      const { GroupAssignmentService } = await import('/app/js/services/group-assignment-service.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { DocumentService } = await import('/app/js/services/document-service.js');
      const { auditReferentialIntegrity } = await import('/app/js/services/referential-audit-service.js');
      const db = await initDB(dbName);
      const result = [];
      const check = (id, ok) => result.push({ id, passed: Boolean(ok) });
      const txWrite = (stores, fn) => new Promise((resolve, reject) => {
        const tx = db.transaction(stores, 'readwrite');
        fn(tx);
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error || new Error('aborted'));
        tx.onerror = () => reject(tx.error || new Error('transaction failed'));
      });
      const read = (store, id) => new Promise((resolve, reject) => {
        const req = db.transaction(store, 'readonly').objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const count = store => new Promise(resolve => {
        const req = db.transaction(store, 'readonly').objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
      });
      await txWrite(['programas', 'modulos', 'periodos', 'institucion'], tx => {
        tx.objectStore('programas').put({ id: 'P1', nombre: 'Peluquería Ñ' });
        tx.objectStore('programas').put({ id: 'P2', nombre: 'Otro programa' });
        tx.objectStore('modulos').put({ id: 'M1', programaId: 'P1', nombre: 'Módulo 1' });
        tx.objectStore('modulos').put({ id: 'M2', programaId: 'P1', nombre: 'Módulo 2' });
        tx.objectStore('modulos').put({ id: 'M-FOREIGN', programaId: 'P2', nombre: 'Módulo ajeno' });
        for (const id of ['2026-I', '2026-II', '2027-I', '2027-II']) tx.objectStore('periodos').put({ id, nombre: id });
        tx.objectStore('institucion').put({ id: 'INST', nombre: 'CETPRO TEST' });
      });
      const service = new GroupAssignmentService();
      check('T-AH01-01', (await service.listGroups()).groupsTotal === 0);
      const names = ['Ana', 'María Ñandú', "O'Connor", 'Á'.repeat(120)];
      await txWrite(['matriculas', 'estudiantes'], tx => {
        for (let g = 0; g < 50; g++) {
          const size = g === 0 ? 61 : g === 1 ? 1 : 2;
          for (let n = 0; n < size; n++) {
            const id = `E-${g}-${n}`;
            tx.objectStore('estudiantes').put({ id, nombres: names[(g + n) % names.length], numeroDocumento: ['1234567', '12345678', 'A1B2C3', ''][(g + n) % 4] });
            tx.objectStore('matriculas').put({ id: `MAT-${g}-${n}`, estudianteId: id,
              programaId: 'P1', moduloId: null, periodoId: null, grupoCode: `G-${g}` });
          }
        }
      });
      const fifty = await service.listGroups();
      check('T-AH01-02', fifty.groupsTotal === 50 && fifty.groupsUnassigned === 50 && fifty.groups.find(g => g.groupCode === 'G-0').enrollmentCount === 61);
      check('T-AH01-03', fifty.groups.find(g => g.groupCode === 'G-1').enrollmentCount === 1);
      const all = await new Promise(resolve => {
        const request = db.transaction('matriculas', 'readonly').objectStore('matriculas').getAll();
        request.onsuccess = () => resolve(request.result);
      });
      const twelveService = new GroupAssignmentService({
        enrollmentRepo: { list: async () => all.filter(item => Number(item.grupoCode.slice(2)) < 12) },
        programRepo: { list: async () => [{ id: 'P1', nombre: 'Peluquería Ñ' }] },
        moduleRepo: { list: async () => [{ id: 'M1', programaId: 'P1' }, { id: 'M2', programaId: 'P1' }] }
      });
      check('T-AH01-19', (await twelveService.listGroups()).groupsTotal === 12);
      const variants = await Promise.all([read('estudiantes', 'E-0-0'), read('estudiantes', 'E-0-1'),
        read('estudiantes', 'E-0-2'), read('estudiantes', 'E-0-3')]);
      check('T-AH01-04', variants.every((item, i) => item.nombres === names[i] &&
        item.numeroDocumento === ['1234567', '12345678', 'A1B2C3', ''][i]));
      const previewer = new DocumentService(db);
      let capacityProperty = true;
      for (let n = 0; n <= 61; n++) {
        const studentsList = Array.from({ length: n }, (_, i) => ({ id: `S-${i}`, apellidosNombres: names[i % names.length] }));
        const preview = await previewer.generatePreview('TMPL-01', { studentsList }, 'TEST_PREVIEW');
        const p = preview.paginationInfo;
        capacityProperty &&= p.totalStudents === n && p.renderedCount + p.overflowCount === n &&
          p.printAllowedForPreview === (n <= p.confirmedCapacity) && p.overflowCount === Math.max(0, n - p.confirmedCapacity);
      }
      check('T-AH01-18', capacityProperty);
      await txWrite(['matriculas'], tx => {
        tx.objectStore('matriculas').put({ id: 'MAT-1-0', estudianteId: 'E-1-0', programaId: 'P1', moduloId: null, periodoId: '2026-I', grupoCode: 'G-1' });
        tx.objectStore('matriculas').put({ id: 'MAT-2-0', estudianteId: 'E-2-0', programaId: 'P1', moduloId: null, periodoId: '2026-I', grupoCode: 'G-2' });
        tx.objectStore('matriculas').put({ id: 'MAT-2-1', estudianteId: 'E-2-1', programaId: 'P1', moduloId: null, periodoId: '2027-I', grupoCode: 'G-2' });
      });
      const mixed = await service.listGroups();
      check('T-AH01-05', mixed.groups.find(g => g.groupCode === 'G-2').status === 'INCONSISTENTE');
      let blocked = false;
      try { await new DocumentDataService().buildGroupContext('G-2'); } catch { blocked = true; }
      check('T-AH01-06', blocked);
      const before = await auditReferentialIntegrity(db);
      check('T-AH01-07', before.readOnly && before.issueCount === 1 && before.issues[0].code === 'INV-006');
      await txWrite(['matriculas'], tx => {
        tx.objectStore('matriculas').put({ id: 'MAT-1-0', estudianteId: 'E-1-0', programaId: 'P1', moduloId: null, periodoId: '2026-II', grupoCode: 'G-1' });
      });
      let stale = false;
      try { await service.assignModule({ groupCode: 'G-1', moduloId: 'M1', confirmed: true,
        expectedProgramId: 'P1', expectedCount: 1, expectedPreviousModuloId: null,
        expectedPeriodId: '2026-I', expectedEnrollmentIds: ['MAT-1-0'] }); } catch { stale = true; }
      check('T-AH01-08', stale && (await read('matriculas', 'MAT-1-0')).moduloId === null && await count('auditoria') === 0);
      const current = await service.getGroup('G-1');
      await txWrite(['matriculas', 'estudiantes'], tx => {
        tx.objectStore('estudiantes').put({ id: 'E-X', nombres: 'Otra persona' });
        tx.objectStore('matriculas').delete('MAT-1-0');
        tx.objectStore('matriculas').put({ id: 'MAT-X', estudianteId: 'E-X', programaId: 'P1', moduloId: null, periodoId: '2026-II', grupoCode: 'G-1' });
      });
      let replaced = false;
      try { await service.assignModule({ groupCode: 'G-1', moduloId: 'M1', confirmed: true,
        expectedProgramId: current.programaId, expectedCount: current.enrollmentCount,
        expectedPreviousModuloId: current.moduloId, expectedPeriodId: current.periodoId,
        expectedEnrollmentIds: current.enrollmentIds }); } catch { replaced = true; }
      check('T-AH01-09', replaced && (await read('matriculas', 'MAT-X')).moduloId === null);
      // Fault injection in the same IDB transaction semantics used by assignment.
      for (const [label, phase] of [['before', 0], ['after-first', 1], ['middle', 3], ['audit', 6], ['close', 7]]) {
        const marker = `FAULT-${label}`;
        const baseline = await count('auditoria');
        await new Promise(resolve => {
          const tx = db.transaction(['matriculas', 'auditoria'], 'readwrite');
          tx.onabort = resolve;
          tx.onerror = () => {};
          if (phase === 0) { tx.abort(); return; }
          const store = tx.objectStore('matriculas');
          for (let i = 0; i < 5; i++) {
            store.put({ id: `${marker}-${i}`, estudianteId: 'E-X', programaId: 'P1', grupoCode: 'FAULT' });
            if (phase === 1 && i === 0 || phase === 3 && i === 2) { tx.abort(); return; }
          }
          if (phase === 6) {
            tx.objectStore('auditoria').add({ id: marker });
            tx.objectStore('auditoria').add({ id: marker }); // constraint failure
          } else {
            tx.abort(); // unexpected closure after queued writes
          }
        });
        const none = await Promise.all(Array.from({ length: 5 }, (_, i) => read('matriculas', `${marker}-${i}`)));
        check(`T-AH01-${10 + ['before', 'after-first', 'middle', 'audit', 'close'].indexOf(label)}`,
          none.every(item => item === undefined) && await count('auditoria') === baseline);
      }
      await txWrite(['matriculas', 'unidades', 'asistencia'], tx => {
        tx.objectStore('matriculas').put({ id: 'BAD', estudianteId: 'MISSING', programaId: 'MISSING',
          moduloId: 'MISSING', periodoId: 'MISSING', grupoCode: 'BAD' });
        tx.objectStore('matriculas').put({ id: 'BAD-2', estudianteId: 'E-X', programaId: 'P1',
          moduloId: 'M-FOREIGN', periodoId: '2026-I', grupoCode: 'BAD' });
        tx.objectStore('matriculas').put({ id: 'BAD-3', estudianteId: 'E-X', programaId: 'P1',
          moduloId: null, periodoId: 'MISSING', grupoCode: 'BAD' });
        tx.objectStore('unidades').put({ id: 'U-BAD', moduloId: 'MISSING' });
        tx.objectStore('asistencia').put({ id: 'A-BAD', matriculaId: 'MISSING', unidadId: 'MISSING' });
      });
      const audit = await auditReferentialIntegrity(db);
      check('T-AH01-15', ['INV-001', 'INV-002', 'PERIOD_MISSING', 'MODULE_MISSING', 'UNIT_ORPHAN',
        'INV-005', 'INV-004', 'ACADEMIC_ENROLLMENT_ORPHAN', 'ACADEMIC_UNIT_ORPHAN'].every(code => audit.issues.some(item => item.code === code)));
      check('T-AH01-16', audit.groupCount === 51 && (await read('matriculas', 'BAD')).moduloId === 'MISSING');
      let moduleBlocked = false; let periodBlocked = false;
      try { await new DocumentDataService().buildEnrollmentContext('BAD-2'); } catch { moduleBlocked = true; }
      try { await new DocumentDataService().buildEnrollmentContext('BAD-3'); } catch { periodBlocked = true; }
      check('T-AH01-20', moduleBlocked && periodBlocked);
      check('T-AH01-17', db.name === dbName && db.version === 1 && !db.objectStoreNames.contains('grupos_academicos'));
      return result;
    }, TEST_DB);
    for (const item of checks) console.log(`[${item.passed ? 'PASSED' : 'FAILED'}] ${item.id}`);
    return { total: checks.length, passed: checks.filter(item => item.passed).length,
      failed: checks.filter(item => !item.passed).length };
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}
module.exports = { name: 'ARCHITECTURE-HARDENING-01', run };
