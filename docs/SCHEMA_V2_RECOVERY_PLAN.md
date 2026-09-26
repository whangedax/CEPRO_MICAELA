# Recuperación de una futura migración Edge v1→v2

Precondición obligatoria: `PRE_MIGRATION_BACKUP` v1 validado y guardado fuera de IndexedDB. IndexedDB no admite downgrade in-place.

## A. Aborto antes del commit

Cerrar la aplicación, reabrir en build v1 de diagnóstico y confirmar `db.version=1`, 17 stores, ausencia de `grupos_academicos` y snapshot equivalente al backup. No restaurar si la transacción abortada dejó v1 íntegra. Conservar logs técnicos sin PII y corregir el candidato antes de otro intento autorizado.

## B. Commit v2 completo, aplicación v2 falla después

Bloquear escrituras y no intentar abrir la DB v2 con versión 1. Exportar, si es legible, un backup forense v2. Crear una DB nueva/vacía v1 aislada, restaurar allí `PRE_MIGRATION_BACKUP`, ejecutar preflight/readback y recién bajo autorización reemplazar el entorno operativo mediante un flujo de recuperación documentado. Nunca reducir `db.version` ni borrar la v2 como primer paso.

## C. Post-readback detecta problema

Mantener la v2 cerrada y en cuarentena, conservar reporte de diferencias/invariantes, y proceder igual que B. Si el problema es corregible sin pérdida, preferir una migración forward-only v2→v3 ensayada en copias; si se decide volver al estado previo, restaurar `PRE_MIGRATION_BACKUP` en una DB limpia compatible y validar completamente antes de ponerla en servicio.

En B/C la selección entre nueva DB operativa y migración correctiva requiere aprobación administrativa, ventana exclusiva y aceptación Edge. Este procedimiento no fue ejecutado en 01B.
