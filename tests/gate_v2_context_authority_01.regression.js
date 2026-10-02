const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const URL = 'http://127.0.0.1:8081/';
const up = () => new Promise(resolve => {
  const req = http.get(URL, res => { res.resume(); resolve(res.statusCode === 200); });
  req.on('error', () => resolve(false)); req.setTimeout(1000, () => { req.destroy(); resolve(false); });
});
async function run() {
  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    for (let i = 0; i < 40 && !await up(); i += 1) await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!await up()) throw new Error('Servidor candidato 8081 no disponible.');
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage();
    const startupErrors = [];
    page.on('pageerror', error => startupErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') startupErrors.push(message.text().slice(0, 280)); });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#db-status-badge')?.textContent.includes('Datos locales disponibles') || document.querySelector('#candidate-runtime-banner')?.textContent.includes('BLOQUEADA'));
    if (await page.$eval('#candidate-runtime-banner', node => node.textContent.includes('BLOQUEADA'))) {
      const bad = await page.evaluate(async () => {
        for (const file of ['/app/js/ui/layout.js','/app/js/ui/efsrt-view.js','/app/js/ui/evaluation-view.js','/app/js/ui/attendance-view.js','/app/js/ui/enrollments-view.js','/app/js/ui/closure-view.js','/app/js/app.js']) {
          try { await import(file); } catch (error) { return `${file}: ${error.message}`; }
        }
        return 'No import error';
      });
      throw new Error(`${await page.$eval('#main-content', node => node.textContent.slice(0, 160))}; import=${bad}; JS: ${startupErrors.join(' | ')}`);
    }
    const outcome = await page.evaluate(async () => {
      const checks = [];
      const check = (id, condition) => checks.push({ id, passed: Boolean(condition) });
      const rejects = async (fn, fragment) => {
        try { await fn(); return false; } catch (error) { return error.message.includes(fragment); }
      };
      const { getDB } = await import('/app/js/db/database.js');
      const { SchemaV2BackupLabService, readV2Snapshot } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const { AcademicContextAuthorityService } = await import('/app/js/services/academic-context-authority-service.js');
      const { V2GroupAssignmentService, detectDualSourceInconsistencies } = await import('/app/js/v2-candidate/candidate-services.js');
      const { AttendanceService } = await import('/app/js/services/attendance-service.js');
      const { EvaluationService } = await import('/app/js/services/evaluation-service.js');
      const { EfsrtService } = await import('/app/js/services/efsrt-service.js');
      const { AcademicReadinessService } = await import('/app/js/services/academic-readiness-service.js');
      const { AcademicClosureReadinessService } = await import('/app/js/services/academic-closure-readiness-service.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { TemplateRegistry } = await import('/app/js/services/template-registry.js');
      const { CONFIG } = await import('/app/js/config.js');
      const real = getDB();
      const before = await readV2Snapshot(real);
      const beforeCounts = Object.fromEntries(Object.entries(before).map(([name, rows]) => [name, rows.length]));
      const labName = 'CETPRO_V2_CONTEXT_AUTHORITY_LAB';
      const lab = await SchemaV2BackupLabService.createEmptyDatabase(labName);
      const put = (store, row) => new Promise((resolve, reject) => {
        const tx = lab.transaction(store, 'readwrite');
        tx.objectStore(store).put(row); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
      });
      const get = (store, id) => new Promise((resolve, reject) => {
        const req = lab.transaction(store, 'readonly').objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error);
      });
      const group = { id: 'GAC-SYNTH-1', codigoVisible: 'REPEATED', sourceGroupCode: 'REPEATED', programaId: 'PROG-SYNTH-1', moduloId: null, periodoId: null, estado: 'ACTIVE' };
      const member = { id: 'MAT-SYNTH-1', estudianteId: 'EST-SYNTH-1', programaId: 'PROG-SYNTH-1', grupoId: group.id, grupoCode: 'REPEATED', moduloId: null, periodoId: null };
      await put('programas', { id: 'PROG-SYNTH-1', nombre: 'Programa sintético' });
      await put('programas', { id: 'PROG-SYNTH-2', nombre: 'Otro programa sintético' });
      await put('modulos', { id: 'MOD-SYNTH-1', programaId: 'PROG-SYNTH-1', nombre: 'Módulo sintético' });
      await put('periodos', { id: 'PER-SYNTH-1', estado: 'ACTIVO', nombre: 'Periodo sintético' });
      await put('grupos_academicos', group);
      await put('matriculas', member);
      const authority = new AcademicContextAuthorityService(() => lab);
      check('T-V2CA-01-VALID-GROUPID', (await authority.resolveEnrollment(member.id)).groupId === group.id);
      check('T-V2CA-02-MISSING-GROUPID', await rejects(() => authority.resolveGroup('NO-EXISTE'), 'INCONSISTENCY'));
      check('T-V2CA-03-OTHER-PROGRAM', await rejects(async () => {
        await put('matriculas', { ...member, programaId: 'PROG-SYNTH-2' }); await authority.resolveEnrollment(member.id);
      }, 'INCONSISTENCY'));
      await put('matriculas', member);
      check('T-V2CA-04-NULL-MODULE', (await authority.resolveEnrollment(member.id)).moduloId === null);
      check('T-V2CA-05-NULL-PERIOD', (await authority.resolveEnrollment(member.id)).periodoId === null);
      await put('grupos_academicos', { ...group, moduloId: 'MOD-SYNTH-1', periodoId: 'PER-SYNTH-1' });
      check('T-V2CA-06-CONFIRMED-MODULE', (await authority.resolveEnrollment(member.id)).moduloId === 'MOD-SYNTH-1');
      check('T-V2CA-07-CONFIRMED-PERIOD', (await authority.resolveEnrollment(member.id)).periodoId === 'PER-SYNTH-1');
      await put('matriculas', { ...member, moduloId: 'MOD-SYNTH-1', periodoId: 'PER-SYNTH-1' });
      check('T-V2CA-08-EQUAL-SNAPSHOT', (await authority.resolveEnrollment(member.id)).moduloId === 'MOD-SYNTH-1');
      await put('matriculas', { ...member, moduloId: 'MOD-OTHER' });
      check('T-V2CA-09-DIVERGENT-SNAPSHOT', await rejects(() => authority.resolveEnrollment(member.id), 'INCONSISTENCY'));
      await put('matriculas', member);
      await put('grupos_academicos', group);
      await put('matriculas', { ...member, moduloId: 'MOD-SYNTH-1', periodoId: 'PER-SYNTH-1' });
      check('T-V2CA-10-NO-LEGACY-ELEVATION', (await authority.resolveEnrollment(member.id)).moduloId === null && (await authority.resolveEnrollment(member.id)).periodoId === null);
      await put('matriculas', member);
      check('T-V2CA-11-REVIEW-NOT-CORRUPTION', detectDualSourceInconsistencies({ ...group, estado: 'REVIEW_REQUIRED', reviewReasons: ['PROVENANCE'] }, [member]).length === 0);
      check('T-V2CA-12-REAL-INCONSISTENCY', detectDualSourceInconsistencies(group, [{ ...member, programaId: 'PROG-SYNTH-2' }]).length === 1);
      await put('grupos_academicos', { ...group, id: 'GAC-SYNTH-2', periodoId: 'PER-SYNTH-1' });
      await put('matriculas', { ...member, id: 'MAT-SYNTH-2', grupoId: 'GAC-SYNTH-2' });
      check('T-V2CA-13-REPEATED-CODE', (await authority.resolveEnrollment('MAT-SYNTH-2')).groupId !== (await authority.resolveEnrollment(member.id)).groupId);
      check('T-V2CA-14-CODE-ONLY-REJECTED', await rejects(() => authority.resolveGroup('REPEATED'), 'INCONSISTENCY'));
      check('T-V2CA-15-REGISTRO-GROUPID', await rejects(() => new AttendanceService().registerBatchAttendance({ groupId: 'GAC-V1-GRP-BD-001', asistencias: [] }), 'B-004/B-007'));
      check('T-V2CA-16-EVALUACION-GROUPID', await rejects(() => new EvaluationService().registerBatchEvaluation({ groupId: 'GAC-V1-GRP-BD-001', evaluaciones: [] }), 'B-004/B-007'));
      check('T-V2CA-17-EFSRT-GROUPID', await rejects(() => new EfsrtService().registerEfsrt({ groupId: 'GAC-V1-GRP-BD-001', matriculaId: before.matriculas[0]?.id }), 'B-004/B-007'));
      const closing = await new AcademicClosureReadinessService().evaluateClosureReadiness(before.matriculas[0]?.id);
      check('T-V2CA-18-CIERRE-GROUPID', closing.groupId === before.matriculas[0]?.grupoId && !closing.academicClosureAllowed);
      const documental = await new DocumentDataService().buildGroupContext(before.grupos_academicos[0]?.id);
      check('T-V2CA-19-DOCUMENT-GROUPID', documental.source.groupId === before.grupos_academicos[0]?.id && !documental.module.id);
      check('T-V2CA-20-TMPL-PARITY', Boolean(new TemplateRegistry().getAll().find(item => item.templateId === 'TMPL-02' && item.contextType === 'ENROLLMENT')) && Boolean(new TemplateRegistry().getAll().find(item => item.templateId === 'TMPL-01' && item.blockers.includes('B-004'))));
      check('T-V2CA-21-ROLLBACK', await rejects(() => new V2GroupAssignmentService(() => lab).assignModule({ groupId: group.id, moduloId: 'MOD-SYNTH-1', confirmed: true, simulateFailure: true }), 'SIMULATED') && (await get('grupos_academicos', group.id)).moduloId === null);
      await put('matriculas', { ...member, moduloId: 'MOD-OTHER' });
      check('T-V2CA-21B-PROPOSED-DUAL-SOURCE', await rejects(() => new V2GroupAssignmentService(() => lab).assignModule({ groupId: group.id, moduloId: 'MOD-SYNTH-1', confirmed: true }), 'INCONSISTENCY') && (await get('grupos_academicos', group.id)).moduloId === null);
      await put('matriculas', member);
      await put('grupos_academicos', { ...group, estado: 'REVIEW_REQUIRED', reviewReasons: ['PROVENANCE'] });
      check('T-V2CA-21C-REVIEW-BLOCK', await rejects(() => new V2GroupAssignmentService(() => lab).assignModule({ groupId: group.id, moduloId: 'MOD-SYNTH-1', confirmed: true }), 'revisión') && (await get('grupos_academicos', group.id)).moduloId === null);
      await put('grupos_academicos', group);
      const summary = await new AcademicReadinessService().getAcademicReadinessSummary();
      check('T-V2CA-22-DASHBOARD', summary.totalGroups === 12 && summary.groupsWithModule === 0 && summary.periodosCount === 0 && summary.totalUnits === 0);
      const routes = ['registro', 'efsrt', 'cierre'];
      for (const route of routes) { location.hash = `#/${route}`; await new Promise(resolve => setTimeout(resolve, 350)); }
      const ux = document.querySelector('#main-content')?.textContent || '';
      check('T-V2CA-23-UX-CANDIDATE', ux.includes('Cierre Académico Permitido') && !ux.includes('CETPRO_DB'));
      check('T-V2CA-24-PRODUCTION-GUARD', CONFIG.DB.NAME === 'CETPRO_V2_CANDIDATE' && CONFIG.DB.VERSION === 2 && real.name !== 'CETPRO_DB' && lab.name !== 'CETPRO_DB');
      const after = await readV2Snapshot(real);
      const afterCounts = Object.fromEntries(Object.entries(after).map(([name, rows]) => [name, rows.length]));
      check('T-V2CA-25-COUNTS-UNCHANGED', JSON.stringify(beforeCounts) === JSON.stringify(afterCounts) && afterCounts.estudiantes === 269 && afterCounts.matriculas === 295 && afterCounts.grupos_academicos === 12 && afterCounts.programas === 7 && afterCounts.modulos === 14 && afterCounts.periodos === 0 && afterCounts.unidades === 0);
      lab.close();
      await new Promise(resolve => { const req = indexedDB.deleteDatabase(labName); req.onsuccess = resolve; req.onerror = resolve; });
      return { checks, counts: afterCounts };
    });
    for (const row of outcome.checks) console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${row.id}`);
    return { total: outcome.checks.length, passed: outcome.checks.filter(row => row.passed).length,
      failed: outcome.checks.filter(row => !row.passed).length, counts: outcome.counts };
  } finally { await browser.close(); if (server) server.kill(); }
}
module.exports = { name: 'GATE-V2-CONTEXT-AUTHORITY-01', run };



