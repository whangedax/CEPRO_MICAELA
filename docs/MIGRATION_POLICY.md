# Política de migración futura IndexedDB

Estado 2026-09-15: `CETPRO_DB` **v1**, 17 stores. Este documento no ejecuta v2 ni cambia datos. El marker de datos actual no se presume equivalente a `db.version`; se definirá explícitamente antes del primer upgrade. La entidad `GRUPO_ACADEMICO` es recomendación de arquitectura, no store actual.

## Secuencia forward-only de v1 → eventual v2

1. Congelar contrato `GRUPO_ACADEMICO` y clave `matricula.grupoId`, índices y reglas de unicidad contextual. Definir asignación supervisada de los 295 `grupoCode` históricos a cohortes; no adivinar periodos/módulos/turnos. Conservar `sourceGroupCode` y las 295 matrículas originales.
2. Crear **export backup completo** antes del upgrade, con `schemaVersion`, versión de datos, origen/timestamp, storeNames/counts y checksum de payload; guardar copia verificable fuera de la DB y ensayar `Restore Backup` en una DB de prueba. Un fallo de export o readback detiene el upgrade.
3. Preparar migración forward-only en `onupgradeneeded` de una sola transacción IDB; crear store/índices sin borrar stores antiguos, copiar/vincular de forma determinista solo registros cuya pertenencia sea demostrable. Incertidumbres van a reporte, no a un grupo inventado. Un error aborta upgrade; IndexedDB conserva v1 si la transacción no confirma.
4. Tras commit, cerrar/reabrir y hacer readback: `db.version`, `dataSchemaVersion` en `configuracion`, índices/stores, counts, hash/procedencia, auditor referencial y coherencia `grupoId`↔grupo↔programa/modulo/periodo. Comparar backup y 295 IDs; ningún faltante ni colisión. Validar Edge productivo con Secretaría. No declarar productiva la entidad hasta export/restore/schemaVersion/integrityCheck probados.
5. Ante error post-commit, **no downgrade in-place**. Mantener backup y store viejo; bloquear escrituras v2, diagnosticar, restaurar el backup a una DB aislada o realizar nueva migración correctiva forward-only bajo autorización administrativa. No eliminar store/campos legacy hasta ciclos de verificación y respaldo aprobados.

Un upgrade físico y la migración de datos pueden requerir fases separadas: schema v2 sin asignaciones reales y vinculación posterior supervisada. `grupoId` no se deduce solo de `grupoCode` cuando existen periodos/turnos/secciones distintos; el mapeo debe tener evidencia de fuente y operador. Cada cambio de módulo/periodo de un grupo produce auditoría antes/después; historial no se reescribe silenciosamente.

## Contrato de respaldo e integridad

Toda entidad futura (grupo, periodo, currículo y sus hijos) deberá figurar en `Export Backup`, `Restore Backup`, `schemaVersion` y `integrityCheck`, con test de round trip y readback. BACKUP-HARDENING-01 implementó para schema v1 envelope versionado, manifiesto nominal, SHA-256, preflight referencial, `PRE_RESTORE_BACKUP`, transacción multi-store única y readback posterior. El Gate H queda técnicamente preparado para proteger el estado v1; cualquier schema v2 debe ampliar explícitamente manifiesto/reglas/tests y repetir aceptación antes de migrar. No usar restore directo sobre CETPRO_DB productiva sin respaldo, preflight, confirmación del operador y validación física Edge.

BACKUP_RESTORE v1 cubre checksum alterado, backup incompatible, store faltante/extra, huérfanos, rollback en distintos puntos, round-trip y dataset multi-año. Pruebas MIGRATION aún pendientes: upgrade interrumpido, rollback de `onupgradeneeded`, transformación real v1→v2 y recuperación de una v2 fallida. El gate actual **no es ni ejecuta una migración v2**. También quedan los ensayos operativos I-062/I-063.

## Estado tras SCHEMA-V2-GROUP-01A

Ya existe un migrador aislado que ejecuta transformación v1→v2 dentro de `onupgradeneeded`, con rollback probado ante siete fallos y backup/restore schema 2 en laboratorio. Sigue pendiente la **activación productiva**: USER_EXPORT + PRE_MIGRATION_BACKUP físicos, versión candidata, conexión consciente del handler, Edge exclusivo, readback y plan de recuperación operativo. El guard de nombre prohíbe al migrador de ensayo abrir `CETPRO_DB`; el restaurador v2 tampoco está expuesto en la UI v1.

## Estado tras SCHEMA-V2-GROUP-01B

Una copia del backup físico real de Edge pasó preflight, restore v1, export equivalente, migración con el mismo handler 01A, comparación semántica, INV-G01–G18, auditoría, backup/restore v2 y runtime candidato. El plan B/C usa restauración desde PRE_MIGRATION_BACKUP en una DB limpia o migración correctiva forward-only; nunca downgrade in-place. `READY_FOR_V2_ACTIVATION=YES` expresa preparación técnica del candidato, no cambia CONFIG.DB.VERSION ni autoriza abrir/migrar CETPRO_DB.
