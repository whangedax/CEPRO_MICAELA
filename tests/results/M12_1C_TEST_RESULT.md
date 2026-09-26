# Resultado técnico M12.1C

Fecha: 2026-09-14  
Alcance: migración institucional de una sola ejecución y fuente operacional única.

## Evidencia

- Marcador: `FUENTE_FISICA_INSTITUCIONAL_2026_V1`.
- Primera inicialización: crea e importa `INST-001`.
- Registro legado sin marcador: migra una sola vez y preserva propiedades ajenas a la fuente.
- Registro marcado: una nueva llamada a `CatalogService.initializeCatalogs()` no ejecuta `update`.
- `telefono = "NUEVO-TELEFONO"`: permanece sin restaurar `051-602378`.
- `dre = "DRE-OFICIAL-FUTURA"`: permanece sin volver a vacío.
- `codigoModular = "CODIGO-MODULAR-FUTURO"`: permanece sin volver a vacío.
- `getInstitutionProfile()`: lee `INST-001` y normaliza `null`/`undefined` a texto vacío.
- TMPL-01 y TMPL-02 generan PDF de una página con el perfil institucional común.
- Hashes de los PDF canónicos y manifiestos geométricos: intactos.
- Store `documentos`: sin escrituras desde la vista previa.
- `periodos = 0`; B-002, B-004 y B-007 permanecen abiertas.

## Resultado

Suite focalizada M12.1C: `20/20`, `FAILED = 0`.

Verificación integral `node scripts/verify_project.js`: `664/664` en 27 suites, `FAILED = 0`.

Validación técnica de `#/documentos` en navegador local:

- TMPL-01 creó Blob PDF y mostró visor/descarga.
- TMPL-02 creó Blob PDF y mostró visor/descarga.
- Consola: 0 errores.
- La pantalla de Configuración confirmó `periodos = 0`, `unidades = 0` y los bloqueos B-002/B-004/B-007.

Validación física en Microsoft Edge: pendiente del usuario.
