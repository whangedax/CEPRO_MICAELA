# Checkpoint previo — DEMO-NOMINA-HOTFIX-10

Fecha: 2026-09-16

## Alcance y barreras

- Hotfix limitado a la experiencia DEMO y al código compartido imprescindible.
- Prohibido abrir, migrar o escribir `CETPRO_DB`.
- Prohibido migrar o escribir `CETPRO_V2_CANDIDATE`; solo se permiten snapshots de lectura antes/después.
- `CONFIG.DB.VERSION` debe permanecer en `1` para producción.
- No se ejecutará migración real.

## Estado conocido antes del cambio

- Candidata real esperada: 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos, 0 unidades, 0 asistencias.
- Grupo DEMO A: 40 matrículas; TMPL-01 debe bloquear por `CAPACITY_EXCEEDED`; reporte administrativo completo disponible.
- Grupo DEMO B: 25 matrículas; debe generar TMPL-01 en una página con marca `DEMOSTRACIÓN — NO OFICIAL`.
- Última regresión segura documentada: 489/489; suite DEMO-OPERATIONAL-MODE-09: 49/49.
- El directorio no es un repositorio Git; este archivo sustituye el checkpoint de commit.

## Huellas SHA-256 previas

- `app/js/router.js`: `729C1E69ED74B6A907B903391F55EBDD85239E01FFCF42CA41408308832B22C3`
- `app/js/ui/nominas-view.js`: `2F69222999053B699B5252EE4EFEB3F86C5D8C5023B29A79FE14706686EA6141`
- `app/js/ui/group-assignment-view.js`: `B29C6BC617EA092DEF66E328B191CD30C0FF3CA8B227CBC0470DFD32CED7416E`
- `app/js/services/pdf-template-engine.js`: `7D19A82E9CE239867C341A6AB0D7C9280180B9AD3CB988D67C5562669C8A9604`

## Criterio de reversión

Si el preflight, la reproducción aislada o el snapshot de candidata falla, detener el gate y no aplicar cambios adicionales.
