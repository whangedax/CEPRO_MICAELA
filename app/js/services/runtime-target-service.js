import { OperationalError } from './error-service.js';

export const RUNTIME_TARGETS = Object.freeze({ REAL: 'REAL', DEMO: 'DEMO', LAB: 'LAB' });
export const RUNTIME_DATABASES = Object.freeze({
  REAL: 'CETPRO_V2_CANDIDATE',
  DEMO: 'CETPRO_V2_DEMO'
});

let activeTarget = RUNTIME_TARGETS.REAL;

function targetError(message, code) {
  const error = new OperationalError(message, { code });
  error.code = code;
  return error;
}

export function getRuntimeTarget() { return activeTarget; }
export function isDemoRuntime() { return activeTarget === RUNTIME_TARGETS.DEMO; }

export function databaseEnvironment(dbName) {
  if (dbName === RUNTIME_DATABASES.DEMO) return RUNTIME_TARGETS.DEMO;
  if (dbName === RUNTIME_DATABASES.REAL) return RUNTIME_TARGETS.REAL;
  if (/^CETPRO_(?:SCHEMA_V2|V2_|M0|ARCH_|TEST_)/i.test(String(dbName || ''))) return RUNTIME_TARGETS.LAB;
  return null;
}

export function assertRuntimeDatabase(db, target = activeTarget) {
  if (!db || db.version !== 2 || !db.objectStoreNames?.contains('grupos_academicos')) {
    throw targetError('El runtime académico requiere una DB schema 2 exacta.', 'RUNTIME_SCHEMA_VIOLATION');
  }
  if (target === RUNTIME_TARGETS.DEMO && db.name !== RUNTIME_DATABASES.DEMO) {
    throw targetError('El modo demostración intentó acceder a una base REAL o no autorizada.', 'DEMO_TARGET_VIOLATION');
  }
  if (target === RUNTIME_TARGETS.REAL && db.name !== RUNTIME_DATABASES.REAL) {
    throw targetError('El runtime REAL no corresponde a CETPRO_V2_CANDIDATE.', 'REAL_TARGET_VIOLATION');
  }
  if (target === RUNTIME_TARGETS.LAB && databaseEnvironment(db.name) !== RUNTIME_TARGETS.LAB) {
    throw targetError('El runtime LAB requiere una base QA explícita.', 'LAB_TARGET_VIOLATION');
  }
  return db;
}

export function assertRuntimeWriteTarget(db, target = activeTarget) {
  if (target === RUNTIME_TARGETS.DEMO) return assertRuntimeDatabase(db, RUNTIME_TARGETS.DEMO);
  if (target === RUNTIME_TARGETS.REAL && db?.name === 'CETPRO_DB') {
    throw targetError('CETPRO_DB productiva permanece protegida.', 'PRODUCTIVE_DB_FORBIDDEN');
  }
  return db;
}

export function setRuntimeTarget(target, db) {
  if (!Object.values(RUNTIME_TARGETS).includes(target)) {
    throw targetError(`Runtime target no reconocido: ${String(target)}.`, 'RUNTIME_TARGET_INVALID');
  }
  assertRuntimeDatabase(db, target);
  activeTarget = target;
  globalThis.dispatchEvent?.(new CustomEvent('cetpro:runtime-target', { detail: { target, dbName: db.name } }));
  return { target, dbName: db.name, version: db.version };
}

export function runtimeTargetError(message, code) { return targetError(message, code); }
