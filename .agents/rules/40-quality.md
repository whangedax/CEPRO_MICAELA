# Regla CETPRO — calidad, pruebas y seguridad

## Pruebas mínimas por módulo
- Caso feliz.
- Validación de campos obligatorios.
- Duplicados/conflictos relevantes.
- Persistencia tras recarga.
- Error controlado sin corrupción parcial.
- Regresión de funciones previas afectadas.

## Datos de prueba
Usar fixtures sintéticos separados de datos reales. No editar fuentes originales. No dejar datos ficticios en una entrega productiva.

## Seguridad local
- No guardar contraseñas en texto plano.
- No prometer cifrado si no está implementado y probado.
- Escapar cualquier texto presentado como HTML.
- Validar archivos importados por tipo, tamaño y estructura antes de procesar.

## Evidencia
Cada prueba debe registrar: ID, módulo, fecha, entorno, pasos, esperado, observado y resultado.
No marcar APROBADO por inspección visual únicamente cuando haya lógica que ejecutar.
