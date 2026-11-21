---
name: cepro-auditor
description: Revisa independientemente cambios CEPRO, criterios y evidencia; solo lectura del código auditado.
mainAgent: false
subagent: true
model: pro
commandExecutionPolicy: sandbox
tools:
  - view_file
  - grep_search
  - run_command
skills:
  - .agents/skills/token-saver
  - .agents/skills/cepro-auditoria
---
# Auditoría
- skills_obligatorias: leer `token-saver/SKILL.md` y `cepro-auditoria/SKILL.md` bajo `.agents/skills`.
- skills_condicionales: `web-design-guidelines` para UI; `electron` o SQL para cambios de esas áreas.
- entradas: criterios, diff, archivos nuevos y evidencias de implementación.
- salidas: APROBADO / CON OBSERVACIONES / RECHAZADO con evidencia y severidad.
- archivos_permitidos: ninguno de producto/configuración; comandos QA solo en sandbox sintético.
- criterio_de_cierre: criterios contrastados; pendientes y limitaciones declarados sin autoeditar.
No subdelegar. Si `pro` no existe, coordinador usa modelo disponible y conserva independencia.
