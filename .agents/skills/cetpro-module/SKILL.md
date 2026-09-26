---
name: cetpro-module
description: Ejecuta un módulo M00-M15 del Sistema Académico CETPRO respetando contratos, límites y pruebas.
---
# CETPRO Module

## Antes de cambiar código
1. Leer `docs/PROJECT_STATE.md` y `docs/ROADMAP.md`.
2. Identificar módulo solicitado, dependencias y componentes propietarios.
3. Revisar decisiones y bloqueos existentes.
4. Confirmar que las fuentes necesarias existen; si faltan, separar trabajo independiente de trabajo bloqueado.
5. Crear o confirmar punto de control Git.

## Durante
- Implementar solo el alcance del módulo.
- Registrar decisiones técnicas no obvias.
- No convertir faltantes institucionales en supuestos.
- Añadir pruebas simultáneamente con el código.

## Cierre
1. Ejecutar pruebas aplicables.
2. Actualizar `docs/PROJECT_STATE.md`.
3. Actualizar `docs/DECISIONS.md` e `docs/ISSUES.md` cuando corresponda.
4. Resumir archivos modificados, pruebas, bloqueos y siguiente puerta.
5. No marcar APROBADO si queda una prueba obligatoria pendiente.
