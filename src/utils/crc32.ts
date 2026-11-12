/**
 * src/utils/crc32.ts
 *
 * Cálculo estándar de CRC32 (Polinomio IEEE 802.3 0xEDB88320).
 * Utilizado para garantizar la integridad de las fichas de admisión 2026
 * transmitidas mediante WhatsApp y códigos QR.
 */

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

/**
 * Calcula el checksum CRC32 en representación hexadecimal de 8 caracteres mayúsculas.
 */
export function calculateCrc32(str: string): string {
  const utf8 = new TextEncoder().encode(str);
  let crc = 0xffffffff;
  for (let i = 0; i < utf8.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ utf8[i]) & 0xff];
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Valida si un bloque de datos tiene un CRC32 coincidente.
 */
export function verifyCrc32(rawDataWithoutCrc: string, expectedCrc: string): boolean {
  if (!expectedCrc || expectedCrc.length !== 8) return false;
  const actualCrc = calculateCrc32(rawDataWithoutCrc);
  return actualCrc.toUpperCase() === expectedCrc.toUpperCase();
}
