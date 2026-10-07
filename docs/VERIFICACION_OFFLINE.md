## Corrección de código extenso en EFSRT — 6 de octubre de 2026

La captura de secretaría correspondía a códigos ficticios MAT-PRUEBA-ALUMNO-02-001. Se permite dividir el identificador completo entre líneas dentro de la casilla, sin cambiar los datos ni reducir la letra bajo cuatro puntos. El grupo exacto de la captura genera ahora su PDF y fue inspeccionado con Poppler. Se muestran los parámetros aun si la generación falla y se deshabilita la descarga de una vista previa anterior mientras se regenera. La regresión de códigos extensos más las suites de documentos y seguridad aprobaron 21/21 escenarios.

## Auditoría final — 6 de octubre de 2026

Paquete 3.2.0: runtime incluido, 1743 archivos con hashes comprobados, generación PDF y exportación XLSX verificadas desde el paquete; excluye bases, credenciales y datos demo. Se verificó por HTTP el acceso de los tres roles en 8080 y 8082.

- 26/26 pruebas aprobadas: 15 de seguridad, 5 documentales y 6 de intercambio de tablas.
- Edge invisible: aprobado, incluye los tres roles, formulario de grupos, cuentas docentes de secretaría, aislamiento docente, PDF, tema persistente y vista móvil.
- 21 documentos / 24 páginas demo renderizados; 3766 campos ajustados caben en sus cajas. Se contrastaron tipografías con XLSX/PDF originales y se repararon cuatro recursos gráficos ausentes en las copias.
- Importaciones JSON, CSV, tablas y XLSX; ceros iniciales conservados, versiones antiguas bloqueadas y fallo intermedio revierte el lote completo.
- Copias previas al actualizar 297 códigos operativos y 12 demo; notas y asistencias iguales antes y después.

# Verificación de la entrega — 5 de octubre de 2026

## Ampliación documental — 6 de octubre de 2026

`npm run test:documents`: cinco escenarios aprobados. El primero resuelve y genera los 21 PDF con todos sus parámetros de ensayo, extrae los valores y comprueba que se imprimen créditos/unidades, datos registrales, resoluciones, EFSRT y notas decimales. Los restantes prueban permisos sobre constantes, copia inmutable de la entrega y su revisión, bloqueo de entrega incompleta y circulación cifrada de configuración/entregas entre equipos.

Se renderizaron e inspeccionaron las 24 páginas de esos 21 documentos mediante Poppler. Se corrigieron campos omitidos, posiciones de cabeceras, duplicidad de marcas inferiores y llenado del reverso del certificado. Los ensayos se guardan separados de la base operativa en `tests/offline-artifacts/dynamic/`.

La prueba de interfaz comprueba ahora la matriz de evaluación y que la vista previa renderiza el PDF original en canvas dentro del programa. Las bases existentes y los permisos por grupo/unidad siguen cubiertos por la suite del servicio.

- Servicio: **14/14 pruebas aprobadas** con `npm run test:offline`.
- Interfaz: **aprobada** con `npm run test:offline-ui`, usando Edge invisible y una base aislada.
- Distribución: prueba con el `runtime/node.exe` incluido, creación de cuenta, grupo y matrícula, generación de PDF y revisión del manifiesto sin bases privadas: **aprobada**.
- Sintaxis de los módulos nuevos y `git diff --check`: **sin errores**.

La suite del servicio cubre identidad, permisos por grupo/unidad/documento, intercambio entre tres instalaciones, matrícula nueva preservando notas/asistencia, duplicados, archivos alterados, revisiones antiguas, operaciones transaccionales, conflictos y resolución, cierre/reapertura, migración desde IndexedDB/etapa 2, recuperación con checksum, renovación de cuenta y generación de los 21 formatos PDF. Se extrajo el texto de todas las páginas para comprobar la marca de borrador.

La prueba visual incorpora los 269 estudiantes y 295 matrículas del respaldo a una copia de ensayo. Comprueba menús por rol, una sola aula/unidad asignada al docente, captura de notas y asistencia, selección de documentos solo de su unidad, la nota 16 en la columna del indicador del PDF y ausencia de desbordamiento horizontal a 390 px. Se inspeccionaron las capturas de login, notas y asistencia.

La recuperación se probó guardando una copia, introduciendo un registro posterior, restaurando y comprobando que el registro posterior desaparece mientras los datos previos siguen disponibles. Se rechazó un respaldo alterado. La persistencia se comprobó abriendo otra conexión sobre la misma base.

Las pruebas crean datos en `tests/offline-artifacts/`, separado del almacenamiento operativo. Los archivos fuente de las plantillas y las bases del navegador anterior no fueron modificados.

Esta verificación no es un piloto en las computadoras físicas de la institución ni una aprobación institucional de formatos impresos. Transporte entregado: USB cifrado. La conexión automática por LAN queda pendiente. Los documentos son borradores; no se habilita emisión oficial sin validar las condiciones académicas y de fuente.
