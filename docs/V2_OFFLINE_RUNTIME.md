# Runtime offline v2

HTML, CSS, JavaScript, pdf-lib, logos, imágenes, manifests y 21 PDF canónicos son locales. La candidata no requiere CDN, fuentes web, XHR ni WebSocket externo. Las rutas Inicio, Estudiantes, Matrículas, Programas, Grupos, Registro, EFSRT, Cierre, Documentos, Incidencias, Respaldo y Configuración comparten el shell local.

El health check clasifica cada área como `PASS`, `FAIL`, `BLOCKED_BY_SOURCE` o `NOT_EXECUTED`; un bloqueo de fuente no se presenta como fallo técnico.
