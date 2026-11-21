/**
 * scripts/sync-whatsapp.cjs
 * 
 * Canal de sincronización alternativo para WhatsApp:
 * 1. Generación de tokens compactos de texto (copiables en chat de WhatsApp).
 * 2. Exportación de archivos .cetpro listos para enviar como documento adjunto.
 * 3. Decodificación, verificación de integridad (CRC32 / firma) e importación atómica.
 */

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HEADER_DELIMITER = '---INICIO-CETPRO-SYNC---';
const FOOTER_DELIMITER = '---FIN-CETPRO-SYNC---';
const TOKEN_PREFIX = 'CETPRO-SYNC:v1:';
const MAX_TEXT_TOKEN_BYTES = 64 * 1024; // 64 KB límite para texto de chat

/**
 * Calcula un checksum CRC32 rápido en hexadecimal (8 caracteres).
 */
function crc32Hex(buffer) {
  // Implementación determinista de CRC32
  let crc = 0 ^ (-1);
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

/**
 * Codifica un objeto paquete en un token compacto de texto copiable para WhatsApp.
 * @param {object} pkg - Paquete firmado CETPRO (.cetpro)
 * @returns {string} Bloque delimitado listo para pegar en WhatsApp
 */
function encodePackageToToken(pkg) {
  const jsonString = typeof pkg === 'string' ? pkg : JSON.stringify(pkg);
  const jsonBuffer = Buffer.from(jsonString, 'utf8');

  // Compresión Deflate con nivel óptimo
  const compressed = zlib.deflateRawSync(jsonBuffer, { level: 9 });
  const checksum = crc32Hex(jsonBuffer);
  const base64Url = compressed.toString('base64url');

  return [
    HEADER_DELIMITER,
    `${TOKEN_PREFIX}${checksum}:${base64Url}`,
    FOOTER_DELIMITER
  ].join('\r\n');
}

/**
 * Decodifica un texto recibido por WhatsApp (token compacto) y recupera el paquete original.
 * @param {string} rawText - Texto copiado del chat
 * @returns {object} Paquete deserializado
 */
function decodeTokenToPackage(rawText) {
  if (!rawText || typeof rawText !== 'string' || Buffer.byteLength(rawText)>MAX_TEXT_TOKEN_BYTES) {
    throw new Error('El texto proporcionado está vacío o no es válido.');
  }

  // Buscar línea con el prefijo
  const lines = rawText.split(/\r?\n/);
  const tokenLine = lines.find((l) => l.trim().startsWith(TOKEN_PREFIX));

  if (!tokenLine) {
    throw new Error('No se encontró un código de sincronización válido (falta prefijo CETPRO-SYNC:v1:).');
  }

  const payloadPart = tokenLine.trim().slice(TOKEN_PREFIX.length);
  const colonIndex = payloadPart.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Formato de código corrupto (delimitador de verificación ausente).');
  }

  const expectedChecksum = payloadPart.slice(0, colonIndex).toUpperCase();
  const base64UrlData = payloadPart.slice(colonIndex + 1);
  if(!/^[A-F0-9]{8}$/.test(expectedChecksum)||!/^[A-Za-z0-9_-]+$/.test(base64UrlData))throw new Error('Formato de código inválido.');

  let compressedBuffer;
  try {
    compressedBuffer = Buffer.from(base64UrlData, 'base64url');
  } catch (err) {
    throw new Error('Datos codificados inválidos en el mensaje.');
  }

  let decompressedBuffer;
  try {
    decompressedBuffer = zlib.inflateRawSync(compressedBuffer, { maxOutputLength: 28 * 1024 * 1024 });
  } catch (err) {
    throw new Error('Fallo de descompresión: el código de WhatsApp está incompleto o truncado.');
  }

  const actualChecksum = crc32Hex(decompressedBuffer);
  if (actualChecksum !== expectedChecksum) {
    throw new Error(`Error de integridad en el código (CRC32 recibido ${expectedChecksum} != calculado ${actualChecksum}).`);
  }

  try {
    return JSON.parse(decompressedBuffer.toString('utf8'));
  } catch (err) {
    throw new Error('El contenido descompromprimido no es un JSON institucional válido.');
  }
}

/**
 * Exporta un lote para WhatsApp: si es pequeño genera token; si es grande o se solicita archivo, crea .cetpro.
 */
function exportForWhatsApp(core,actor,options={}) {
  const result=require('./sync-transfer.cjs').exportTransfer(core,actor,{...options,channel:'WHATSAPP'});
  // Legacy response fields remain; modern clients download result.package directly.
  return {...result,success:true,syncModule:result.summary.module,operationsCount:result.summary.total,sizeBytes:Buffer.byteLength(JSON.stringify(result.package)),isTokenAvailable:!!result.tokenText};
}
const legacyServices=new WeakMap();
function importFromWhatsApp(core,actor,input={},context=null) {
  const {SyncTransferService}=require('./sync-transfer.cjs');
  if(!legacyServices.has(core))legacyServices.set(core,new SyncTransferService(core));
  const service=legacyServices.get(core);
  if(input.filePath)throw new Error('Seleccione el archivo .cetpro desde la aplicación; no se admiten rutas arbitrarias.');
  if(!input.previewToken)return service.preview(actor,input,context);
  const result=service.import(actor,input,context);
  return {...result,success:true,channel:'WHATSAPP',syncModule:result.summary.module,operationsApplied:(result.report.newRecords||0)+(result.report.updates||0),conflictsDetected:result.report.conflicts||0};
}

module.exports = {
  HEADER_DELIMITER,
  FOOTER_DELIMITER,
  TOKEN_PREFIX,
  encodePackageToToken,
  decodeTokenToPackage,
  exportForWhatsApp,
  importFromWhatsApp
};
