/**
 * init-dev-sandbox.cjs
 * 
 * INICIALIZACIÓN OFICIAL DE DATOS SINTÉTICOS PARA DESARROLLO - CEPRO_MICAELA 2.0
 * 
 * Utiliza estrictamente los métodos oficiales de dominio (setup, saveGroup, saveUser, saveStudent, enroll)
 * para crear un entorno inicial sintético dentro del sandbox de desarrollo.
 * 
 * NUNCA inserta directamente en SQLite para saltar validaciones.
 * NUNCA utiliza datos institucionales reales ni copia archivos de private-data/.
 * Idempotente: comprueba la existencia de registros antes de crearlos para evitar duplicación.
 */

const path = require('node:path');
const fs = require('node:fs');
const { validateDevSandbox, DEFAULT_DEV_PORT } = require('./dev-sandbox-guard.cjs');
const { OfflineCore } = require('./offline-core.cjs');
const D = require('./offline-documents.cjs');

// Garantizar CETPRO_DATA_DIR en dev-sandbox por defecto si se invoca este script
const root = path.resolve(__dirname, '..');
const defaultSandboxDir = path.join(root, 'dev-sandbox', 'data');
if (!process.env.CETPRO_DATA_DIR) {
  process.env.CETPRO_DATA_DIR = defaultSandboxDir;
}

// 1. Validación de seguridad estricta
const guard = validateDevSandbox({
  dataDir: process.env.CETPRO_DATA_DIR,
  port: process.env.CETPRO_PORT ? Number(process.env.CETPRO_PORT) : DEFAULT_DEV_PORT
});

const sandboxDir = guard.dataDir;
fs.mkdirSync(sandboxDir, { recursive: true });

console.log('[INIT SANDBOX] Verificando datos sintéticos en:', sandboxDir);

// 2. Instanciación aislada de OfflineCore sin archivo de respaldo institucional
const core = new OfflineCore(sandboxDir, null);

try {
  const currentStatus = core.status();
  let director;

  if (!currentStatus.initialized) {
    console.log('[INIT SANDBOX] Ejecutando setup oficial inicial con datos sintéticos...');
    const setupResult = core.setup({
      username: 'director.dev',
      password: 'DirectorDev2026!',
      name: 'Lic. Roberto Morales (Director)',
      institutionName: 'CETPRO Micaela Bastidas (Sandbox Dev)',
      importBaseline: false
    });
    console.log('✔ Setup completado exitosamente. Fingerprint:', setupResult.fingerprint);
  }

  director = core.users().find(u => u.username === 'director.dev');
  if (!director) throw new Error('Error al recuperar usuario director');

  const groups = core.records('groups');

  // Grupo A: Computación e Informática
  let groupA = groups.find(g => g.name.includes('Computación'));
  if (!groupA) {
    console.log('[INIT SANDBOX] Creando aula sintética oficial (Computación e Informática)...');
    groupA = core.saveGroup(director, {
      name: 'Grupo A · Computación',
      programId: 'PROG-005',
      moduleId: 'MOD-009',
      periodId: '2026-I',
      section: 'A',
      turno: 'Mañana',
      units: ['UD1', 'UD2']
    });
    console.log('✔ Grupo A creado:', groupA.id, groupA.name);
  }

  // Grupo B: Confección Textil
  let groupB = groups.find(g => g.name.includes('Confección'));
  if (!groupB) {
    console.log('[INIT SANDBOX] Creando aula sintética oficial (Corte y Confección)...');
    groupB = core.saveGroup(director, {
      name: 'Grupo B · Confección Textil',
      programId: 'PROG-006',
      moduleId: 'MOD-011',
      periodId: '2026-I',
      section: 'B',
      turno: 'Tarde',
      units: ['UD1', 'UD2']
    });
    console.log('✔ Grupo B creado:', groupB.id, groupB.name);
  }

  // Grupo C: Mecánica Automotriz (no asignado a docente para verificación de aislamiento)
  let groupC = groups.find(g => g.name.includes('Mecánica'));
  if (!groupC) {
    console.log('[INIT SANDBOX] Creando aula sintética oficial no asignada (Mecánica Automotriz)...');
    groupC = core.saveGroup(director, {
      name: 'Grupo C · Mecánica Automotriz',
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      periodId: '2026-I',
      section: 'A',
      turno: 'Noche',
      units: ['UD1']
    });
    console.log('✔ Grupo C creado:', groupC.id, groupC.name);
  }

  // Docente titular
  const existingDocente = core.users().find(u => u.username === 'docente.dev');
  if (!existingDocente) {
    console.log('[INIT SANDBOX] Creando cuenta de Docente sintético...');
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
          units: ['UD1', 'UD2']
        },
        {
          groupId: groupB.id,
          section: 'B',
          units: ['UD1', 'UD2']
        }
      ]
    });
    console.log('✔ Docente creado:', docente.username, `(${docente.name})`);
  } else {
    // Asegurar que las asignaciones incluyan Grupo A y Grupo B
    const fullDoc = core.user(existingDocente.id);
    if (!fullDoc.assignments.some(a => a.groupId === groupB.id)) {
      core.saveUser(director, {
        id: fullDoc.id,
        username: fullDoc.username,
        name: fullDoc.name,
        role: fullDoc.role,
        version: fullDoc.version,
        active: true,
        assignments: [
          { groupId: groupA.id, section: 'A', units: ['UD1', 'UD2'] },
          { groupId: groupB.id, section: 'B', units: ['UD1', 'UD2'] }
        ]
      });
      console.log('✔ Asignaciones de docente actualizadas a 2 aulas.');
    }
  }

  // Secretaría
  const existingSecretaria = core.users().find(u => u.username === 'secretaria.dev');
  if (!existingSecretaria) {
    console.log('[INIT SANDBOX] Creando cuenta de Secretaría sintética...');
    const secretaria = core.saveUser(director, {
      username: 'secretaria.dev',
      password: 'SecretariaDev2026!',
      name: 'Lic. Carmen Ramos',
      description: 'Secretaría Académica',
      role: 'SECRETARIA',
      active: true,
      assignments: []
    });
    console.log('✔ Secretaría creada:', secretaria.username, `(${secretaria.name})`);
  }

  // Matrículas sintéticas si no existen
  const enrollments = core.records('enrollments');
  if (!enrollments.some(e => e.groupId === groupA.id)) {
    const s1 = core.saveStudent(director, { name: 'Ana Torres Vega', document: '72345001', sex: 'M', birthDate: '2002-05-10' });
    const s2 = core.saveStudent(director, { name: 'Carlos Ramos Diaz', document: '72345002', sex: 'H', birthDate: '2001-08-20' });
    core.enroll(director, { groupId: groupA.id, studentId: s1.id, startDate: '2026-03-01' });
    core.enroll(director, { groupId: groupA.id, studentId: s2.id, startDate: '2026-03-01' });
    console.log('✔ Estudiantes matriculados en Grupo A.');
  }

  if (!enrollments.some(e => e.groupId === groupB.id)) {
    const s3 = core.saveStudent(director, { name: 'Elena Quispe Luna', document: '72345003', sex: 'M', birthDate: '2003-02-14' });
    core.enroll(director, { groupId: groupB.id, studentId: s3.id, startDate: '2026-03-01' });
    console.log('✔ Estudiantes matriculados en Grupo B.');
  }

  // ==========================================
  // CONFIGURACIÓN ACADÉMICA BASE 2026 (TAREA 32)
  // ==========================================
  const m9 = core.record('modules', 'MOD-009');
  if (m9 && !m9.academicYear) {
    core.write(director, 'modules', { ...m9, academicYear: '2026' }, m9.rev);
  }

  if (!core.record('documentSettings', 'academicYear:2026')) {
    console.log('[INIT SANDBOX] Configurando Año Académico 2026...');
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
    console.log('✔ Año Académico 2026 configurado.');
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
    console.log('✔ Periodo Académico 2026-I configurado.');
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
    console.log('✔ Periodo Académico 2026-II configurado.');
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
    console.log('✔ Currículo MOD-009 (Ofimática) configurado.');
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
    console.log('✔ Valores de referencia MOD-009 configurados.');
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
    console.log('✔ Personal docente Martín Valdivia configurado.');
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
    console.log('✔ Personal directivo Roberto Morales configurado.');
  }

  console.log('\n========================================================================');
  console.log('           DATOS SINTÉTICOS DE DESARROLLO VERIFICADOS                  ');
  console.log('========================================================================');
  console.log(' Cuentas disponibles en el sandbox de desarrollo:');
  console.log('   • DIRECTOR:   director.dev   /  DirectorDev2026!');
  console.log('   • DOCENTE:    docente.dev    /  DocenteDev2026!');
  console.log('   • SECRETARIA: secretaria.dev /  SecretariaDev2026!');
  console.log(' Aulas asignadas a docente.dev:');
  console.log('   1. Grupo A · Computación (Turno Mañana, 2 unidades)');
  console.log('   2. Grupo B · Confección Textil (Turno Tarde, 2 unidades)');
  console.log('========================================================================\n');
} finally {
  core.close();
}
