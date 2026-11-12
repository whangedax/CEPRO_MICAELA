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
  if (!rawText || typeof rawText !== 'string') {
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

  let compressedBuffer;
  try {
    compressedBuffer = Buffer.from(base64UrlData, 'base64url');
  } catch (err) {
    throw new Error('Datos codificados inválidos en el mensaje.');
  }

  let decompressedBuffer;
  try {
    decompressedBuffer = zlib.inflateRawSync(compressedBuffer);
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
function exportForWhatsApp(core, actor, options = {}) {
  const syncModule = options.syncModule || options.module || 'all';
  const hubId = core.setting('institution')?.hub?.id;
  const isSatellite = !core.setting('authorityPrivate') || actor.role === 'DOCENTE';

  let pkg;
  if (isSatellite && hubId && core.setting('certificate')) {
    pkg = core.packageFor(actor, hubId, { syncModule });
  } else if (!isSatellite && options.recipientUserId) {
    const devicesList = core.setting('devices') || [];
    const linkedDev = devicesList.find((dev) => dev.userId === options.recipientUserId);
    if (linkedDev) {
      pkg = core.packageFor(actor, linkedDev.id, { syncModule });
    } else {
      pkg = core.exchangePackage(actor, {
        recipientUserId: options.recipientUserId,
        syncModule,
        passphrase: options.passphrase || 'CETPRO_2026'
      });
    }
  } else {
    pkg = core.exchangePackage(actor, {
      syncModule,
      passphrase: options.passphrase || 'CETPRO_2026'
    });
  }

  const rawJson = JSON.stringify(pkg, null, 2);
  const rawBytes = Buffer.byteLength(rawJson, 'utf8');

  // Si cabe en un mensaje de chat y no se forzó archivo, generar token compacto
  const preferToken = options.asToken !== false && rawBytes <= MAX_TEXT_TOKEN_BYTES;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileName = `WHATSAPP_SYNC_${actor.username}_${syncModule.toUpperCase()}_${dateStamp}.cetpro`;

  let exportDir = options.targetDirectory;
  if (!exportDir) {
    exportDir = path.join(core.directory, 'exportaciones_whatsapp');
  }
  fs.mkdirSync(exportDir, { recursive: true });
  const finalFilePath = path.join(exportDir, fileName);
  fs.writeFileSync(finalFilePath, rawJson, 'utf8');

  let tokenText = null;
  if (preferToken) {
    try {
      tokenText = encodePackageToToken(pkg);
    } catch {}
  }

  return {
    success: true,
    syncModule,
    operationsCount: pkg.body?.operations?.length || 0,
    sizeBytes: rawBytes,
    isTokenAvailable: !!tokenText,
    tokenText,
    fileName,
    filePath: finalFilePath,
    instructions: tokenText
      ? 'Puede copiar el código de texto directamente al chat de WhatsApp o adjuntar el archivo .cetpro generado.'
      : 'El lote excede el tamaño de texto directo. Adjunte el archivo .cetpro generado en su chat de WhatsApp.'
  };
}

/**
 * Importa datos provenientes de WhatsApp (sea código de texto pegado o archivo descargado).
 */
function importFromWhatsApp(core, actor, input) {
  let pkg;

  if (input.tokenText) {
    pkg = decodeTokenToPackage(input.tokenText);
  } else if (input.filePath) {
    if (!fs.existsSync(input.filePath)) {
      throw new Error(`El archivo indicado no existe: ${input.filePath}`);
    }
    const raw = fs.readFileSync(input.filePath, 'utf8');
    pkg = JSON.parse(raw);
  } else if (input.package) {
    pkg = input.package;
  } else {
    throw new Error('Debe proporcionar el texto del código (tokenText) o la ruta del archivo (filePath).');
  }

  // Importar usando el motor transaccional de offline-core
  const result = core.importPackage(actor, pkg, true, input.passphrase);

  return {
    success: true,
    channel: 'WHATSAPP',
    syncModule: pkg.body?.syncModule || 'all',
    fromDeviceId: pkg.body?.from,
    sender: pkg.body?.certificate?.body?.user?.name || 'Desconocido',
    operationsApplied: result.applied || 0,
    conflictsDetected: result.conflicts || 0,
    report: result
  };
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
