---
name: cepro-arquitectura
description: Define contratos e invariantes ante cambios de Electron, SQLite, API, autenticación o seguridad CEPRO.
---
# Arquitectura condicional
Aplica `token-saver`. Lee contrato afectado y sus consumidores antes de proponer cambios.
Carga `electron/SKILL.md` para IPC/procesos o `sql-database-assistant/SKILL.md` para datos.
No activar por cambios cosméticos. No reestructurar el repositorio por preferencia.
Respeta renderer → API tipada → backend → persistencia; renderer sin Node/SQLite.
Entrega máximo una página: archivos, contrato, invariantes, riesgos y aceptación.
Solo lectura. No autorizar migraciones destructivas ni cambios institucionales por inferencia.
