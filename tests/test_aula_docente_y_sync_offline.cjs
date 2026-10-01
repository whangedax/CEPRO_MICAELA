const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const BASE_URL = 'http://127.0.0.1:8081';

async function runTest() {
  console.log('--- Iniciando prueba de Aula Docente (Carrera->Grupo) y Sincronización Offline ---');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('BROWSER_PAGE_ERROR:', err.message);
  });

  try {
    const navigateToHash = async (hash) => {
      await page.evaluate(h => { window.location.hash = h; }, hash);
      await new Promise(r => setTimeout(r, 600));
    };

    // 1. Cargar aplicación y cambiar a rol DOCENTE
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'load' });
    await page.waitForSelector('#user-role-widget');
    await new Promise(r => setTimeout(r, 600));

    await page.click('#user-role-widget');
    await page.waitForSelector('.role-card-option[data-role-id="DOCENTE"]', { visible: true });
    await new Promise(r => setTimeout(r, 300));
    await page.click('.role-card-option[data-role-id="DOCENTE"]');
    await new Promise(r => setTimeout(r, 800));

    // Fijar explícitamente el aula en GRP-BD-007 (Computación Presencial)
    await page.evaluate(async () => {
      const ctx = await import('/app/js/services/teacher-context-service.js');
      ctx.TeacherContextService.setActiveProgramId('PROG-005');
      ctx.TeacherContextService.setActiveGroupCode('GRP-BD-007');
    });
    await new Promise(r => setTimeout(r, 600));

    // 2. Verificar en #/estudiantes que solo aparecen los 26 alumnos del aula GRP-BD-007
    await navigateToHash('#/estudiantes');
    await page.waitForSelector('#student-list-container');
    await new Promise(r => setTimeout(r, 600));

    const g007RowsCount = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });
    console.log(`Alumnos en aula GRP-BD-007 (Computación Presencial): ${g007RowsCount}`);
    if (g007RowsCount !== 26) {
      throw new Error(`Se esperaban exactamente 26 alumnos para el aula GRP-BD-007, pero hay ${g007RowsCount}`);
    }
    console.log('✓ PASS: Aula GRP-BD-007 muestra exactamente sus 26 alumnos');

    const path76 = path.join(ARTIFACTS_DIR, '76_docente_aula_computacion_presencial.png');
    await page.screenshot({ path: path76 });
    console.log(`✓ Screenshot guardado: ${path76}`);

    // 3. Cambiar de aula a GRP-BD-008 (Computación Virtual) mediante el selector de aula
    console.log('Conmutando de aula a GRP-BD-008 (Virtual)...');
    await page.select('#teacher-classroom-select', 'GRP-BD-008');
    await new Promise(r => setTimeout(r, 800));

    const g008RowsCount = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });
    console.log(`Alumnos en aula GRP-BD-008 (Computación Virtual): ${g008RowsCount}`);
    if (g008RowsCount !== 69) {
      throw new Error(`Se esperaban exactamente 69 alumnos únicos para el aula GRP-BD-008 (70 matrículas), pero hay ${g008RowsCount}`);
    }
    console.log('✓ PASS: Aula GRP-BD-008 muestra exactamente sus 69 alumnos únicos');

    const path77 = path.join(ARTIFACTS_DIR, '77_docente_aula_computacion_virtual.png');
    await page.screenshot({ path: path77 });
    console.log(`✓ Screenshot guardado: ${path77}`);

    // 4. Cambiar de carrera a CORTE Y ENSAMBLAJE y aula Mañana (GRP-BD-009)
    console.log('Conmutando a carrera PROG-006 (Corte) y aula GRP-BD-009 (Mañana)...');
    await page.select('#teacher-program-filter-select', 'PROG-006');
    await new Promise(r => setTimeout(r, 800));

    const g009RowsCount = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });
    console.log(`Alumnos en aula GRP-BD-009 (Corte y Ensamblaje Mañana): ${g009RowsCount}`);
    if (g009RowsCount !== 28) {
      throw new Error(`Se esperaban exactamente 28 alumnos para el aula GRP-BD-009, pero hay ${g009RowsCount}`);
    }
    console.log('✓ PASS: Aula GRP-BD-009 muestra exactamente sus 28 alumnos');

    const path78 = path.join(ARTIFACTS_DIR, '78_docente_aula_corte_manana.png');
    await page.screenshot({ path: path78 });
    console.log(`✓ Screenshot guardado: ${path78}`);

    // 5. TEST DE SMART MERGE: Simulación de actualización de Secretaría a Docente sin perder notas
    console.log('\n--- Probando Fusión Inteligente (Smart Merge Offline) ---');
    const mergeResult = await page.evaluate(async () => {
      const syncMod = await import('/app/js/services/sync-package-service.js');
      const etapa2Mod = await import('/app/js/services/etapa2-data-service.js');
      const ctxMod = await import('/app/js/services/teacher-context-service.js');
      const syncService = new syncMod.SyncPackageService();
      const etapa2Service = new etapa2Mod.Etapa2DataService();

      // Regresar al aula GRP-BD-007
      ctxMod.TeacherContextService.setActiveProgramId('PROG-005');
      ctxMod.TeacherContextService.setActiveGroupCode('GRP-BD-007');

      // Paso A: Docente registra una nota de prueba de 19 para un estudiante existente
      const existingStudentId = 'EST-IMP-BD-011';
      etapa2Service.saveEvaluation('GRP-BD-007', 1, {
        evaluationsByEnrollment: {
          [existingStudentId]: {
            finalLogro: 19
          }
        }
      });

      // Paso B: Secretaría envía un paquete con 1 estudiante nuevo incorporado a GRP-BD-007
      const simulatedPackage = {
        app: 'CETPRO_SISTEMA_ACADEMICO_V2',
        version: 2,
        tipoPaquete: syncMod.SYNC_PACKAGE_TYPES.ENROLLMENTS,
        fechaExportacion: new Date().toISOString(),
        origen: 'SECRETARIA_ACADEMICA',
        estudiantes: [
          {
            id: 'EST-TEST-NUEVO-001',
            tipoDocumento: 'DNI',
            numeroDocumento: '77889900',
            apellidoPaterno: 'ALUMNO',
            apellidoMaterno: 'NUEVO',
            nombres: 'Prueba Sincronizacion',
            sexo: 'M',
            estado: 'ACTIVO',
            fuente: 'SECRETARIA_OFFLINE'
          }
        ],
        matriculas: [
          {
            id: 'MAT-TEST-NUEVO-001',
            estudianteId: 'EST-TEST-NUEVO-001',
            grupoCode: 'GRP-BD-007',
            grupoId: 'GAC-V1-GRP-BD-007',
            programaId: 'PROG-005',
            estado: 'CONFIRMADA'
          }
        ]
      };

      // Paso C: El docente importa el paquete en su laptop
      const report = await syncService.importSecretariaEnrollmentPackage(simulatedPackage);

      // Paso D: Verificar que la nota anterior del alumno existente SIGUE INTACTA
      const evalAfterMerge = etapa2Service.getEvaluation('GRP-BD-007', 1);
      const preservedGrade = evalAfterMerge?.evaluationsByEnrollment?.[existingStudentId]?.finalLogro;

      return {
        report,
        preservedGrade,
        gradePreservedCorrectly: preservedGrade === 19
      };
    });

    console.log('Resultado del Smart Merge:', mergeResult);
    if (!mergeResult.gradePreservedCorrectly) {
      throw new Error(`¡FALLA! La nota del docente se alteró o borró durante la fusión. Obtenido: ${mergeResult.preservedGrade}`);
    }
    console.log('✓ PASS: La nota previa (19) del docente se conservó 100% INTACTA tras la incorporación del nuevo alumno');

    // Refrescar #/estudiantes y verificar que ahora el aula tiene 27 alumnos (26 + 1 nuevo)
    const diag = await page.evaluate(async () => {
      const studentMod = await import('/app/js/services/student-service.js');
      const enrollMod = await import('/app/js/services/enrollment-service.js');
      const ctxMod = await import('/app/js/services/teacher-context-service.js');
      const studentsViewMod = await import('/app/js/ui/students-view.js');

      const allEst = await studentMod.StudentService.searchStudents();
      const allMat = await (new enrollMod.EnrollmentService()).listEnrollments();
      const filtered = ctxMod.TeacherContextService.filterStudentsByGroup(allEst, allMat, 'GRP-BD-007');

      // Forzar re-render de StudentsView en #main-content
      const main = document.getElementById('main-content');
      if (main) {
        await studentsViewMod.StudentsView.render(main);
      }

      return {
        totalEst: allEst.length,
        totalMat: allMat.length,
        filteredInG007: filtered.length,
        activeGroupCode: ctxMod.TeacherContextService.getActiveGroupCode(),
        activeProgramId: ctxMod.TeacherContextService.getActiveProgramId(),
        newEstFound: allEst.some(s => s.id === 'EST-TEST-NUEVO-001'),
        newMatFound: allMat.some(m => m.id === 'MAT-TEST-NUEVO-001')
      };
    });
    console.log('Diagnóstico post-merge:', diag);

    const rowsAfterMerge = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });
    console.log(`Total alumnos en GRP-BD-007 tras la fusión: ${rowsAfterMerge} alumnos`);
    if (rowsAfterMerge !== 27) {
      throw new Error(`Se esperaban 27 alumnos tras incorporar al nuevo alumno, pero hay ${rowsAfterMerge}`);
    }
    console.log('✓ PASS: El nuevo alumno se incorporó correctamente al aula del docente (26 -> 27 alumnos)');

    const path79 = path.join(ARTIFACTS_DIR, '79_smart_merge_offline_exitoso.png');
    await page.screenshot({ path: path79 });
    console.log(`✓ Screenshot guardado: ${path79}`);

    console.log('\n======================================================');
    console.log('✅ TODAS LAS PRUEBAS DE AULA Y SYNC OFFLINE PASARON CON ÉXITO');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ ERROR EN PRUEBA:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTest();
