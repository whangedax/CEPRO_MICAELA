# Modelo de datos inicial — sujeto a contrato M00

Entidades lógicas conservadas desde la arquitectura histórica:

1. INSTITUCION
2. PERIODOS
3. PROGRAMAS
4. MODULOS
5. UNIDADES
6. INDICADORES
7. DOCENTES
8. CONFIGURACION
9. ESTUDIANTES
10. MATRICULAS
11. MATRICULA_UNIDADES
12. ASISTENCIA
13. EVALUACION
14. EFSRT
15. DOCUMENTOS
16. AUDITORIA

## Claves
Usar IDs estables, por ejemplo `EST-...`, `MAT-...`, o UUID compatibles con navegador. La decisión final se documenta en M00.

## Relaciones esenciales
- ESTUDIANTE 1:N MATRICULAS
- PERIODO 1:N MATRICULAS
- PROGRAMA 1:N MODULOS
- MODULO 1:N UNIDADES
- UNIDAD 1:N INDICADORES
- MATRICULA N:M UNIDADES mediante MATRICULA_UNIDADES
- MATRICULA/UNIDAD 1:N ASISTENCIA
- MATRICULA/UNIDAD/INDICADOR 1:N EVALUACION
- MATRICULA 1:N o 1:1 EFSRT según contrato institucional
- DOCUMENTOS referencia estudiante o grupo según tipo y debe ser trazable

## Campos sensibles a formato
Documento/DNI, códigos, teléfonos y cualquier valor con ceros iniciales se almacenan como texto.
