# Auditoría de portabilidad offline — MVP administrativo

## Runtime actual

- La aplicación usa HTML, CSS y JavaScript servidos localmente.
- `pdf-lib` está vendorizada en `app/vendor/pdf-lib.min.js`.
- IndexedDB conserva datos, auditoría y respaldos en el navegador local.
- Las vistas operativas y la generación PDF/CSV no llaman CDN ni servicios externos.
- No se requiere Excel, Python, Codex, Antigravity ni `npm install` para operar una instancia ya empaquetada.

## Dependencia pendiente para distribución Windows

El entorno de desarrollo todavía usa Node.js para levantar el servidor local en los puertos de prueba. El siguiente gate debe producir un paquete Windows autocontenido que:

1. incluya un servidor estático local o contenedor equivalente;
2. abra la aplicación en el navegador admitido;
3. conserve el perfil de datos local;
4. no exponga el endpoint del backup fuente de construcción;
5. permita exportar respaldos a una ubicación elegida por el usuario;
6. funcione sin Node.js instalado en la PC final.

Estado: `MVP_OFFLINE_RUNTIME = PASS`; `WINDOWS_SELF_CONTAINED_PACKAGE = PENDING`.
