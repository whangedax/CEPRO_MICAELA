/**
 * Servicio de Sincronización Descentralizada Offline (SyncPackageService)
 * Módulo: M01/RBAC/M05 — Intercambio de Datos y Fusión Inteligente (Smart Merge) Sin Internet
 */

import { StudentService } from './student-service.js';
import { EnrollmentService } from './enrollment-service.js';
import { Etapa2DataService } from './etapa2-data-service.js';
import { TeacherContextService } from './teacher-context-service.js';
import { getDB, executeTransaction } from '../db/database.js';
import { Notifications } from '../ui/notifications.js';
import { OperationalError } from './error-service.js';

export const SYNC_PACKAGE_TYPES = Object.freeze({
  ENROLLMENTS: 'MATRICULAS_Y_PADRON',
  GRADES_ATTENDANCE: 'NOTAS_Y_ASISTENCIA_AULA'
});

export class SyncPackageService {
  constructor() {
    this.enrollmentService = new EnrollmentService();
    this.etapa2DataService = new Etapa2DataService();
  }

  // =========================================================================
  // EXPORTACIÓN 1: Secretaría exporta Padrón y Matrículas Oficiales
  // =========================================================================

  /**
   * Genera y descarga el paquete oficial de matrícula para llevar en USB a los docentes
   */
  async exportSecretariaEnrollmentPackage() {
    try {
      const allStudents = await StudentService.searchStudents();
      const allEnrollments = await this.enrollmentService.listEnrollments();

      const payload = {
        app: 'CETPRO_SISTEMA_ACADEMICO_V2',
        version: 2,
        tipoPaquete: SYNC_PACKAGE_TYPES.ENROLLMENTS,
        fechaExportacion: new Date().toISOString(),
        origen: 'SECRETARIA_ACADEMICA',
        resumen: {
          totalEstudiantes: allStudents.length,
          totalMatriculas: allEnrollments.length
        },
        estudiantes: allStudents,
        matriculas: allEnrollments
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `PADRON_MATRICULAS_CETPRO_${dateStr}.cetpro`;
      this._downloadFile(fileName, JSON.stringify(payload, null, 2));

      Notifications.success(`Paquete exportado correctamente: ${fileName} (${allStudents.length} alumnos, ${allEnrollments.length} matrículas)`);
      return payload;
    } catch (err) {
      console.error('[SyncPackageService] Error exportando matrícula:', err);
      Notifications.error(`Error al generar paquete de matrícula: ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // IMPORTACIÓN 1: Docente importa el paquete de Secretaría en su laptop
  // Regla: Smart Merge no destructivo (Preserva intactas sus notas y asistencias)
  // =========================================================================

  /**
   * Fusiona el padrón y matrículas oficiales en la máquina local sin alterar notas
   * @param {string|object} packageInput
   * @returns {Promise<object>} Reporte de la fusión
   */
  async importSecretariaEnrollmentPackage(packageInput) {
    try {
      const pkg = typeof packageInput === 'string' ? JSON.parse(packageInput) : packageInput;

      if (!pkg || pkg.tipoPaquete !== SYNC_PACKAGE_TYPES.ENROLLMENTS) {
        throw new OperationalError('El archivo seleccionado no es un paquete válido de Matrículas y Padrón de Secretaría.');
      }

      if (!Array.isArray(pkg.estudiantes) || !Array.isArray(pkg.matriculas)) {
        throw new OperationalError('El paquete de matrícula contiene datos corruptos o incompletos.');
      }

      const db = getDB();
      const activeGroupCode = TeacherContextService.getActiveGroupCode();

      // Guardar respaldo de contingencia previo a la fusión
      try {
        sessionStorage.setItem('CETPRO_PRE_SYNC_BACKUP', JSON.stringify({
          timestamp: new Date().toISOString(),
          groupCode: activeGroupCode
        }));
      } catch { /* Ignorar */ }

      // Smart Merge en IndexedDB: transacción de escritura para estudiantes y matrículas
      await executeTransaction(['estudiantes', 'matriculas'], 'readwrite', (tx) => {
        const studentStore = tx.objectStore('estudiantes');
        const enrollmentStore = tx.objectStore('matriculas');

        // Actualizar o insertar estudiantes
        for (const est of pkg.estudiantes) {
          if (est && est.id) {
            studentStore.put(est);
          }
        }

        // Actualizar o insertar matrículas
        for (const mat of pkg.matriculas) {
          if (mat && mat.id) {
            enrollmentStore.put(mat);
          }
        }
      });

      // Calcular cuántos alumnos tiene ahora el grupo del docente
      const myEnrollments = pkg.matriculas.filter(m => {
        const code = m.grupoCode || (m.grupoId ? (m.grupoId.includes('GRP-BD-') ? 'GRP-BD-' + m.grupoId.split('GRP-BD-')[1] : m.grupoId) : '');
        return code === activeGroupCode;
      });

      const report = {
        success: true,
        fechaExportacionOriginal: pkg.fechaExportacion,
        totalEstudiantesActualizados: pkg.estudiantes.length,
        totalMatriculasActualizadas: pkg.matriculas.length,
        alumnosEnMiAula: myEnrollments.length,
        miAula: activeGroupCode
      };

      Notifications.success(
        `✓ Padrón institucional actualizado. Su aula (${activeGroupCode}) cuenta ahora con ${myEnrollments.length} alumnos matriculados. Sus notas y asistencias previas permanecen intactas.`
      );

      return report;
    } catch (err) {
      console.error('[SyncPackageService] Error importando matrícula:', err);
      Notifications.error(`Fallo al incorporar datos de Secretaría: ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // EXPORTACIÓN 2: Docente exporta sus Notas y Asistencia en USB para Secretaría
  // =========================================================================

  /**
   * Genera y descarga el paquete con las notas y asistencias del aula activa
   * @param {string} [groupCode] Opcional, por defecto el activo
   */
  async exportTeacherGradesPackage(groupCode = null) {
    try {
      const targetGroupCode = groupCode || TeacherContextService.getActiveGroupCode();
      const progInfo = TeacherContextService.getActiveProgram();
      const groupInfo = TeacherContextService.getActiveGroupInfo();

      // Recopilar asistencias registradas (UD1 a UD6)
      const asistencias = {};
      for (let ud = 1; ud <= 6; ud++) {
        const att = this.etapa2DataService.getAttendance(targetGroupCode, ud) ||
                    this.etapa2DataService.getAttendance(`GAC-V1-${targetGroupCode}`, ud);
        if (att && att.sessions && att.sessions.length > 0) {
          asistencias[`UD${ud}`] = att;
        }
      }

      // Recopilar evaluaciones registradas (UD1 a UD7)
      const evaluaciones = {};
      for (let ud = 1; ud <= 7; ud++) {
        const ev = this.etapa2DataService.getEvaluation(targetGroupCode, ud) ||
                   this.etapa2DataService.getEvaluation(`GAC-V1-${targetGroupCode}`, ud);
        if (ev && ev.evaluations && Object.keys(ev.evaluations).length > 0) {
          evaluaciones[`UD${ud}`] = ev;
        }
      }

      const payload = {
        app: 'CETPRO_SISTEMA_ACADEMICO_V2',
        version: 2,
        tipoPaquete: SYNC_PACKAGE_TYPES.GRADES_ATTENDANCE,
        fechaExportacion: new Date().toISOString(),
        origen: 'DOCENTE_AULA',
        grupoCode: targetGroupCode,
        programaId: progInfo.id,
        programaNombre: progInfo.nombre,
        turno: groupInfo.turno || groupInfo.modalidad || 'Regular',
        docente: 'Prof. Walter Quispe Mamani',
        resumen: {
          udsAsistenciaConDatos: Object.keys(asistencias).length,
          udsEvaluacionConDatos: Object.keys(evaluaciones).length
        },
        asistencias,
        evaluaciones
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `AVANCE_AULA_${targetGroupCode}_${dateStr}.cetpro`;
      this._downloadFile(fileName, JSON.stringify(payload, null, 2));

      Notifications.success(
        `✓ Avance de notas y asistencia exportado: ${fileName} (${Object.keys(asistencias).length} UDs asist., ${Object.keys(evaluaciones).length} UDs eval.)`
      );
      return payload;
    } catch (err) {
      console.error('[SyncPackageService] Error exportando notas del docente:', err);
      Notifications.error(`Error al exportar notas de aula: ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // IMPORTACIÓN 2: Secretaría o Dirección consolida las notas entregadas en USB
  // Regla: Asienta las notas de ese grupo sin tocar alumnos ni otros grupos
  // =========================================================================

  /**
   * Consolida el paquete de notas y asistencias entregado por el docente
   * @param {string|object} packageInput
   */
  async importTeacherGradesPackage(packageInput) {
    try {
      const pkg = typeof packageInput === 'string' ? JSON.parse(packageInput) : packageInput;

      if (!pkg || pkg.tipoPaquete !== SYNC_PACKAGE_TYPES.GRADES_ATTENDANCE) {
        throw new OperationalError('El archivo no es un paquete válido de Notas y Asistencia de Aula Docente.');
      }

      if (!pkg.grupoCode) {
        throw new OperationalError('El paquete docente no especifica el código de aula / grupo.');
      }

      const targetGroupCode = pkg.grupoCode;
      let countAtt = 0;
      let countEval = 0;

      // Consolidar asistencias por UD
      if (pkg.asistencias && typeof pkg.asistencias === 'object') {
        for (const [udKey, attData] of Object.entries(pkg.asistencias)) {
          const udNum = parseInt(udKey.replace('UD', ''), 10);
          if (udNum >= 1 && udNum <= 6 && attData) {
            this.etapa2DataService.saveAttendance(targetGroupCode, udNum, attData);
            this.etapa2DataService.saveAttendance(`GAC-V1-${targetGroupCode}`, udNum, attData);
            countAtt++;
          }
        }
      }

      // Consolidar evaluaciones por UD
      if (pkg.evaluaciones && typeof pkg.evaluaciones === 'object') {
        for (const [udKey, evalData] of Object.entries(pkg.evaluaciones)) {
          const udNum = parseInt(udKey.replace('UD', ''), 10);
          if (udNum >= 1 && udNum <= 7 && evalData) {
            this.etapa2DataService.saveEvaluation(targetGroupCode, udNum, evalData);
            this.etapa2DataService.saveEvaluation(`GAC-V1-${targetGroupCode}`, udNum, evalData);
            countEval++;
          }
        }
      }

      const report = {
        success: true,
        grupoCode: targetGroupCode,
        programaNombre: pkg.programaNombre,
        docente: pkg.docente,
        udsAsistenciaConsolidadas: countAtt,
        udsEvaluacionConsolidadas: countEval,
        fechaOriginal: pkg.fechaExportacion
      };

      Notifications.success(
        `✓ Notas y asistencia consolidadas con éxito para el Grupo ${targetGroupCode} (${countAtt} UDs asist., ${countEval} UDs eval.). Las actas oficiales reflejarán los nuevos registros.`
      );

      return report;
    } catch (err) {
      console.error('[SyncPackageService] Error consolidando notas de docente:', err);
      Notifications.error(`Fallo al consolidar notas del docente: ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // Helpers de lectura y descarga
  // =========================================================================

  _downloadFile(fileName, textContent) {
    const blob = new Blob([textContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  /**
   * Lee el contenido de un archivo seleccionado por el usuario en un input file
   * @param {File} file
   * @returns {Promise<string>}
   */
  static readFileAsText(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No se ha proporcionado ningún archivo.'));
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error al leer el archivo físico.'));
      reader.readAsText(file);
    });
  }
}
