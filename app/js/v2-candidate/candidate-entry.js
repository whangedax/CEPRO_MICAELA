globalThis.__CETPRO_RUNTIME_CONFIG__ = Object.freeze({
  build: 'V2_CANDIDATE',
  dbName: 'CETPRO_V2_CANDIDATE',
  dbVersion: 2
});

const banner = document.querySelector('#candidate-runtime-banner');

try {
  const { initializeV2Candidate, closeV2CandidateDB } = await import('./candidate-db.js');
  const db = await initializeV2Candidate();
  if (db.name !== 'CETPRO_V2_CANDIDATE' || db.version !== 2 ||
      !db.objectStoreNames.contains('grupos_academicos')) {
    throw new Error('La candidata no obtuvo el contrato físico schema 2.');
  }
  closeV2CandidateDB();
  if (banner) banner.textContent = 'OPERACIÓN LOCAL';
  await import('../app.js');
} catch (error) {
  console.error('V2 candidate bootstrap failed:', error);
  if (banner) banner.textContent = 'INICIO BLOQUEADO';
  const main = document.querySelector('#main-content');
  if (main) {
    main.replaceChildren();
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.textContent = `No se inició la candidata: ${error?.message || 'error de preflight'}`;
    main.append(alert);
  }
}
