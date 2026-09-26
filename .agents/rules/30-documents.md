# Regla CETPRO — documentos institucionales

- Las 21 plantillas recibidas en `sources/templates/originals/xlsx/` son las fuentes visuales autoritativas del proyecto mientras la institución no entregue una revisión posterior.
- No modificar los XLSX originales ni las vistas previas de referencia.
- No reconstruir de memoria ni inventar logos, firmas, sellos, textos legales, filas, columnas, dimensiones o una plantilla faltante.
- El conjunto recibido contiene asistencia UD1–UD6 y evaluación IL/UD1–UD7; no existe As-7 / asistencia UD7.
- Mantener hash SHA-256 de cada original y verificarlo antes de integrar un documento.
- Cada plantilla requiere mapa: campo de origen → transformación autorizada → destino visual.
- La plantilla nunca escribe en la base de datos.
- Generar vista previa antes de impresión.
- Bloquear emisión cuando falte un requisito obligatorio confirmado por regla institucional.
- Registrar en auditoría: tipo, estudiante/grupo, fecha, versión de plantilla, resultado y operador cuando exista identificación local.
- No asumir que la fidelidad visual equivale a vigencia normativa. Antes de producción, registrar confirmación institucional/UGEL de la versión aplicable.
