/**
 * tests/helpers/qa-env.cjs
 * 
 * GESTOR DE ENTORNO QA AISLADO Y DESECHABLE - CEPRO_MICAELA 2.0 (Tarea 30)
 * 
 * Proporciona un ciclo de vida limpio para pruebas automatizadas:
 * 1. Directorio exclusivo qa-isolated dentro de dev-sandbox/data (estrictamente autorizado).
 * 2. Inicialización de datos sintéticos base con métodos oficiales de dominio.
 * 3. Servidor QA independiente en loopback (127.0.0.1:8089) que nunca colisiona con dev (8085).
 * 4. Aislamiento absoluto: el sandbox principal dev-sandbox/data/cetpro.sqlite NUNCA es mutado.
 * 5. Cierre y desmontaje seguro de conexiones SQLite y sockets HTTP sin fugas.
 */

const path = require('node:path');
const fs = require('node:fs');
const { validateDevSandbox } = require('../../scripts/dev-sandbox-guard.cjs');
const { OfflineCore } = require('../../scripts/offline-core.cjs');
const { createService } = require('../../scripts/offline-http.cjs');
const D = require('../../scripts/offline-documents.cjs');

const root = path.resolve(__dirname, '..', '..');
const QA_DATA_DIR = path.resolve(root, 'dev-sandbox', 'data', 'qa-isolated');
const QA_PORT = Number(process.env.CETPRO_QA_PORT || 8089);
const QA_HOST = '127.0.0.1';
const QA_URL = `http://${QA_HOST}:${QA_PORT}`;

/**
 * Limpia de manera segura el directorio QA eliminando cualquier base de datos previa.
 */
function cleanQaDir(dir = QA_DATA_DIR) {
  if (!fs.existsSync(dir)) return;

  // Intentar eliminar con reintentos para evitar bloqueos transitorios en Windows
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      break;
    } catch (err) {
      if (attempt === 5) {
        throw new Error(`[QA-ENV] No se pudo limpiar el directorio QA (${dir}): ${err.message}`);
      }
      // Pequeña pausa sincrónica antes de reintentar
      const start = Date.now();
      while (Date.now() - start < 100) {}
    }
  }
}

/**
 * Inicializa un entorno de datos sintéticos idéntico al baseline oficial de desarrollo,
 * utilizando exclusivamente los métodos oficiales de OfflineCore.
 */
function initQaBaseline(dir = QA_DATA_DIR) {
  // 1. Limpieza de base de datos anterior
  cleanQaDir(dir);
  fs.mkdirSync(dir, { recursive: true });

  // 2. Validación de seguridad con el guardián estricto
  const guard = validateDevSandbox({
    dataDir: dir,
    port: QA_PORT,
  });

  // 3. Inicialización oficial mediante OfflineCore
  const core = new OfflineCore(guard.dataDir, null);

  try {
    // 3a. Setup institucional del sandbox
    const setupResult = core.setup({
      username: 'director.dev',
      password: 'DirectorDev2026!',
      name: 'Lic. Roberto Morales (Director)',
      institutionName: 'CETPRO Micaela Bastidas (Sandbox Dev)',
      importBaseline: false,
    });

    const director = core.users().find((u) => u.username === 'director.dev');
    if (!director) throw new Error('[QA-ENV] Error al recuperar usuario director');

    // 3b. Crear grupos oficiales de prueba
    const groupA = core.saveGroup(director, {
      name: 'Grupo A · Computación',
      programId: 'PROG-005',
      moduleId: 'MOD-009',
      periodId: '2026-I',
      section: 'A',
      turno: 'Mañana',
      units: ['UD1', 'UD2'],
    });

    const groupB = core.saveGroup(director, {
      name: 'Grupo B · Confección Textil',
      programId: 'PROG-006',
      moduleId: 'MOD-011',
      periodId: '2026-I',
      section: 'B',
      turno: 'Tarde',
      units: ['UD1', 'UD2'],
    });

    const groupC = core.saveGroup(director, {
      name: 'Grupo C · Mecánica Automotriz',
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      periodId: '2026-I',
      section: 'A',
      turno: 'Noche',
      units: ['UD1'],
    });

    // 3c. Crear docente con asignaciones a Grupo A y Grupo B
    const docente = core.saveUser(director, {
      username: 'docente.dev',
      password: 'DocenteDev2026!',
      name: 'Prof. Martín Valdivia',
      description: 'Docente titular de Computación y Confección',
      role: 'DOCENTE',
      active: true,
      assignments: [
        {
          groupId: groupA.id,
          section: 'A',
          units: ['UD1', 'UD2'],
        },
        {
          groupId: groupB.id,
          section: 'B',
          units: ['UD1', 'UD2'],
        },
      ],
    });

    // 3d. Crear secretaría
    const secretaria = core.saveUser(director, {
      username: 'secretaria.dev',
      password: 'SecretariaDev2026!',
      name: 'Lic. Carmen Ramos',
      description: 'Secretaría Académica',
      role: 'SECRETARIA',
      active: true,
      assignments: [],
    });

    // 3e. Crear estudiantes y matrículas activas
    const s1 = core.saveStudent(director, {
      name: 'Ana Torres Vega',
      document: '72345001',
      sex: 'M',
      birthDate: '2002-05-10',
    });
    const s2 = core.saveStudent(director, {
      name: 'Carlos Ramos Diaz',
      document: '72345002',
      sex: 'H',
      birthDate: '2001-08-20',
    });
    const enr1 = core.enroll(director, { groupId: groupA.id, studentId: s1.id, startDate: '2026-03-01' });
    const enr2 = core.enroll(director, { groupId: groupA.id, studentId: s2.id, startDate: '2026-03-01' });

    const s3 = core.saveStudent(director, {
      name: 'Elena Quispe Luna',
      document: '72345003',
      sex: 'M',
      birthDate: '2003-02-14',
    });
    const enr3 = core.enroll(director, { groupId: groupB.id, studentId: s3.id, startDate: '2026-03-01' });

    // Configuración Académica Oficial 2026 para QA
    const m9 = core.record('modules', 'MOD-009');
    if (m9 && !m9.academicYear) {
      core.write(director, 'modules', { ...m9, academicYear: '2026' }, m9.rev);
    }

    if (!core.record('documentSettings', 'academicYear:2026')) {
      D.saveSettings(core, director, {
        scope: { kind: 'academicYear', target: '2026' },
        fields: {
          institutionJson: JSON.stringify({
            nombre: 'CETPRO Micaela Bastidas',
            dre: 'DRE Puno',
            ugel: 'UGEL San Román',
            departamento: 'Puno',
            provincia: 'San Román',
            distrito: 'Juliaca',
            directorNombre: 'Lic. Roberto Morales'
          }),
          calendarJson: JSON.stringify([
            { name: 'Periodo académico (2026-I)', start: '2026-03-01', end: '2026-07-24', detail: 'Primer semestre académico 2026' },
            { name: 'Periodo académico (2026-II)', start: '2026-08-10', end: '2026-12-18', detail: 'Segundo semestre académico 2026' }
          ]),
          hours: 1700,
          credits: 64,
          directoryDate: '2026-03-01',
          directoryPlace: 'Juliaca'
        }
      });
    }

    if (!core.record('documentSettings', 'academicPeriod:2026-I')) {
      D.saveSettings(core, director, {
        scope: { kind: 'academicPeriod', target: '2026-I' },
        fields: {
          year: '2026',
          fechaInicio: '2026-03-01',
          fechaFin: '2026-07-24',
          hours: 850,
          credits: 32
        }
      });
    }

    if (!core.record('documentSettings', 'academicPeriod:2026-II')) {
      D.saveSettings(core, director, {
        scope: { kind: 'academicPeriod', target: '2026-II' },
        fields: {
          year: '2026',
          fechaInicio: '2026-08-10',
          fechaFin: '2026-12-18',
          hours: 850,
          credits: 32
        }
      });
    }

    if (!core.record('documentSettings', 'curriculum:MOD-009')) {
      D.saveSettings(core, director, {
        scope: { kind: 'curriculum', target: 'MOD-009' },
        fields: {
          year: '2026',
          periodId: '2026-I',
          nombre: 'Ofimática',
          programName: 'COMPUTACIÓN E INFORMÁTICA',
          programCode: 'PROG-005',
          programHours: 1700,
          programCredits: 64,
          nivelFormativo: 'Auxiliar Técnico',
          turno: 'Mañana',
          teacherNames: 'Prof. Martín Valdivia',
          hours: 400,
          credits: 16,
          efsrtHours: 80,
          unitsJson: JSON.stringify([
            { code: 'UD1', name: 'Procesador de Textos Word Avanzado', hours: 160, credits: 6, theoryHours: 40, practiceHours: 120, days: 40, fechaInicio: '2026-03-02', fechaFin: '2026-05-08', confirmed: true },
            { code: 'UD2', name: 'Hojas de Cálculo Excel Comercial', hours: 160, credits: 6, theoryHours: 40, practiceHours: 120, days: 40, fechaInicio: '2026-05-11', fechaFin: '2026-07-17', confirmed: true },
            { code: 'EFSRT', name: 'Experiencias Formativas en Situaciones Reales de Trabajo', hours: 80, credits: 4, theoryHours: 0, practiceHours: 80, days: 20, fechaInicio: '2026-06-01', fechaFin: '2026-07-24', confirmed: true }
          ])
        }
      });
    }

    if (!core.record('documentSettings', 'moduleDefaults:MOD-009')) {
      D.saveSettings(core, director, {
        scope: { kind: 'moduleDefaults', target: 'MOD-009' },
        fields: {
          year: '2026',
          source: 'Catálogo Nacional de la Oferta Formativa - MINEDU',
          notes: 'Valores referenciales oficiales',
          dataJson: JSON.stringify({
            module: { hours: 400, credits: 16, efsrtHours: 80 },
            units: [
              { code: 'UD1', name: 'Procesador de Textos Word Avanzado', hours: 160, credits: 6, theoryHours: 40, practiceHours: 120, days: 40, indicator1: 'Aplica formatos avanzados', indicator2: 'Genera tablas de contenido', confirmed: true },
              { code: 'UD2', name: 'Hojas de Cálculo Excel Comercial', hours: 160, credits: 6, theoryHours: 40, practiceHours: 120, days: 40, indicator1: 'Aplica funciones lógicas', indicator2: 'Construye tablas dinámicas', confirmed: true },
              { code: 'EFSRT', name: 'Experiencias Formativas en Situaciones Reales de Trabajo', hours: 80, credits: 4, theoryHours: 0, practiceHours: 80, days: 20, confirmed: true }
            ]
          })
        }
      });
    }

    if (!core.record('documentSettings', 'personnel:2026:42345678')) {
      D.saveSettings(core, director, {
        scope: { kind: 'personnel', target: '2026:42345678' },
        fields: {
          year: '2026',
          name: 'Valdivia Quispe, Martín',
          document: '42345678',
          position: 'Docente',
          specialty: 'Computación e Informática',
          email: 'mvaldivia@cetpromicaelabastidas.edu.pe',
          phone: '951234567',
          birthday: '15 de Mayo',
          address: 'Av. Circunvalación 450, Juliaca',
          referenceTurno: 'Mañana',
          sourceNote: 'Directorio institucional 2026'
        }
      });
    }

    if (!core.record('documentSettings', 'personnel:2026:40123456')) {
      D.saveSettings(core, director, {
        scope: { kind: 'personnel', target: '2026:40123456' },
        fields: {
          year: '2026',
          name: 'Morales Flores, Roberto',
          document: '40123456',
          position: 'Director',
          specialty: 'Gestión Institucional',
          email: 'director@cetpromicaelabastidas.edu.pe',
          phone: '951000111',
          birthday: '10 de Marzo',
          address: 'Jr. Mariano Melgar 120, Juliaca',
          referenceTurno: 'Mañana / Tarde',
          sourceNote: 'Directorio institucional 2026'
        }
      });
    }

    return {
      fingerprint: setupResult.fingerprint,
      director,
      docente,
      secretaria,
      groupA,
      groupB,
      groupC,
      students: [s1, s2, s3],
      enrollments: [enr1, enr2, enr3],
    };
  } finally {
    core.close();
  }
}

/**
 * Arranca un servidor QA dedicado sobre el directorio de datos aislado.
 */
async function startQaServer(options = {}) {
  const dir = options.dataDir || QA_DATA_DIR;
  const port = options.port || QA_PORT;
  const host = options.host || QA_HOST;

  // 1. Validar sandbox
  const guard = validateDevSandbox({
    dataDir: dir,
    port,
  });

  fs.mkdirSync(guard.dataDir, { recursive: true });

  // 2. Gestionar lockfile de seguridad
  const lockFile = path.join(guard.dataDir, 'server-lock.json');
  if (fs.existsSync(lockFile)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (lockData.pid && lockData.pid !== process.pid) {
        try {
          process.kill(lockData.pid, 0);
          throw new Error(`[QA-ENV] Ya existe un proceso usando el sandbox QA (PID: ${lockData.pid})`);
        } catch (e) {
          if (e.code === 'ESRCH') {
            fs.unlinkSync(lockFile);
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      if (e.message.includes('Ya existe un proceso')) throw e;
      try { fs.unlinkSync(lockFile); } catch {}
    }
  }

  // 3. Crear servicio HTTP aislado sin archivo de respaldo
  const service = createService({
    root,
    directory: guard.dataDir,
    backupFile: null,
  });

  const server = service.server();

  // 4. Iniciar escucha en puerto QA
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(guard.port, guard.host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  // 5. Registrar lockfile
  fs.writeFileSync(lockFile, JSON.stringify({
    pid: process.pid,
    port: guard.port,
    startedAt: new Date().toISOString(),
  }));

  let closed = false;

  const close = () => {
    if (closed) return Promise.resolve();
    closed = true;
    return new Promise((resolve) => {
      server.close(() => {
        try {
          service.core.close();
        } catch {}
        try {
          if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
        } catch {}
        resolve();
      });
    });
  };

  return {
    server,
    service,
    port: guard.port,
    host: guard.host,
    url: `http://${guard.host}:${guard.port}`,
    dataDir: guard.dataDir,
    close,
  };
}

module.exports = {
  QA_DATA_DIR,
  QA_PORT,
  QA_HOST,
  QA_URL,
  cleanQaDir,
  initQaBaseline,
  startQaServer,
};
