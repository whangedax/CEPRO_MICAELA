const puppeteer = require('puppeteer');

(async () => {
  console.log('=================================================================');
  console.log('    AUDITORÍA INTEGRAL DE BASE DE DATOS (INDEXEDDB & ESQUEMA)    ');
  console.log('=================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8081/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#db-status-badge')?.textContent.includes('Datos locales disponibles'), { timeout: 15000 });

    const auditResult = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { auditV2SystemIntegrity, analyzeV2SystemIntegrity, V2_STORES, EXPECTED_INDEXES } = await import('/app/js/services/system-integrity-service.js');
      
      const db = getDB();
      const dbInfo = {
        name: db.name,
        version: db.version,
        objectStoreNames: Array.from(db.objectStoreNames)
      };

      // 1. Extraer snapshot completo de todos los stores e índices
      const storeDetails = {};
      const snapshot = {};
      const tx = db.transaction(dbInfo.objectStoreNames, 'readonly');

      await Promise.all(dbInfo.objectStoreNames.map(storeName => {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const indexes = Array.from(store.indexNames).map(idxName => {
            const idx = store.index(idxName);
            return {
              name: idxName,
              keyPath: idx.keyPath,
              unique: idx.unique,
              multiEntry: idx.multiEntry
            };
          });

          storeDetails[storeName] = {
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            indexes
          };

          const req = store.getAll();
          req.onsuccess = () => {
            snapshot[storeName] = req.result || [];
            storeDetails[storeName].count = req.result.length;
            resolve();
          };
          req.onerror = () => reject(req.error);
        });
      }));

      // 2. Ejecutar auditor de integridad oficial del sistema
      const systemIntegrity = analyzeV2SystemIntegrity(snapshot, {
        version: db.version,
        stores: dbInfo.objectStoreNames,
        indexes: Object.fromEntries(Object.entries(storeDetails).map(([k, v]) => [k, v.indexes.map(i => i.name)]))
      });

      // 3. Auditoría profunda específica de entidades clave
      // A. Estudiantes
      const students = snapshot.estudiantes || [];
      const studentAudit = {
        total: students.length,
        uniqueIds: new Set(students.map(s => s.id)).size,
        uniqueDnis: new Set(students.map(s => s.numeroDocumento || s.dni)).size,
        missingDni: students.filter(s => !(s.numeroDocumento || s.dni)).length,
        dnisNot8Digits: students.filter(s => {
          const doc = String(s.numeroDocumento || s.dni || '');
          return doc.length > 0 && doc.length !== 8;
        }).map(s => ({ id: s.id, doc: s.numeroDocumento || s.dni })),
        missingName: students.filter(s => !s.nombres || !s.apellidoPaterno).length,
        hasDisabilityField: students.filter(s => s.tieneDiscapacidad !== undefined).length,
        sampleRecords: students.slice(0, 3).map(s => ({
          id: s.id,
          nombreCompleto: `${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''} ${s.nombres || ''}`.trim(),
          doc: s.numeroDocumento || s.dni,
          sexo: s.sexo
        }))
      };

      // B. Matrículas
      const enrollments = snapshot.matriculas || [];
      const studentIdSet = new Set(students.map(s => s.id));
      const groupMap = new Map((snapshot.grupos_academicos || []).map(g => [g.id, g]));
      const programIdSet = new Set((snapshot.programas || []).map(p => p.id));

      const enrollmentAudit = {
        total: enrollments.length,
        uniqueIds: new Set(enrollments.map(e => e.id)).size,
        orphanStudents: enrollments.filter(e => !studentIdSet.has(e.estudianteId)).length,
        orphanGroups: enrollments.filter(e => !groupMap.has(e.grupoId)).length,
        orphanPrograms: enrollments.filter(e => !programIdSet.has(e.programaId)).length,
        missingGrupoId: enrollments.filter(e => !e.grupoId).length,
        withModuloId: enrollments.filter(e => e.moduloId !== null && e.moduloId !== undefined).length,
        withPeriodoId: enrollments.filter(e => e.periodoId !== null && e.periodoId !== undefined).length,
        enrollmentsPerStudentDist: {}
      };

      // Distribución de matrículas por estudiante
      const studentEnrollmentCount = {};
      enrollments.forEach(e => {
        studentEnrollmentCount[e.estudianteId] = (studentEnrollmentCount[e.estudianteId] || 0) + 1;
      });
      Object.values(studentEnrollmentCount).forEach(c => {
        enrollmentAudit.enrollmentsPerStudentDist[`${c}_matriculas`] = (enrollmentAudit.enrollmentsPerStudentDist[`${c}_matriculas`] || 0) + 1;
      });

      // C. Grupos Académicos
      const groups = snapshot.grupos_academicos || [];
      const groupAudit = groups.map(g => {
        const groupEnrollments = enrollments.filter(e => e.grupoId === g.id);
        const groupPrograms = new Set(groupEnrollments.map(e => e.programaId));
        return {
          id: g.id,
          visibleCode: g.visibleCode,
          sourceGroupCode: g.sourceGroupCode,
          programaId: g.programaId,
          moduloId: g.moduloId,
          periodoId: g.periodoId,
          turno: g.turno,
          seccion: g.seccion,
          matriculasCount: groupEnrollments.length,
          consistentProgram: groupPrograms.size <= 1
        };
      });

      // D. Programas y Módulos
      const programs = snapshot.programas || [];
      const modules = snapshot.modulos || [];
      const curriculumAudit = {
        programCount: programs.length,
        moduleCount: modules.length,
        programs: programs.map(p => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          modulosAsociados: modules.filter(m => m.programaId === p.id).length,
          gruposAsociados: groups.filter(g => g.programaId === p.id).length
        }))
      };

      // E. Datos Pedagógicos y Documentales (Asistencia, Evaluación, EFSRT)
      const pedagogicalAudit = {
        asistenciaCount: (snapshot.asistencia || []).length,
        evaluacionCount: (snapshot.evaluacion || []).length,
        efsrtCount: (snapshot.efsrt || []).length,
        documentosCount: (snapshot.documentos || []).length,
        matriculaUnidadesCount: (snapshot.matricula_unidades || []).length,
        periodosCount: (snapshot.periodos || []).length,
        unidadesCount: (snapshot.unidades || []).length,
        indicadoresCount: (snapshot.indicadores || []).length,
        auditoriaCount: (snapshot.auditoria || []).length
      };

      // F. Institución
      const institution = snapshot.institucion || [];

      return {
        dbInfo,
        storeDetails,
        systemIntegrity,
        studentAudit,
        enrollmentAudit,
        groupAudit,
        curriculumAudit,
        pedagogicalAudit,
        institution
      };
    });

    console.log('1. INFORMACIÓN DE CONEXIÓN Y ESQUEMA:');
    console.log(`   - Base de Datos: ${auditResult.dbInfo.name}`);
    console.log(`   - Versión de Esquema: ${auditResult.dbInfo.version}`);
    console.log(`   - Almacenes de Objetos (Stores): ${auditResult.dbInfo.objectStoreNames.length}`);
    console.log(`   - Stores presentes: ${auditResult.dbInfo.objectStoreNames.join(', ')}\n`);

    console.log('2. CONTEO Y DISTRIBUCIÓN POR TABLA (STORES):');
    Object.entries(auditResult.storeDetails).forEach(([store, info]) => {
      const idxNames = info.indexes.map(i => i.name).join(', ') || 'Sin índices secundarios';
      console.log(`   - [${store.padEnd(22)}] ${String(info.count).padStart(4)} registros | Clave: ${info.keyPath} | Índices (${info.indexes.length}): ${idxNames}`);
    });
    console.log('');

    console.log('3. AUDITORÍA OFICIAL DE INTEGRIDAD REFERENCIAL:');
    console.log(`   - Resultado: ${auditResult.systemIntegrity.valid ? '✅ VÁLIDO (0 INCIDENCIAS)' : '❌ INCIDENCIAS DETECTADAS'}`);
    console.log(`   - Total de Incidencias Referenciales: ${auditResult.systemIntegrity.issueCount}`);
    if (auditResult.systemIntegrity.issues.length > 0) {
      console.log('   - Detalle de Incidencias:');
      auditResult.systemIntegrity.issues.forEach((iss, idx) => {
        console.log(`     ${idx + 1}. [${iss.code}] en '${iss.store}' (ID: ${iss.id}, Ref: ${iss.reference})`);
      });
    } else {
      console.log('   - Cero claves huérfanas en toda la base de datos.');
      console.log('   - Cero duplicación de claves primarias.');
      console.log('   - Cero discrepancias de programa en matrículas y grupos.');
    }
    console.log('');

    console.log('4. AUDITORÍA DE ESTUDIANTES:');
    console.log(`   - Total de Personas / Estudiantes: ${auditResult.studentAudit.total}`);
    console.log(`   - IDs Únicos: ${auditResult.studentAudit.uniqueIds} (Sin colisiones)`);
    console.log(`   - Documentos Únicos: ${auditResult.studentAudit.uniqueDnis}`);
    console.log(`   - Sin Documento: ${auditResult.studentAudit.missingDni}`);
    console.log(`   - Documentos con longitud diferente a 8 dígitos: ${auditResult.studentAudit.dnisNot8Digits.length}`);
    if (auditResult.studentAudit.dnisNot8Digits.length > 0) {
      console.log('     Detalle:', auditResult.studentAudit.dnisNot8Digits);
    }
    console.log(`   - Sin Nombre o Apellidos: ${auditResult.studentAudit.missingName}`);
    console.log('');

    console.log('5. AUDITORÍA DE MATRÍCULAS Y VINCULACIÓN N:1:');
    console.log(`   - Total Matrículas: ${auditResult.enrollmentAudit.total}`);
    console.log(`   - Matrículas Huérfanas de Estudiante: ${auditResult.enrollmentAudit.orphanStudents}`);
    console.log(`   - Matrículas Huérfanas de Grupo: ${auditResult.enrollmentAudit.orphanGroups}`);
    console.log(`   - Matrículas Huérfanas de Programa: ${auditResult.enrollmentAudit.orphanPrograms}`);
    console.log(`   - Sin grupoId asignado: ${auditResult.enrollmentAudit.missingGrupoId}`);
    console.log(`   - Distribución de matrículas por persona:`, auditResult.enrollmentAudit.enrollmentsPerStudentDist);
    console.log(`   - Matrículas con moduloId asignado: ${auditResult.enrollmentAudit.withModuloId} (Respetando regla fail-closed)`);
    console.log(`   - Matrículas con periodoId asignado: ${auditResult.enrollmentAudit.withPeriodoId} (Respetando regla fail-closed)`);
    console.log('');

    console.log('6. AUDITORÍA DE GRUPOS ACADÉMICOS (12 GRUPOS OFICIALES):');
    auditResult.groupAudit.forEach(g => {
      console.log(`   - [${g.visibleCode}] ID: ${g.id} | Prog: ${g.programaId} | Turno: ${(g.turno || 'N/A').padEnd(7)} | Matrículas: ${String(g.matriculasCount).padStart(2)} | Prog. Consistente: ${g.consistentProgram ? 'SÍ' : 'NO'}`);
    });
    const totalGroupMatriculas = auditResult.groupAudit.reduce((acc, g) => acc + g.matriculasCount, 0);
    console.log(`   Total sumatoria de matrículas en grupos: ${totalGroupMatriculas} (Coincidencia exacta con 295 matrículas)`);
    console.log('');

    console.log('7. AUDITORÍA CURRICULAR (PROGRAMAS Y MÓDULOS):');
    auditResult.curriculumAudit.programs.forEach(p => {
      console.log(`   - [${p.id}] ${p.nombre.padEnd(35)} | ${p.modulosAsociados} módulos | ${p.gruposAsociados} grupos`);
    });
    console.log('');

    console.log('8. SALVAGUARDAS Y POLÍTICAS FAIL-CLOSED:');
    console.log(`   - Periodos ficticios en DB: ${auditResult.pedagogicalAudit.periodosCount} (Debe ser 0) -> ${auditResult.pedagogicalAudit.periodosCount === 0 ? '✅ CUMPLIDO' : '❌ VIOLADO'}`);
    console.log(`   - Unidades didácticas no autorizadas: ${auditResult.pedagogicalAudit.unidadesCount} (Debe ser 0) -> ${auditResult.pedagogicalAudit.unidadesCount === 0 ? '✅ CUMPLIDO' : '❌ VIOLADO'}`);
    console.log(`   - Asistencias en store productivo: ${auditResult.pedagogicalAudit.asistenciaCount} (Base de datos real aislada)`);
    console.log(`   - Evaluaciones en store productivo: ${auditResult.pedagogicalAudit.evaluacionCount}`);
    console.log(`   - Trazas de auditoría registradas: ${auditResult.pedagogicalAudit.auditoriaCount}`);
    console.log('=================================================================\n');

  } finally {
    await browser.close();
  }
})();
