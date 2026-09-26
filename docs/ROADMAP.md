# Roadmap M00–M15 para la aplicación local

## M00 — Contratos y arquitectura
Define esquema lógico, contratos de repositorio/servicios, reglas de IDs, estados, errores, versionado, auditoría, inventario documental y bloqueos.

## M01 — Núcleo local
Estructura de aplicación, router, shell UI, IndexedDB versionada, repositorios base, auditoría y exportación/restauración inicial.

## M02 — Catálogos y configuración
Institución, periodos, programas, módulos, unidades, indicadores, docentes, secciones, turnos, modalidades y reglas versionadas.

## M03 — Estudiantes
Alta, búsqueda, detalle, edición, validación de documento e historial básico.

## M04 — Importación
Staging de los 12 Excel, reconciliación, incidencias, confirmación por lotes e idempotencia.

## M05 — Matrículas
Matrículas, grupos y unidades asociadas. No deducir módulo I/II.

## M06 — Asistencia
Sesiones, estados, horas/porcentajes conforme a reglas institucionales confirmadas.

## M07 — Evaluación
Actividades, indicadores, notas, recuperación, redondeo y pendientes.

## M08 — EFSRT
Empresa, fechas, horas, criterios y resultado según definición oficial.

## M09 — Cierre académico
Consolidación y habilitación documental sin ocultar requisitos faltantes.

## M10 — Motor documental
Contrato común, selección, preparación de datos, paginación, validación preimpresión y registro de emisión.

## M11 — Plantillas 01–04
Nómina, ficha, registro modular y portada.

## M12 — Plantillas 05–17
Asistencias y evaluaciones por unidad.

## M13 — Plantillas 18–21
EFSRT, acta, certificado y título.

## M14 — Salidas
Vista previa, impresión, PDF cuando sea viable sin servicio externo, reemisión y trazabilidad.

## M15 — Aceptación
Pruebas integrales, restauración, regresión, responsive, manual de secretaria y versión candidata a producción.

Estado 2026-09-17: `MVP-NOMINA-CONTINUATION-PHYSICAL-12` cierra técnicamente la continuidad global de la nómina administrativa: conserva ordinales físicos 01–30, añade rangos globales y conteos fuera de la plantilla, y deja vacíos los totales oficiales en multipágina. Edge headless validó Nómina B=25/A=40 y Registro PDF/CSV A/B; suite 31/31 y regresión segura 576/576. La capacidad canónica, TMPL-03 REVIEW_REQUIRED y la emisión oficial no cambian; candidata y 21 hashes permanecen intactos. Siguiente gate: demostración y aceptación física humana en Edge por Jefatura, seguida de confirmación de fuentes oficiales. Solo después corresponde autorizar, en tarea separada y ventana exclusiva, `PRODUCTION_MIGRATION_V1_TO_V2`; este gate no migró `CETPRO_DB` ni habilitó emisión oficial.
