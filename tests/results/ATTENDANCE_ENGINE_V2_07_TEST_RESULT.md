# Resultado ATTENDANCE-ENGINE-V2-07

Fecha: 2026-09-16. Suite: `tests/attendance_engine_v2_07.regression.js`.

- Suite dedicada: 50/50, failed=0.
- Persistencia: únicamente `CETPRO_V2_ATTENDANCE_LAB_*`, schema 2.
- Candidata/producto: no creadas, abiertas ni escritas por la suite dedicada.
- Atomicidad: rollback íntegro antes, antes de la primera marca, primera, mitad, última, auditoría y antes de commit.
- Datos: sesiones/marcas tipadas, update sin duplicado, concurrencia obsoleta, dos matrículas de una persona aisladas, contexto cruzado rechazado.
- Documentos: TMPL-05 generado desde contexto sintético; 40 filas y capacidades 44/35/38/44/44/40 fail-closed.
- Seguridad: observaciones como texto, offline, sin red externa.
- Backup: export/restore/readback v2 equivalente.
- Performance orientativa de la ejecución dedicada: el detalle exacto se imprime en el runner; escalas puras 40×30, 100×50 y 300×50 permanecieron ampliamente bajo 1 s en este equipo. No es un SLA.
- Regresión global: 1287/1287 en 53 suites, failed=0.
- Candidata runtime antes/después: schema 2/18, 269 estudiantes, 295 matrículas, 295 staging, 12 grupos, 7 programas, 14 módulos, 0 periodos, 0 unidades y 0 asistencia; snapshot idéntico. La suite ATT07 no abrió ni escribió candidata/producto.
- PDF canónicos: 21/21 SHA-256 coincidentes.

`PRODUCTIVE_ATTENDANCE_ENABLED=NO`. `OFFICIAL_ATTENDANCE_POLICY=BLOCKED_B003`.
