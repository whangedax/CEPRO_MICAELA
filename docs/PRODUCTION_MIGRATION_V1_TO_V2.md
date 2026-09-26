# PRODUCTION_MIGRATION_V1_TO_V2 — procedimiento preparado, no ejecutado

Este procedimiento es la única ruta admitida para una futura migración productiva. No autoriza ejecutarla.

## Precondiciones obligatorias

1. Ventana exclusiva: cerrar todas las pestañas que usen el sistema.
2. Exportar manualmente el respaldo v1 y comprobar que el archivo existe fuera del navegador.
3. Validar formato, schema 1, manifiesto de 17 stores, checksum y auditoría referencial sin incidencias.
4. Registrar aprobación explícita de la persona responsable.

## Ejecución futura supervisada

1. Abrir `CETPRO_DB` exclusivamente mediante el migrador aprobado.
2. Crear y descargar `PRE_MIGRATION_BACKUP` antes de cualquier upgrade.
3. Ejecutar la migración transaccional schema 1 → schema 2.
4. Crear `grupos_academicos` y el índice `matriculas.grupoId`; conservar `grupoCode` solo como trazabilidad.
5. Verificar por readback: 269 estudiantes, 295 matrículas, 12 grupos, 7 programas y 14 módulos.
6. Verificar cero matrículas sin `grupoId`, cero huérfanos y cero diferencias inesperadas en datos v1.
7. Exportar y verificar un respaldo schema 2.
8. Activar el build v2 únicamente si todas las comprobaciones pasan y existe aceptación física firmada.

## Aborto y recuperación

- Cualquier fallo antes del commit aborta la transacción completa.
- Si el readback no coincide, no se activa v2 y se restaura únicamente mediante el procedimiento seguro, usando el backup manual o `PRE_MIGRATION_BACKUP` verificado.
- Nunca se reconstruyen datos faltantes por inferencia.

Estado: `PREPARED_ONLY`. En `PRIORITY-PRODUCTION-MVP-08` no se abrió, migró, restauró ni escribió `CETPRO_DB`.
