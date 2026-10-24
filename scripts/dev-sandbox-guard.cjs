/**
 * dev-sandbox-guard.cjs
 * 
 * MECANISMO DE AISLAMIENTO OBLIGATORIO PARA DESARROLLO - CEPRO_MICAELA 2.0
 * 
 * Garantiza que la ejecución de desarrollo y pruebas utilice EXCLUSIVAMENTE
 * la carpeta de datos sintéticos autorizada (dev-sandbox/data), previniendo
 * cualquier acceso, lectura o escritura sobre bases de datos institucionales
 * (private-data/ o PAQUETE_ANTIGRAVITY_CETPRO_V2).
 * 
 * CORRECCIONES DE SEGURIDAD (TAREA 08):
 * - Eliminación total de comparaciones vulnerables mediante startsWith sin delimitador.
 * - Eliminación total de validaciones permisivas por presencia de la subcadena "sandbox".
 * - Whitelist estricta: sólo dev-sandbox/data (y subdirectorios estrictos).
 * - Resolución canónica para desenmascarar symlinks y junctions NTFS.
 * - Validación léxica y canónica en dos capas antes de cualquier acceso a SQLite.
 */

const path = require('node:path');
const fs = require('node:fs');

const PRODUCTION_PORTS = [8080, 8081];
const DEFAULT_DEV_PORT = 8085;
const LOOPBACK_HOST = '127.0.0.1';

/**
 * Elimina prefijos extendidos de Windows (\\?\ o \\?\UNC\)
 */
function stripExtendedPrefix(targetPath) {
  if (typeof targetPath !== 'string') return targetPath;
  if (targetPath.startsWith('\\\\?\\UNC\\')) {
    return '\\\\' + targetPath.slice(8);
  }
  if (targetPath.startsWith('\\\\?\\')) {
    return targetPath.slice(4);
  }
  return targetPath;
}

/**
 * Resuelve la ruta canónica real del sistema de archivos,
 * desenmascarando enlaces simbólicos, junctions NTFS y nombres 8.3.
 * Si la ruta no existe completa, resuelve el ancestro existente más cercano.
 */
function resolveCanonicalPath(targetPath) {
  let resolved = stripExtendedPrefix(path.resolve(targetPath));

  // Si la ruta existe completa, resolver ruta canónica nativa
  try {
    if (fs.existsSync(resolved)) {
      return stripExtendedPrefix(fs.realpathSync.native(resolved));
    }
  } catch {
    try {
      if (fs.existsSync(resolved)) {
        return stripExtendedPrefix(fs.realpathSync(resolved));
      }
    } catch {
      // Continuar con resolución por ancestros
    }
  }

  // Si no existe, iterar hacia arriba hasta encontrar el ancestro existente
  const segments = [];
  let current = resolved;

  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    segments.unshift(path.basename(current));
    current = parent;
  }

  if (fs.existsSync(current)) {
    let realBase = current;
    try {
      realBase = stripExtendedPrefix(fs.realpathSync.native(current));
    } catch {
      try {
        realBase = stripExtendedPrefix(fs.realpathSync(current));
      } catch {
        realBase = current;
      }
    }
    resolved = path.join(realBase, ...segments);
  }

  return stripExtendedPrefix(path.resolve(resolved));
}

/**
 * Verifica de forma estricta si `childPath` es idéntico o está estrictamente
 * contenido dentro de `parentPath`, previniendo ataques de colisión de prefijo
 * (ej. dev-sandbox-fake vs dev-sandbox).
 */
function isPathWithin(parentPath, childPath) {
  const normParent = stripExtendedPrefix(path.resolve(parentPath));
  const normChild = stripExtendedPrefix(childPath ? stripExtendedPrefix(path.resolve(childPath)) : childPath);

  if (!normParent || !normChild) return false;

  // En Windows las rutas son insensibles a mayúsculas/minúsculas
  const isWindows = process.platform === 'win32';
  const compParent = isWindows ? normParent.toLowerCase() : normParent;
  const compChild = isWindows ? normChild.toLowerCase() : normChild;

  const rel = path.relative(compParent, compChild);

  // rel === '' significa que son exactamente el mismo directorio
  // rel sin '..' inicial ni ruta absoluta significa que child está estrictamente dentro de parent
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Valida que una ruta de datos sea un sandbox seguro y autorizado.
 * Lanza Error si la ruta es insegura, externa o institucional.
 * 
 * NINGUNA CONEXIÓN SQLITE SE ABRE ANTES O DURANTE ESTA VALIDACIÓN.
 */
function validateDevSandbox(options = {}) {
  const root = path.resolve(__dirname, '..');
  const rawDataDir = Object.prototype.hasOwnProperty.call(options, 'dataDir')
    ? options.dataDir
    : process.env.CETPRO_DATA_DIR;

  // 1. Verificación de existencia explícita de CETPRO_DATA_DIR
  if (!rawDataDir || typeof rawDataDir !== 'string' || !rawDataDir.trim()) {
    throw new Error(
      '[PROTECCIÓN SQLITE BLOQUEADA] Se requiere CETPRO_DATA_DIR explícito para desarrollo. ' +
      'No se permite arrancar el servidor sin definir una ruta de datos sintéticos.'
    );
  }

  const trimmedDataDir = rawDataDir.trim();

  // 2. Verificación de ruta absoluta
  if (!path.isAbsolute(trimmedDataDir)) {
    throw new Error(
      `[PROTECCIÓN SQLITE BLOQUEADA] CETPRO_DATA_DIR debe ser una ruta absoluta. Recibido: "${rawDataDir}"`
    );
  }

  // 3. Resolución léxica previa a symlinks
  const lexicalDataDir = stripExtendedPrefix(path.resolve(trimmedDataDir));
  const normalizedLexical = lexicalDataDir.replace(/\\/g, '/').toLowerCase();

  // 4. Prohibición estricta de "private-data" en ruta léxica
  if (/(^|\/)private-data(\/|$)/i.test(normalizedLexical)) {
    throw new Error(
      '[PROTECCIÓN SQLITE BLOQUEADA] Intento de acceso a "private-data/". ' +
      'Las bases de datos institucionales están estrictamente prohibidas en desarrollo.'
    );
  }

  // 5. Prohibición estricta de apuntar al repositorio original
  const forbiddenRepo = 'paquete_antigravity_cetpro_v2';
  if (normalizedLexical.includes(forbiddenRepo)) {
    throw new Error(
      '[PROTECCIÓN SQLITE BLOQUEADA] No se permite apuntar a la ruta del repositorio original ' +
      'PAQUETE_ANTIGRAVITY_CETPRO_V2.'
    );
  }

  // 6. Resolución canónica (desenmascara junctions NTFS y symlinks)
  const canonicalDataDir = resolveCanonicalPath(trimmedDataDir);
  const normalizedCanonical = canonicalDataDir.replace(/\\/g, '/').toLowerCase();

  // 7. Prohibición estricta de "private-data" en destino canónico
  if (/(^|\/)private-data(\/|$)/i.test(normalizedCanonical)) {
    throw new Error(
      '[PROTECCIÓN SQLITE BLOQUEADA] Enlace o ruta canónica apunta a "private-data/". ' +
      'Las bases de datos institucionales están estrictamente prohibidas en desarrollo.'
    );
  }

  // 8. Prohibición estricta de repositorio original en destino canónico
  if (normalizedCanonical.includes(forbiddenRepo)) {
    throw new Error(
      '[PROTECCIÓN SQLITE BLOQUEADA] Enlace o ruta canónica apunta al repositorio original ' +
      'PAQUETE_ANTIGRAVITY_CETPRO_V2.'
    );
  }

  // 9. Whitelist estricta: sandbox sintético autorizado exclusivo
  // Ubicación autorizada: <proyecto>/dev-sandbox/data (y subdirectorios estrictos)
  const authorizedSandboxDataDir = path.resolve(root, 'dev-sandbox', 'data');
  const canonicalAuthorizedSandbox = resolveCanonicalPath(authorizedSandboxDataDir);

  // Validación de fronteras: TANTO la ruta léxica como la canónica deben estar dentro de dev-sandbox/data
  const isLexicalInside = isPathWithin(authorizedSandboxDataDir, lexicalDataDir);
  const isCanonicalInside = isPathWithin(canonicalAuthorizedSandbox, canonicalDataDir);

  if (!isLexicalInside || !isCanonicalInside) {
    throw new Error(
      `[PROTECCIÓN SQLITE BLOQUEADA] La ruta de datos "${rawDataDir}" no es un sandbox autorizado. ` +
      `Debe estar estrictamente dentro de "${authorizedSandboxDataDir}". ` +
      `Se rechazan prefijos similares, rutas externas y enlaces a destinos no autorizados.`
    );
  }

  // 10. Validación de puerto de desarrollo
  const port = Object.prototype.hasOwnProperty.call(options, 'port')
    ? Number(options.port)
    : Number(process.env.CETPRO_DEV_PORT || process.env.CETPRO_PORT || DEFAULT_DEV_PORT);

  if (PRODUCTION_PORTS.includes(port)) {
    throw new Error(
      `[PROTECCIÓN SQLITE BLOQUEADA] El puerto ${port} está reservado para el servidor institucional. ` +
      `En desarrollo debe utilizarse un puerto diferente (e.g. ${DEFAULT_DEV_PORT}).`
    );
  }

  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`[PROTECCIÓN SQLITE BLOQUEADA] Puerto de desarrollo inválido: ${port}`);
  }

  // 11. Verificación de host local (loopback exclusivo)
  const host = options.host || LOOPBACK_HOST;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `[PROTECCIÓN SQLITE BLOQUEADA] El servidor de desarrollo solo puede escuchar en 127.0.0.1. Recibido: "${host}"`
    );
  }

  // 12. Verificación previa de archivos SQLite existentes para rechazar hardlinks cuando nlink > 1
  const sqliteFiles = ['cetpro.sqlite', 'cetpro.sqlite-wal', 'cetpro.sqlite-shm'];
  for (const filename of sqliteFiles) {
    const fullPath = path.join(canonicalDataDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.nlink > 1) {
          throw new Error(
            `[PROTECCIÓN SQLITE BLOQUEADA] Se detectó hardlink en el archivo "${filename}" (nlink: ${stat.nlink} > 1). ` +
            'Las bases de datos vinculadas por hardlink están estrictamente prohibidas.'
          );
        }
      } catch (err) {
        if (err.message && err.message.includes('PROTECCIÓN SQLITE BLOQUEADA')) throw err;
      }
    }
  }

  return {
    safe: true,
    dataDir: canonicalDataDir,
    port,
    host: LOOPBACK_HOST,
    root: resolveCanonicalPath(root)
  };
}

module.exports = {
  validateDevSandbox,
  isPathWithin,
  resolveCanonicalPath,
  stripExtendedPrefix,
  PRODUCTION_PORTS,
  DEFAULT_DEV_PORT,
  LOOPBACK_HOST
};
