/**
 * Servidor Unificado de Producción — Sistema Académico CETPRO
 * Consolida V1 y V2 en un único punto de entrada oficial (Puerto 8080).
 * Incluye redirección automática y compatibilidad transparente con el puerto 8081.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const MAIN_PORT = 8080;
const COMPAT_PORT = 8081;
const BACKUP_FILE = path.join(ROOT, 'CETPRO_BACKUP_2026-09-15 (2).json');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

function handleRequest(req, res, serverPort) {
  const urlObj = new URL(req.url, `http://${HOST}:${serverPort}`);
  let pathname = decodeURIComponent(urlObj.pathname);

  // Favicon rápido sin contenido
  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  // Backup canónico para inicialización automática
  if (pathname === '/_candidate/real-backup') {
    if (!fs.existsSync(BACKUP_FILE)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Archivo de respaldo oficial no disponible.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(BACKUP_FILE).pipe(res);
    return;
  }

  // Redirección de raíz o variantes de index hacia la aplicación unificada
  let targetPath = pathname;
  if (targetPath === '/' || targetPath === '/index.html' || targetPath === '/app' || targetPath === '/app/') {
    targetPath = '/app/index.html';
  } else if (!targetPath.startsWith('/app') && !targetPath.startsWith('/app-v2') &&
             !targetPath.startsWith('/sources') && !targetPath.startsWith('/tools') &&
             !targetPath.startsWith('/docs') && !targetPath.startsWith('/scripts')) {
    targetPath = '/app' + targetPath;
  }

  const filePath = path.resolve(ROOT, `.${targetPath}`);

  // Seguridad: evitar path traversal fuera del ROOT
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Acceso denegado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(`404 Recurso no encontrado: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// 1. Servidor Principal Oficial (Puerto 8080)
const mainServer = http.createServer((req, res) => handleRequest(req, res, MAIN_PORT));
mainServer.listen(MAIN_PORT, HOST, () => {
  console.log('========================================================================');
  console.log('      SISTEMA ACADÉMICO CETPRO — SERVIDOR DE PRODUCCIÓN UNIFICADO       ');
  console.log('========================================================================');
  console.log(`✓ Servidor Oficial Activo: http://${HOST}:${MAIN_PORT}/`);
  console.log(`✓ Punto de Entrada:        http://${HOST}:${MAIN_PORT}/app/index.html`);
  console.log('✓ Base de Datos:           CETPRO_V2_CANDIDATE (Esquema v2 - 18 Almacenes)');
  console.log('✓ Control de Acceso:       RBAC Activo (Director, Secretaría, Docente)');
  console.log('✓ Modo de Operación:       100% Local y Autónomo (Sin Internet)');
});

// 2. Listener de Compatibilidad y Transición (Puerto 8081)
// Permite que cualquier acceso histórico a 8081 funcione de forma idéntica sin fallar
const compatServer = http.createServer((req, res) => handleRequest(req, res, COMPAT_PORT));
compatServer.listen(COMPAT_PORT, HOST, () => {
  console.log(`✓ Puente de Transición:    http://${HOST}:${COMPAT_PORT}/ (Sincronizado)`);
  console.log('========================================================================\n');
});

// Manejo de cierre elegante
process.on('SIGINT', () => {
  mainServer.close();
  compatServer.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  mainServer.close();
  compatServer.close();
  process.exit(0);
});
