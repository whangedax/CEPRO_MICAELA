const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {
  validateDevSandbox,
  isPathWithin,
  resolveCanonicalPath,
  DEFAULT_DEV_PORT
} = require('../scripts/dev-sandbox-guard.cjs');

const root = path.resolve(__dirname, '..');
const authorizedDataDir = path.resolve(root, 'dev-sandbox', 'data');

test('[SEGURIDAD] 1. Rechaza inicio si falta CETPRO_DATA_DIR (ausente, vacío o solo espacios)', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: '' }),
    /Se requiere CETPRO_DATA_DIR explícito/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: '   ' }),
    /Se requiere CETPRO_DATA_DIR explícito/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: undefined }),
    /Se requiere CETPRO_DATA_DIR explícito/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: null }),
    /Se requiere CETPRO_DATA_DIR explícito/
  );
});

test('[SEGURIDAD] 2. Rechaza rutas relativas', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: './dev-sandbox/data' }),
    /debe ser una ruta absoluta/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: '../dev-sandbox/data' }),
    /debe ser una ruta absoluta/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'relative/sandbox' }),
    /debe ser una ruta absoluta/
  );
});

test('[SEGURIDAD] 3. Rechaza directorios con prefijos similares (vulnerabilidad startsWith corregida)', () => {
  // Directorios hermanos que comienzan con "dev-sandbox" pero no son dev-sandbox
  const siblingFake = path.resolve(root, 'dev-sandbox-fake');
  assert.throws(
    () => validateDevSandbox({ dataDir: siblingFake }),
    /no es un sandbox autorizado/
  );

  const siblingEvil = path.resolve(root, 'dev-sandbox_evil');
  assert.throws(
    () => validateDevSandbox({ dataDir: siblingEvil }),
    /no es un sandbox autorizado/
  );

  // Prefijos similares en la carpeta "data"
  const dataFake = path.resolve(root, 'dev-sandbox', 'data-fake');
  assert.throws(
    () => validateDevSandbox({ dataDir: dataFake }),
    /no es un sandbox autorizado/
  );

  const dataEvil = path.resolve(root, 'dev-sandbox', 'data_evil');
  assert.throws(
    () => validateDevSandbox({ dataDir: dataEvil }),
    /no es un sandbox autorizado/
  );

  const dataBackup = path.resolve(root, 'dev-sandbox', 'data.bak');
  assert.throws(
    () => validateDevSandbox({ dataDir: dataBackup }),
    /no es un sandbox autorizado/
  );
});

test('[SEGURIDAD] 4. Rechaza carpetas arbitrarias que contengan la subcadena "sandbox" (eliminación de includes("sandbox"))', () => {
  // Rutas en cualquier parte del sistema que contengan "sandbox" pero no son dev-sandbox/data
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\arbitrary\\path\\with-sandbox-in-name' }),
    /no es un sandbox autorizado/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\sandbox' }),
    /no es un sandbox autorizado/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\temp\\my-custom-sandbox' }),
    /no es un sandbox autorizado/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\Users\\sandbox\\data' }),
    /no es un sandbox autorizado/
  );
});

test('[SEGURIDAD] 5. Rechaza carpetas padre o hermanas fuera de dev-sandbox/data', () => {
  // La raíz del proyecto
  assert.throws(
    () => validateDevSandbox({ dataDir: root }),
    /no es un sandbox autorizado/
  );
  // El contenedor dev-sandbox pero fuera de /data
  assert.throws(
    () => validateDevSandbox({ dataDir: path.resolve(root, 'dev-sandbox') }),
    /no es un sandbox autorizado/
  );
});

test('[SEGURIDAD] 6. Rechaza estrictamente cualquier ruta hacia private-data', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\CETPRO\\CETPRO_MODERNIZACION_V2\\private-data' }),
    /Intento de acceso a "private-data\/"/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:/CETPRO/CETPRO_MODERNIZACION_V2/private-data/nested' }),
    /Intento de acceso a "private-data\/"/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: path.resolve(root, 'private-data') }),
    /Intento de acceso a "private-data\/"/
  );
  // Intento de traversal
  const traversalToPrivate = path.resolve(authorizedDataDir, '..', '..', 'private-data');
  assert.throws(
    () => validateDevSandbox({ dataDir: traversalToPrivate }),
    /Intento de acceso a "private-data\/"/
  );
});

test('[SEGURIDAD] 7. Rechaza rutas hacia el repositorio original PAQUETE_ANTIGRAVITY_CETPRO_V2', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\CETPRO\\PAQUETE_ANTIGRAVITY_CETPRO_V2' }),
    /No se permite apuntar a la ruta del repositorio original/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:\\CETPRO\\PAQUETE_ANTIGRAVITY_CETPRO_V2\\data' }),
    /No se permite apuntar a la ruta del repositorio original/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: 'C:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/private-data' }),
    /Intento de acceso a "private-data\/"|No se permite apuntar a la ruta del repositorio original/
  );
});

test('[SEGURIDAD] 8. Rechaza Junctions NTFS hacia private-data institucional', () => {
  // Crear una carpeta destino que simule private-data en un entorno temporal
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cetpro-guard-test-'));
  const forbiddenTarget = path.join(tempDir, 'private-data');
  fs.mkdirSync(forbiddenTarget, { recursive: true });

  const junctionInSandbox = path.resolve(authorizedDataDir, 'test-junc-private-sim');

  try {
    fs.symlinkSync(forbiddenTarget, junctionInSandbox, 'junction');
    
    // Debe rechazar terminantemente debido a la resolución canónica
    assert.throws(
      () => validateDevSandbox({ dataDir: junctionInSandbox }),
      /private-data|no es un sandbox autorizado/i
    );
  } finally {
    if (fs.existsSync(junctionInSandbox)) {
      fs.unlinkSync(junctionInSandbox);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('[SEGURIDAD] 9. Rechaza Junctions NTFS hacia PAQUETE_ANTIGRAVITY_CETPRO_V2', () => {
  const repoOriginal = 'C:\\CETPRO\\PAQUETE_ANTIGRAVITY_CETPRO_V2';
  
  if (fs.existsSync(repoOriginal)) {
    const junctionToRepo = path.resolve(authorizedDataDir, 'test-junc-repo-sim');
    try {
      fs.symlinkSync(repoOriginal, junctionToRepo, 'junction');

      assert.throws(
        () => validateDevSandbox({ dataDir: junctionToRepo }),
        /PAQUETE_ANTIGRAVITY_CETPRO_V2|no es un sandbox autorizado/i
      );
    } finally {
      if (fs.existsSync(junctionToRepo)) {
        fs.unlinkSync(junctionToRepo);
      }
    }
  }
});

test('[SEGURIDAD] 10. Rechaza Junctions NTFS hacia carpetas externas arbitrarias', () => {
  const tempExternal = fs.mkdtempSync(path.join(os.tmpdir(), 'cetpro-external-dir-'));
  const junctionExternal = path.resolve(authorizedDataDir, 'test-junc-external-sim');

  try {
    fs.symlinkSync(tempExternal, junctionExternal, 'junction');

    assert.throws(
      () => validateDevSandbox({ dataDir: junctionExternal }),
      /no es un sandbox autorizado/
    );
  } finally {
    if (fs.existsSync(junctionExternal)) {
      fs.unlinkSync(junctionExternal);
    }
    fs.rmSync(tempExternal, { recursive: true, force: true });
  }
});

test('[SEGURIDAD] 11. Rechaza puertos reservados institucionales (8080, 8081)', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, port: 8080 }),
    /El puerto 8080 está reservado para el servidor institucional/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, port: 8081 }),
    /El puerto 8081 está reservado para el servidor institucional/
  );
});

test('[SEGURIDAD] 12. Rechaza puertos inválidos o fuera de rango', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, port: 80 }),
    /Puerto de desarrollo inválido/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, port: 70000 }),
    /Puerto de desarrollo inválido/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, port: 'puerto_falso' }),
    /Puerto de desarrollo inválido/
  );
});

test('[SEGURIDAD] 13. Rechaza hosts que no sean loopback local (127.0.0.1 o localhost)', () => {
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, host: '0.0.0.0' }),
    /solo puede escuchar en 127\.0\.0\.1/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, host: '192.168.1.100' }),
    /solo puede escuchar en 127\.0\.0\.1/
  );
  assert.throws(
    () => validateDevSandbox({ dataDir: authorizedDataDir, host: '10.0.0.1' }),
    /solo puede escuchar en 127\.0\.0\.1/
  );
});

test('[SEGURIDAD] 14. Aprueba de manera exclusiva el sandbox sintético autorizado dev-sandbox/data', () => {
  const result = validateDevSandbox({ dataDir: authorizedDataDir, port: DEFAULT_DEV_PORT });
  assert.equal(result.safe, true);
  assert.equal(result.port, DEFAULT_DEV_PORT);
  assert.equal(result.host, '127.0.0.1');
  assert.equal(
    path.resolve(result.dataDir).toLowerCase(),
    path.resolve(authorizedDataDir).toLowerCase()
  );
});

test('[SEGURIDAD] 15. Aprueba subdirectorios estrictos dentro de dev-sandbox/data', () => {
  const validSubdir = path.resolve(authorizedDataDir, 'sub-test-run');
  const result = validateDevSandbox({ dataDir: validSubdir, port: 8086 });
  assert.equal(result.safe, true);
  assert.equal(result.port, 8086);
  assert.ok(result.dataDir.toLowerCase().includes('sub-test-run'));
});

test('[SEGURIDAD] 16. Primitiva isPathWithin verifica límites estrictos sin falsos positivos de prefijo', () => {
  const base = path.resolve(root, 'dev-sandbox', 'data');
  assert.equal(isPathWithin(base, base), true);
  assert.equal(isPathWithin(base, path.join(base, 'child')), true);
  assert.equal(isPathWithin(base, path.join(base, 'child', 'grandchild')), true);

  // Falsos positivos que antes podían pasar con startsWith
  assert.equal(isPathWithin(base, base + '-fake'), false);
  assert.equal(isPathWithin(base, base + '_evil'), false);
  assert.equal(isPathWithin(base, base + '.bak'), false);
  assert.equal(isPathWithin(base, path.dirname(base)), false);
  assert.equal(isPathWithin(base, 'C:\\arbitrary\\path'), false);
});

test('[SEGURIDAD] 17. Rechaza archivos SQLite que sean hardlinks (nlink > 1)', () => {
  const testSubdir = path.resolve(authorizedDataDir, 'test-hardlink-sandbox');
  fs.mkdirSync(testSubdir, { recursive: true });
  const originalSqlite = path.join(testSubdir, 'cetpro.sqlite');
  const linkedSqlite = path.join(testSubdir, 'other-link.sqlite');

  try {
    fs.writeFileSync(originalSqlite, 'sqlite-content');
    fs.linkSync(originalSqlite, linkedSqlite); // nlink becomes 2

    assert.throws(
      () => validateDevSandbox({ dataDir: testSubdir }),
      /Se detectó hardlink en el archivo "cetpro\.sqlite"/
    );
  } finally {
    if (fs.existsSync(linkedSqlite)) fs.unlinkSync(linkedSqlite);
    if (fs.existsSync(originalSqlite)) fs.unlinkSync(originalSqlite);
    if (fs.existsSync(testSubdir)) fs.rmdirSync(testSubdir);
  }
});
