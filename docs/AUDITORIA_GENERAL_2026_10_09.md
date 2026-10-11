# Auditoría general del sistema

Fecha: 9 de octubre de 2026.

## Alcance

Acceso y roles; contextos por año/carrera/módulo/grupo/unidad; cuentas y asignaciones; matrícula y secciones; notas y asistencia; 21 formatos; importación y exportación JSON, CSV, XLSX y tablas; intercambio entre equipos sin internet; conflictos, respaldos, integridad y pantallas de los tres roles.

Las pruebas usan bases temporales. Los dos tests que utilizaban la base institucional se aislaron. Los reportes y registros detallados están en `tests/offline-artifacts/system-audit`, carpeta ignorada por Git.

## Correcciones

- La simulación persistente y la limpieza masiva de asistencia quedan restringidas a bases expresamente de demostración. En la base real se rechazan en el servidor y se retiran sus botones de las pantallas de asistencia y PDF.
- La vista ficticia sigue disponible para comprobar formatos sin escribir registros académicos. Un documento con datos de demostración no se puede entregar; el botón se deshabilita y el servidor lo rechaza.
- Se corrigió la carga de la interfaz y se adaptaron las pruebas antiguas a los menús actuales, la selección de carrera de Secretaría, el modal de asistencia y los documentos separados por unidad y módulo.
- Exportar docentes desde un contexto respeta el grupo y la unidad seleccionados. Importar conserva las demás asignaciones y no modifica una cuenta administrativa como si fuera un docente.
- Una revisión de importación queda asociada a su contexto: si cambia la unidad o carrera debe revisarse de nuevo antes de aplicar.
- Importar varias filas de un mismo docente conserva las modificaciones de cada aula. Las transacciones comparten el mismo control de anidamiento para aplicar o revertir el lote completo.

## Datos que requieren revisión institucional

La base real tiene integridad estructural correcta. Su historial registra 22 simulaciones de asistencia y 4 limpiezas masivas anteriores, que afectan a 8 combinaciones de grupo y unidad. Estos eventos ocurrieron antes de las nuevas restricciones.

No se borraron ni reconstruyeron esas asistencias: el historial de una simulación no permite afirmar qué marcas posteriores son reales o qué faltas deben restaurarse. Dirección debe contrastar las unidades señaladas con sus listas de clase y respaldos. El detalle local está en `tests/offline-artifacts/system-audit/HISTORIAL_SIMULACIONES.json`.

Una base estructuralmente sana no garantiza la veracidad de datos ingresados en demostraciones anteriores. Las pruebas técnicas y la revisión institucional de esas asistencias son controles distintos.

## Repetir las pruebas

- `npm run test:system-core`: pruebas internas con informe.
- `npm run test:system-ui`: las 12 pruebas de interfaz con Edge oculto y bases temporales.
- `npm run test:demo-safety`: rechazo de simulaciones/borrado masivo en base real y entrega de documentos ficticios.

No se promete ausencia absoluta de errores para cualquier dato futuro: se documentan los flujos y extremos probados, los rechazos seguros y la revisión pendiente de datos históricos.

## Resultado final

- 111 pruebas internas aprobadas; cero fallos.
- 12 pruebas de interfaz aprobadas para Dirección, Secretaría y Docente; cero fallos.
- Pruebas adicionales de sincronización y cuentas repetidas tras las correcciones de importación.
- Integridad estructural de la base real correcta y servidor local activo.
- No se modificaron las asistencias históricas señaladas: requieren contraste institucional.
