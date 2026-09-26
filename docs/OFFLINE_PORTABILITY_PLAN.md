# Plan de portabilidad offline

Objetivo futuro: Windows 10/11 x64, sin Internet, Node, Python, npm, Codex, Antigravity ni Office. El usuario final hará doble clic y abrirá un contenedor autocontenido con servidor loopback, runtime web y assets locales.

No se construye instalador en este gate. Antes se exige: aceptación física en Edge, firma/versión del paquete, directorio de datos separado, exportación explícita y restore con preflight.

Transferencia PC A → PC B: exportar backup; verificar checksum; copiar aplicación y backup; abrir la aplicación en PC B; ejecutar preflight; confirmar restore; reabrir; hacer readback e integridad. Copiar una carpeta de la aplicación no transfiere IndexedDB de forma fiable.
