# Plan de integración de plantillas institucionales

## Fuente recibida

El paquete contiene 21 XLSX limpios, 21 PNG de referencia visual, `AUDITORIA_REPLICAS.csv` y `LEEME_PRIMERO.txt`. Los XLSX se mantienen inmutables en `sources/templates/originals/xlsx/`.

## Flujo de integración

Para cada plantilla:
1. verificar SHA-256;
2. identificar campos variables vacíos sin modificar estilo fijo;
3. definir mapa de datos;
4. construir representación imprimible local;
5. comparar contra la vista previa PNG;
6. probar con datos ficticios;
7. comprobar paginación e impresión;
8. registrar resultado y versión;
9. solo después habilitarla para datos reales.

## Agrupación

- M11: 01–04.
- M12: 05–17.
- M13: 18–21.
- M14: vista previa, impresión/PDF y reemisión.

## Incidencia conocida

No existe `ASISTENCIA_UD7` / As-7 en el conjunto fuente. Esto está confirmado por `LEEME_PRIMERO.txt`. No debe crearse automáticamente.

## Límite normativo

La auditoría del paquete valida fidelidad estructural respecto del libro fuente, no vigencia normativa. Antes de emitir documentos oficiales en producción, debe quedar registrada la confirmación institucional de que el formato continúa vigente.
