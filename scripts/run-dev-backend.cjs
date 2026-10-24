/**
 * run-dev-backend.cjs
 * 
 * Launcher de desarrollo seguro para CEPRO_MICAELA 2.0.
 * Establece la ruta absoluta de CETPRO_DATA_DIR hacia el sandbox autorizado
 * y arranca el servidor de desarrollo en 127.0.0.1:8085.
 */

const path = require('node:path');
const root = path.resolve(__dirname, '..');

process.env.CETPRO_DATA_DIR = path.resolve(root, 'dev-sandbox', 'data');
process.env.CETPRO_PORT = process.env.CETPRO_PORT || '8085';

require('./server-dev.cjs');
