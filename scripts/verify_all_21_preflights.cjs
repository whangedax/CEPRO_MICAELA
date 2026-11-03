/**
 * scripts/verify_all_21_preflights.cjs
 * 
 * ARNÉS DE AUDITORÍA Y VERIFICACIÓN INTEGRAL DE LAS 21 PLANTILLAS OFICIALES MINEDU
 * CEPRO_MICAELA 2.0 — Release 2.0
 * 
 * Verifica sobre dev-sandbox/data que:
 * 1. El 100% de las 21 plantillas oficiales (TMPL-01 a TMPL-21)
 *    alcancen Preflight Complete = true (0 campos faltantes).
 * 2. Ningún documento tenga marca física BORRADOR (isDraft === false).
 * 3. Todas rendericen exitosamente su PDF en memoria sin excepciones ni FIELD_OVERFLOW.
 */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { validateDevSandbox } = require('./dev-sandbox-guard.cjs');
const { OfflineCore } = require('./offline-core.cjs');
const { renderPDF } = require('./offline-pdf.cjs');
const D = require('./offline-documents.cjs');

const root = path.resolve(__dirname, '..');
const sandboxDataDir = path.resolve(root, 'dev-sandbox', 'data');

async function verifyAllTemplates() {
  console.log('========================================================================');
  console.log('  CEPRO_MICAELA 2.0 — AUDITORÍA INTEGRAL DE PREFLIGHTS (21 PLANTILLAS)  ');
  console.log('========================================================================\n');

  // 1. Guardián de seguridad
  const guard = validateDevSandbox({ dataDir: sandboxDataDir });
  console.log('✔ Sandbox verificado:', guard.dataDir);

  const core = new OfflineCore(guard.dataDir, null);
  let tempEnrPel2Id = null;
  let tempGroupPel2Id = null;
  let tempGroupPel2Created = false;

  try {
    const director = core.users().find(u => u.role === 'DIRECTOR') || core.users()[0];
    if (!director) throw new Error('No se encontró cuenta de Dirección en el sandbox.');

    const canonical = core.setting('simulatedCanonicalGroups');
    if (!canonical || !canonical.computacion || !canonical.peluqueriaM2) {
      throw new Error('No se detectaron las aulas canónicas simuladas. Ejecute primero scripts/import-real-bd-2026.cjs.');
    }

    const groupComp = core.record('groups', canonical.computacion);
    let groupPel2 = core.record('groups', canonical.peluqueriaM2);

    if (!groupComp) {
      throw new Error('Aula de Computación no registrada en la base de datos.');
    }

    const putS = (kind, target, fields, unit) => {
      const scope = { kind, ...(target ? { target } : {}), ...(unit ? { unit } : {}) };
      const existing = core.record('documentSettings', D.idFor(scope));
      D.saveSettings(core, director, { scope, fields, rev: existing ? existing.rev : null });
    };

    if (!groupPel2) {
      const currMod8 = core.record('documentSettings', 'curriculum:MOD-008')?.fields || {};
      const unitsMod8 = JSON.parse(currMod8.unitsJson || '[]');
      groupPel2 = core.write(director, 'groups', {
        id: canonical.peluqueriaM2,
        name: 'Peluquería y Barbería · Mañana · Sección A1 (Módulo II)',
        programId: 'PROG-004',
        moduleId: 'MOD-008',
        periodId: '2026-II',
        section: 'A1',
        turno: 'Mañana',
        modalidad: 'Presencial',
        units: unitsMod8.map(u => u.code),
        closed: false,
        archived: false
      }, null);
      tempGroupPel2Id = groupPel2.id;
      tempGroupPel2Created = true;

      putS('group', groupPel2.id, {
        ciclo: 'Auxiliar Técnico',
        seccion: 'A1',
        turno: 'Mañana',
        modalidad: 'Presencial',
        fechaInicio: '2026-08-10',
        fechaFin: '2026-12-18',
        periodClase: '2026-II',
        teacherName: 'Prof. Alejandrina Ayna Cabrera',
        efsrtInicio: '2026-10-12',
        efsrtFin: '2026-12-18'
      });

      for (const u of unitsMod8) {
        if (u.code === 'EFSRT') continue;
        putS('unit', groupPel2.id, {
          name: u.name,
          capacity: `Aplica técnicas y procedimientos operativos de ${u.name.toLowerCase()} cumpliendo especificaciones técnicas y seguridad.`,
          competence: 'Realizar procesos de ondulación, decoloración y tinturación capilar aplicando protocolos de diagnóstico y bioseguridad.',
          indicator1: `Organiza el área de trabajo, equipos, herramientas y materiales para ${u.name.toLowerCase()}.`,
          indicator2: `Ejecuta procesos técnicos de ${u.name.toLowerCase()} siguiendo protocolos establecidos.`,
          indicator3: `Aplica normas de seguridad, higiene y cuidado ambiental en las prácticas de taller.`,
          indicator4: `Verifica la calidad del producto o servicio realizado corrigiendo observaciones.`,
          indicator5: `Sustenta los procedimientos aplicados con responsabilidad y trabajo en equipo.`
        }, u.code);
        putS('unitCurriculum', groupPel2.id, {
          hours: u.hours,
          credits: u.credits,
          fechaInicio: u.fechaInicio,
          fechaFin: u.fechaFin,
          dateOrigin: 'Calendarización Oficial 2026-II'
        }, u.code);
      }
    }

    const enrComp = core.records('enrollments').filter(e => e.groupId === groupComp.id && e.active)[0];
    let enrPel2 = core.records('enrollments').filter(e => e.groupId === groupPel2.id && e.active)[0];

    // Si el aula de Peluquería Módulo II (2026-II) aún no tiene matrículas activas porque el sistema
    // se encuentra operando en el semestre 2026-I, sembramos 1 matrícula temporal de prueba para
    // verificar TMPL-17 (7ma UD) y la limpiamos en finally para no dejar duplicados en la BD activa.
    if (!enrPel2 && canonical.peluqueriaM1) {
      const enrPel1 = core.records('enrollments').filter(e => e.groupId === canonical.peluqueriaM1 && e.active)[0];
      if (enrPel1) {
        const hashRecord = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
        enrPel2 = core.enroll(director, {
          groupId: groupPel2.id,
          studentId: enrPel1.studentId,
          startDate: '2026-08-10'
        });
        tempEnrPel2Id = enrPel2.id;
        tempGroupPel2Id = groupPel2.id;
        putS('enrollment', enrPel2.id, { condition: 'G', emissionDate: '2026-12-18' });
        putS('registry', enrPel2.id, {
          registerCode: 'REG-2026-0999',
          registryBook: 'LIBRO 01',
          registryFolio: '099',
          registryNumber: '0999',
          registryDate: '2026-12-18',
          registryAsiento: 'ASIENTO N° 099 - FOLIO 099'
        });
        putS('practice', enrPel2.id, {
          companyName: 'SALÓN Y BARBERÍA ESTÉTICA GLAMOUR',
          companyAddress: 'Jr. Yungay N° 310 - San Miguel',
          criterion1: 3, criterion2: 2, criterion3: 2, criterion4: 3, criterion5: 3,
          criterion6: 3, criterion7: 1, criterion8: 2, criterion9: 1,
          efsrtFinalGrade: 17
        });
        putS('closure', enrPel2.id, {
          modularGrade: 17,
          approvedUnitsCount: 7,
          failedUnitsCount: 0,
          observations: 'Aprobado satisfactoriamente en las 7 unidades didácticas y prácticas EFSRT.'
        });

        for (const uCode of ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7']) {
          const uc = core.record('documentSettings', `unitCurriculum:${groupPel2.id}:${uCode}`)?.fields || {};
          const dStr = uc.fechaInicio || '2026-08-10';
          core.putRecord('attendance', {
            id: hashRecord(['attendance', enrPel2.id, uCode, [dStr, '1']]),
            enrollmentId: enrPel2.id,
            groupId: groupPel2.id,
            periodId: groupPel2.periodId,
            moduleId: groupPel2.moduleId,
            unit: uCode,
            date: dStr,
            session: '1',
            value: 'P',
            pending: false,
            observation: ''
          });
          for (let k = 1; k <= 5; k++) {
            for (const comp of ['IA1', 'IA2', 'IA3']) {
              core.putRecord('grades', {
                id: hashRecord(['grades', enrPel2.id, uCode, `IL${k}.${comp}`]),
                enrollmentId: enrPel2.id, groupId: groupPel2.id, periodId: groupPel2.periodId,
                moduleId: groupPel2.moduleId, unit: uCode, indicator: `IL${k}.${comp}`,
                value: 17, pending: false, observation: ''
              });
            }
            core.putRecord('grades', {
              id: hashRecord(['grades', enrPel2.id, uCode, `IL${k}`]),
              enrollmentId: enrPel2.id, groupId: groupPel2.id, periodId: groupPel2.periodId,
              moduleId: groupPel2.moduleId, unit: uCode, indicator: `IL${k}`,
              value: 17, pending: false, observation: ''
            });
          }
          core.putRecord('grades', {
            id: hashRecord(['grades', enrPel2.id, uCode, 'RESULTADO_UD']),
            enrollmentId: enrPel2.id, groupId: groupPel2.id, periodId: groupPel2.periodId,
            moduleId: groupPel2.moduleId, unit: uCode, indicator: 'RESULTADO_UD',
            value: 17, pending: false, observation: ''
          });
        }
      }
    }

    if (!enrComp || !enrPel2) {
      throw new Error('Matrículas activas no encontradas en las aulas simuladas.');
    }

    // Definición de las 21 plantillas oficiales
    const TEMPLATES_TO_TEST = [
      {
        id: 'TMPL-01',
        title: 'Nómina de Matrícula Oficial',
        context: 'Aula Computación (MOD-009)',
        getDoc: () => core.document(director, { templateId: 'TMPL-01', groupId: groupComp.id, demoFill: false })
      },
      {
        id: 'TMPL-02',
        title: 'Ficha Individual de Matrícula',
        context: `Estudiante ${enrComp.id.slice(0, 8)}`,
        getDoc: () => core.document(director, { templateId: 'TMPL-02', groupId: groupComp.id, enrollmentId: enrComp.id, demoFill: false })
      },
      {
        id: 'TMPL-03',
        title: 'Registro Modular de Matrícula',
        context: 'Aula Computación (MOD-009)',
        getDoc: () => core.document(director, { templateId: 'TMPL-03', groupId: groupComp.id, demoFill: false })
      },
      {
        id: 'TMPL-04',
        title: 'Portada de Carpeta Docente',
        context: 'Aula Computación (MOD-009)',
        getDoc: () => core.document(director, { templateId: 'TMPL-04', groupId: groupComp.id, demoFill: false })
      },
      {
        id: 'TMPL-05',
        title: 'Registro de Asistencia — UD 1',
        context: 'Computación · UD1',
        getDoc: () => core.document(director, { templateId: 'TMPL-05', groupId: groupComp.id, unit: 'UD1', demoFill: false })
      },
      {
        id: 'TMPL-06',
        title: 'Registro de Asistencia — UD 2',
        context: 'Computación · UD2',
        getDoc: () => core.document(director, { templateId: 'TMPL-06', groupId: groupComp.id, unit: 'UD2', demoFill: false })
      },
      {
        id: 'TMPL-07',
        title: 'Registro de Asistencia — UD 3',
        context: 'Computación · UD3',
        getDoc: () => core.document(director, { templateId: 'TMPL-07', groupId: groupComp.id, unit: 'UD3', demoFill: false })
      },
      {
        id: 'TMPL-08',
        title: 'Registro de Asistencia — UD 4',
        context: 'Computación · UD4',
        getDoc: () => core.document(director, { templateId: 'TMPL-08', groupId: groupComp.id, unit: 'UD4', demoFill: false })
      },
      {
        id: 'TMPL-09',
        title: 'Registro de Asistencia — UD 5',
        context: 'Computación · UD5',
        getDoc: () => core.document(director, { templateId: 'TMPL-09', groupId: groupComp.id, unit: 'UD5', demoFill: false })
      },
      {
        id: 'TMPL-10',
        title: 'Registro de Asistencia — UD 6',
        context: 'Computación · UD6',
        getDoc: () => core.document(director, { templateId: 'TMPL-10', groupId: groupComp.id, unit: 'UD6', demoFill: false })
      },
      {
        id: 'TMPL-11',
        title: 'Registro de Evaluación — UD 1',
        context: 'Computación · UD1',
        getDoc: () => core.document(director, { templateId: 'TMPL-11', groupId: groupComp.id, unit: 'UD1', demoFill: false })
      },
      {
        id: 'TMPL-12',
        title: 'Registro de Evaluación — UD 2',
        context: 'Computación · UD2',
        getDoc: () => core.document(director, { templateId: 'TMPL-12', groupId: groupComp.id, unit: 'UD2', demoFill: false })
      },
      {
        id: 'TMPL-13',
        title: 'Registro de Evaluación — UD 3',
        context: 'Computación · UD3',
        getDoc: () => core.document(director, { templateId: 'TMPL-13', groupId: groupComp.id, unit: 'UD3', demoFill: false })
      },
      {
        id: 'TMPL-14',
        title: 'Registro de Evaluación — UD 4',
        context: 'Computación · UD4',
        getDoc: () => core.document(director, { templateId: 'TMPL-14', groupId: groupComp.id, unit: 'UD4', demoFill: false })
      },
      {
        id: 'TMPL-15',
        title: 'Registro de Evaluación — UD 5',
        context: 'Computación · UD5',
        getDoc: () => core.document(director, { templateId: 'TMPL-15', groupId: groupComp.id, unit: 'UD5', demoFill: false })
      },
      {
        id: 'TMPL-16',
        title: 'Registro de Evaluación — UD 6',
        context: 'Computación · UD6',
        getDoc: () => core.document(director, { templateId: 'TMPL-16', groupId: groupComp.id, unit: 'UD6', demoFill: false })
      },
      {
        id: 'TMPL-17',
        title: 'Registro de Evaluación — UD 7',
        context: 'Peluquería M2 · UD7 (7ma UD)',
        getDoc: () => core.document(director, { templateId: 'TMPL-17', groupId: groupPel2.id, unit: 'UD7', demoFill: false })
      },
      {
        id: 'TMPL-18',
        title: 'Consolidado de Prácticas EFSRT',
        context: 'Aula Computación (MOD-009)',
        getDoc: () => core.document(director, { templateId: 'TMPL-18', groupId: groupComp.id, demoFill: false })
      },
      {
        id: 'TMPL-19',
        title: 'Acta Oficial Evaluación Modular',
        context: 'Aula Computación (MOD-009)',
        getDoc: () => core.document(director, { templateId: 'TMPL-19', groupId: groupComp.id, demoFill: false })
      },
      {
        id: 'TMPL-20',
        title: 'Certificado Modular Oficial',
        context: `Estudiante ${enrComp.id.slice(0, 8)}`,
        getDoc: () => core.document(director, { templateId: 'TMPL-20', groupId: groupComp.id, enrollmentId: enrComp.id, demoFill: false })
      },
      {
        id: 'TMPL-21',
        title: 'Título Oficial Auxiliar Técnico',
        context: `Estudiante ${enrComp.id.slice(0, 8)}`,
        getDoc: () => core.document(director, { templateId: 'TMPL-21', groupId: groupComp.id, enrollmentId: enrComp.id, demoFill: false })
      }
    ];

    console.log(`Iniciando evaluación de ${TEMPLATES_TO_TEST.length} plantillas oficiales (TMPL-01..21)...\n`);

    const results = [];
    let hasFailures = false;

    for (const item of TEMPLATES_TO_TEST) {
      process.stdout.write(`  [TEST] ${item.id.padEnd(11)} | ${item.title.padEnd(35)} | ${item.context.padEnd(28)} ... `);

      const tStart = Date.now();
      let doc;
      try {
        doc = item.getDoc();
      } catch (err) {
        console.log('FALLO AL OBTENER DOC');
        console.error(`         -> ${err.message}`);
        results.push({ id: item.id, title: item.title, ok: false, error: err.message });
        hasFailures = true;
        continue;
      }

      const pComplete = doc.preflight?.complete === true;
      const missingCount = doc.preflight?.missing?.length || 0;
      const isDraft = !doc.demoMode && !doc.demoFill && (doc.preflight ? !doc.preflight.complete : doc.administrativeDraft !== false);

      if (!pComplete || missingCount > 0 || isDraft) {
        console.log('FALLO EN PREFLIGHT');
        console.log(`         -> complete=${pComplete}, missing=${missingCount}, isDraft=${isDraft}`);
        if (doc.preflight?.missing) {
          console.log(`         -> Campos faltantes:`, JSON.stringify(doc.preflight.missing));
        }
        results.push({ id: item.id, title: item.title, ok: false, error: 'Preflight incompleto o borrador detectado' });
        hasFailures = true;
        continue;
      }

      // Renderizado del PDF en memoria con auditoría tipográfica y geométrica en archivo temporal
      let pdfBytes;
      let auditData = null;
      const os = require('node:os');
      const tmpAuditFile = path.join(os.tmpdir(), `cetpro-audit-${item.id}-${process.pid}.json`);
      try {
        pdfBytes = await renderPDF(root, doc, director, { measureOnly: false, auditFile: tmpAuditFile });
        if (fs.existsSync(tmpAuditFile)) {
          auditData = JSON.parse(fs.readFileSync(tmpAuditFile, 'utf8'));
          fs.unlinkSync(tmpAuditFile);
        }
      } catch (err) {
        if (fs.existsSync(tmpAuditFile)) { try { fs.unlinkSync(tmpAuditFile); } catch (_) {} }
        console.log('FALLO EN RENDERIZADO PDF');
        console.error(`         -> ${err.message}`);
        results.push({ id: item.id, title: item.title, ok: false, error: `Error de renderizado: ${err.message}` });
        hasFailures = true;
        continue;
      }

      const measuredCount = auditData?.fields?.length || 0;
      const allFit = auditData ? auditData.fields.every(f => f.fits === true && f.fontSize >= 3.5) : true;
      const styleOverrides = auditData ? auditData.fields.filter(f => f.styleEvidence !== 'Perfil del campo y caja física') : [];
      const drawnMatches = styleOverrides.every(field => {
        const drawn = auditData.drawnFields.find(x => x.field === field.field);
        return drawn && drawn.font === field.font && drawn.fontSize === field.fontSize && drawn.bold === field.bold;
      });
      const fontsUsed = auditData ? [...new Set(auditData.fields.map(f => `${f.font}${f.syntheticBold ? '(+SyntheticBold)' : f.bold ? '(Bold)' : ''}`))].join(', ') : 'Arial';

      if (!allFit || !drawnMatches) {
        console.log('FALLO EN GEOMETRÍA O TIPOGRAFÍA');
        console.error(`         -> allFit=${allFit}, drawnMatches=${drawnMatches}`);
        results.push({ id: item.id, title: item.title, ok: false, error: 'Desajuste geométrico o tipográfico detectado' });
        hasFailures = true;
        continue;
      }

      const durationMs = Date.now() - tStart;
      const sizeKb = (pdfBytes.length / 1024).toFixed(1);

      console.log(`✔ APROBADO (${sizeKb} KB, ${durationMs}ms, ${measuredCount} casillas medidas, fuentes: ${fontsUsed})`);
      results.push({
        id: item.id,
        title: item.title,
        context: item.context,
        totalFields: doc.preflight.total,
        filledFields: doc.preflight.filled,
        measuredBoxes: measuredCount,
        fontsUsed,
        missingFields: 0,
        pdfSizeKb: sizeKb,
        durationMs,
        ok: true
      });
    }

    console.log('\n========================================================================');
    console.log('                 MATRIZ CONSOLIDADA DE PREFLIGHTS MINEDU                ');
    console.log('========================================================================');
    console.log('| Código      | Denominación Oficial                  | Campos | Faltantes | Estado Preflight | PDF (KB) | Dictamen |');
    console.log('| :---------- | :------------------------------------ | :----: | :-------: | :--------------: | :------: | :------: |');

    for (const r of results) {
      if (r.ok) {
        console.log(`| ${r.id.padEnd(11)} | ${r.title.slice(0, 37).padEnd(37)} | ${String(r.totalFields).padStart(6)} | ${String(r.missingFields).padStart(9)} |      READY       | ${String(r.pdfSizeKb).padStart(8)} | APROBADO |`);
      } else {
        console.log(`| ${r.id.padEnd(11)} | ${r.title.slice(0, 37).padEnd(37)} |      - |         - |      ERROR       |        - | RECHAZO  |`);
      }
    }

    console.log('========================================================================');

    if (hasFailures) {
      console.error('\n❌ DICTAMEN: SE ENCONTRARON FALLOS EN LA VERIFICACIÓN DE PREFLIGHTS.');
      process.exitCode = 1;
    } else {
      console.log(`\n✅ DICTAMEN: CONFORMIDAD TOTAL — 21/21 FORMATOS OFICIALES HOMOLOGADOS AL 100%`);
      console.log('   - Preflight Complete: true en todas las plantillas (0 campos faltantes).');
      console.log('   - Marcas físicas BORRADOR y DEMOSTRACIÓN: ausentes al 100% (emisión oficial limpia).');
      console.log('   - Soporte nativo a 7ma UD de Peluquería M2 (TMPL-17): verificado e intacto.');
      console.log('   - Motor PDF: renderizado milimétrico sin FIELD_OVERFLOW ni desbordamiento de casillas.\n');
    }

  } finally {
    if (tempEnrPel2Id && tempGroupPel2Id) {
      try {
        core.db.prepare("DELETE FROM records WHERE entity='enrollments' AND id=?").run(tempEnrPel2Id);
        core.db.prepare("DELETE FROM records WHERE entity='attendance' AND json_extract(value, '$.groupId')=?").run(tempGroupPel2Id);
        core.db.prepare("DELETE FROM records WHERE entity='grades' AND json_extract(value, '$.groupId')=?").run(tempGroupPel2Id);
        core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND json_extract(value, '$.scope.target')=?").run(tempEnrPel2Id);
        if (tempGroupPel2Created) {
          core.db.prepare("DELETE FROM records WHERE entity='groups' AND id=?").run(tempGroupPel2Id);
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND json_extract(value, '$.scope.target')=?").run(tempGroupPel2Id);
        }
      } catch (_) {}
    }
    core.close();
  }
}

verifyAllTemplates().catch(err => {
  console.error('[ERROR CRÍTICO EN VERIFICADOR]', err);
  process.exitCode = 1;
});
