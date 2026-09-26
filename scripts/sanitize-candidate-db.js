/**
 * Script de Saneamiento Seguro para CETPRO_V2_CANDIDATE (Puerto 8081)
 * 
 * Propósito:
 * Purgar periodos espurios o tentativos (ej. "no tengo idea") ingresados en pruebas manuales,
 * restaurando el store 'periodos' a su estado canónico limpio (0 periodos) sin tocar estudiantes ni matrículas.
 * 
 * RESTRICCIÓN CRÍTICA:
 * Prohibido tocar CETPRO_DB o puerto 8080. Operación exclusiva en CETPRO_V2_CANDIDATE.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CANDIDATE_URL = 'http://127.0.0.1:8081/tools/sanitize-candidate-db.html';

async function main() {
  console.log('===========================================================');
  console.log(' SANEAMIENTO SEGURO DE BASE CANDIDATA (CETPRO_V2_CANDIDATE)');
  console.log('===========================================================');

  // Verificar que el servidor candidato 8081 esté activo
  const http = require('http');
  const isUp = await new Promise(resolve => {
    const req = http.get('http://127.0.0.1:8081/', res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });

  if (!isUp) {
    console.error('ERROR: El servidor candidato en puerto 8081 no está activo.');
    console.error('Inícielo primero con: node scripts/v2-candidate-server.js');
    process.exit(1);
  }

  console.log('Servidor candidato 8081 detectado.');
  console.log('Herramienta web disponible en:');
  console.log(' -> http://127.0.0.1:8081/tools/sanitize-candidate-db.html');
  console.log('\nSi el navegador Edge está abierto con su sesión de usuario,');
  console.log('abra directamente la URL anterior para sanear la base con un solo clic.\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fallo en script:', err);
    process.exit(1);
  });
}

module.exports = { main };
