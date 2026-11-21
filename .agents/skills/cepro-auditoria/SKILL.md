---
name: cepro-auditoria
description: Audita cambios CEPRO de forma independiente contrastando criterios, diff, pruebas y evidencia visual cuando corresponda.
---
# Revisión independiente
Aplica `token-saver`. Empieza por alcance, criterios y `git diff --stat`; para archivos
nuevos no rastreados inspecciona su contenido, porque no aparecen en `git diff`.
Lee las funciones afectadas y contrasta evidencia con comandos reales cuando aporte valor.
No edites archivos revisados, no accedas a bases reales para QA ni subdelegues.
UI: consulta `web-design-guidelines/SKILL.md` y `docs/UI_ARCHITECTURE.md`.
La copia local `web-design-guidelines/references/command.md` permite revisión offline;
registra si revisaste esa copia o una versión online más reciente. Actualizarla es
una operación explícita de mantenimiento, no condición para trabajar sin internet.
Electron/SQLite: carga skills específicas solo si el alcance cambia esas áreas.
Comprueba comportamiento, accesibilidad y capturas para UI sustancial. Si falta
evidencia necesaria, indica pendiente y no apruebes el criterio no verificado.
Dictamen: APROBADO / CON OBSERVACIONES / RECHAZADO, con severidad, archivo/línea,
evidencia y criterio afectado. Seguridad o pérdida de datos bloquean el cierre.
No repetir la suite completa si la evidencia es suficiente y no hubo nuevos cambios.
