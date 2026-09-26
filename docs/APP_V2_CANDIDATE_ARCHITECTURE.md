# APP-V2-CANDIDATE-01 — arquitectura

Build explícito y aislado: `http://127.0.0.1:8081/`, entrypoint `app-v2/index.html`, DB `CETPRO_V2_CANDIDATE`, schema 2/18 stores. El launcher solo escucha loopback. El endpoint `/_candidate/real-backup` lee el backup real en memoria con `no-store`; no crea copias ni imprime registros.

En primer arranque, la candidata valida el backup v1, restaura una DB v1 con el nombre candidato y ejecuta exactamente el migrador 01A/01B. Arranques posteriores abren explícitamente versión 2. Nunca detecta ni selecciona silenciosamente `CETPRO_DB`.

Capas:

- `candidate-db.js`: configuración/build y bootstrap v1→v2.
- `candidate-repositories.js`: repositorio genérico, `AcademicGroupRepository` y matrículas por índice `grupoId`.
- `candidate-services.js`: GROUP, documentos, identidad académica, readiness/cierre, auditoría y backup/restore v2.
- `candidate-app.js`: 12 vistas, dashboard real, configuración institucional y UX de bloqueos.

`GRUPO_ACADEMICO` es autoridad GROUP. `assignModule({groupId,...})` modifica solo `grupos_academicos.moduloId` y auditoría en una transacción. No reescribe matrículas como autoridad. El guard de doble fuente reporta divergencia módulo/periodo y nunca elige silenciosamente.

El build productivo permanece separado en `app/index.html`, puerto 8080, `CONFIG.DB.VERSION=1` y `CETPRO_DB`. No importa módulos candidatos.

## Cobertura funcional

Inicio muestra 269 estudiantes, 295 matrículas, 12 grupos, 7 programas, 14 módulos, 0 periodos y 0 unidades desde IndexedDB v2. Estudiantes, matrículas, programas y configuración conservan datos reales. Grupos muestran 8 `REVIEW_REQUIRED` y 4 `ACTIVO`. Registro/EFSRT/cierre permanecen bloqueados por fuentes institucionales; Documentos conserva ENROLLMENT y mantiene TMPL-01 bloqueada. Backup candidato exige schema 2/18 stores, checksum, prebackup, confirmación, restore atómico, readback y auditoría.
