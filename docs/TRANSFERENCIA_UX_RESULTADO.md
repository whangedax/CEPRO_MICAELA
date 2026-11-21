# Rediseño de compartir y archivos — 2026-11-13

Alcance: Dirección, Secretaría y Docente en `#/sincronizacion` y `#/datos`.
Integración selectiva completada, con SHA-256 verificados y copia previa de los archivos reemplazados.
Implementación basada en la versión vigente C:/CETPRO/CETPRO_MODERNIZACION_V2,
trabajada primero en dev-sandbox/ux-transfer; sin bases institucionales.

## Resultado
- Navegación «Compartir entre equipos» y «Trabajar con archivos», mismas rutas.
- Entradas por intención y cuatro pasos: una decisión principal por pantalla.
- Perfil real visible; se eliminó la confusión entre autoridad del equipo y rol.
- Resumen del emisor, destinatario, categoría, aulas y cantidades; permisos del servidor.
- Ayuda por perfil y herramientas avanzadas plegadas, disponibles sin saturar.
- Datos: Excel recomendado, CSV/JSON conservados, plantilla vacía y datos actuales.
- Vista previa con acciones y valores antes/recibidos que aporta la API, páginas de 50
  cambios, confirmación explícita y propuestas docentes diferenciadas de altas oficiales.
- Back conserva selecciones; editar invalida revisión/salida; actor/contexto reinicia
  estado transitorio. Claves ocultas por defecto; copia manual si falla portapapeles.
- Tokens visuales existentes y fuente local Plus Jakarta Sans; no dependencias nuevas.

## Validación real
- `node --test --test-isolation=none tests/sync-transfer-safe.test.cjs tests/sync-whatsapp.test.cjs tests/sync-modular.test.cjs tests/data-update.test.cjs tests/data-transfer-safe.test.cjs tests/curriculum-units.test.cjs tests/critical-workflows.test.cjs`: **53/53**, exit 0.
- `node tests/sync-transfer-ui.cjs`: **36 escenarios**, tres roles, **0 errores JavaScript**, exit 0.
  Servicio y navegador efímeros, cuentas sintéticas; WhatsApp/cetpro exportados,
  descarga real y recepción por archivo/código; destinatario incorrecto rechazado;
  Excel exportado vuelve a preview sin escribir; JSON confirma actualizaciones/propuestas;
  preview no escribe, checkbox bloquea confirmación; Back y copia manual probados.
  Capturas 1024/1366 px, claro/oscuro, sin desborde horizontal a 1024 px.
- `npm run build`: exit 0; advertencia previa de bundle mayor de 500 kB.
- Revisión independiente: código de rutas/permisos/invalidación y capturas de ambos temas.
- Evidencia sintética: [reporte](design/evidence/transfer-ux/report.json).

## Límites
WhatsApp se verifica como mensaje copiable/pegable y archivo; no se envió un chat real.
USB se verifica como descarga/carga de archivo; no se conectó un dispositivo físico.
No se validó Electron empaquetado ni escalado Windows 125/150%; no es homologación institucional.
No se cambiaron backend, base de datos, formatos MINEDU ni instaladores.
La API de paquetes aporta conteos y metadatos; no se inventan diferencias individuales.

## Archivos y SHA-256 del lote

- `src/components/network/SyncTransferPanel.tsx`: `4e476ad8d77ca7e0f9fd810e7ab77b11c2676671a17f299f0ad7f4cc6e450e31`
- `src/components/network/TransferFlow.tsx`: `3161422c059c3fb33ccf4a900933f3b4e19a3be8f47ca00cc6adf13756374d1e`
- `src/pages/ActualizarExportarDatos.tsx`: `30f77102df072714f63ef43875ed980107f609dcf8ad30f828dd14c28b78f983`
- `src/pages/Sincronizacion.tsx`: `7d84a11fb378c6e85e5a9df6f1783fb7626f8c2dcde454f1cc78b6833753c4ce`
- `src/components/ui/Sidebar/Sidebar.tsx`: `9b448776895b13bab15c7ec45f666c9cf669ccd28b8cce50f5e169efb8df7ea9`
- `tests/sync-transfer-ui.cjs`: `5303b10c7dfd91cea9beff2554b5f92bc0a66e5ad5e227ca99d15c1638bd0787`

## Cierre de integración
- Auditor independiente: APROBADO, sin bloqueos pendientes; hallazgo de revisión tabular corregido.
- Build posterior en C:/CETPRO/CETPRO_MODERNIZACION_V2: exit0.
- Servidor existente localhost:5173: ambas páginas responden HTTP200 con los títulos nuevos.
- Copia previa: C:/CETPRO/CETPRO_MODERNIZACION_V2/.agents/local-backups/transfer-ux-20261113-184135.
