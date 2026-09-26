/**
 * Configuración global del Sistema Académico CETPRO
 * Módulo: M01 - Núcleo Local
 */

const runtime = globalThis.__CETPRO_RUNTIME_CONFIG__ || null;
if (runtime && (runtime.build !== 'V2_CANDIDATE' ||
    runtime.dbName !== 'CETPRO_V2_CANDIDATE' || runtime.dbVersion !== 2)) {
  throw new Error('Configuración runtime no autorizada.');
}

export const CONFIG = {
  APP_NAME: 'Sistema Académico CETPRO',
  APP_VERSION: '1.0.0-M02',
  
  DB: {
    NAME: runtime?.dbName || 'CETPRO_DB',
    VERSION: runtime?.dbVersion || 1,
    TEST_DB_NAME: 'CETPRO_TEST_DB'
  },
  BUILD_TARGET: runtime?.build || 'V1_PRODUCTION',
  IS_V2_CANDIDATE: runtime?.build === 'V2_CANDIDATE',
  
  DEFAULT_ROUTE: '#/inicio',
  
  ROUTES: {
    '#/inicio': { title: 'Inicio', id: 'inicio', icon: 'home' },
    '#/demo': { title: 'Modo Demostración', id: 'demo', icon: 'play' },
    '#/demo/evaluacion': { title: 'Evaluación Demo', id: 'demo-evaluacion', icon: 'chart' },
    '#/estudiantes': { title: 'Estudiantes', id: 'estudiantes', icon: 'users' },
    '#/matriculas': { title: 'Matrículas', id: 'matriculas', icon: 'clipboard' },
    '#/programas': { title: 'Programas y Módulos', id: 'programas', icon: 'book' },
    '#/grupos': { title: 'Asignación de grupos', id: 'grupos', icon: 'clipboard' },
    '#/nominas': { title: 'Nóminas', id: 'nominas', icon: 'file-text' },
    '#/registros/matricula': { title: 'Registro de matrícula', id: 'registro-matricula', icon: 'clipboard' },
    '#/configuracion-academica': { title: 'Configuración académica', id: 'configuracion-academica', icon: 'settings' },
    '#/registro': { title: 'Registro Académico', id: 'registro', icon: 'edit' },
    '#/evaluacion': { title: 'Evaluación', id: 'evaluacion', icon: 'chart' },
    '#/efsrt': { title: 'EFSRT', id: 'efsrt', icon: 'briefcase' },
    '#/cierre': { title: 'Cierre Académico', id: 'cierre', icon: 'check-square' },
    '#/documentos': { title: 'Documentos', id: 'documentos', icon: 'file-text' },
    '#/incidencias': { title: 'Incidencias', id: 'incidencias', icon: 'alert-triangle' },
    '#/respaldo': { title: 'Respaldo', id: 'respaldo', icon: 'database' },
    '#/configuracion': { title: 'Configuración', id: 'configuracion', icon: 'settings' }
  }
};
