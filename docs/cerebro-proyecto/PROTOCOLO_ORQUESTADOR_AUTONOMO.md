# CEPRO_MICAELA 2.0 — PROTOCOLO DE ORQUESTACIÓN AUTÓNOMA

**Objetivo:** reducir a una única instrucción inicial la coordinación diaria entre arquitectura, implementación, auditoría y documentación sin ampliar privilegios ni trabajar con datos reales.

## Opciones verificadas de Antigravity

- **`/goal`**: ejecutar un objetivo largo con comprobación de criterios de salida; **no** elude permisos ni aprobaciones.
- **Subagentes**: delegar mediante agente principal a contextos independientes; usar worktrees o propiedad exclusiva de archivos cuando haya escrituras concurrentes.
- **`/teamwork-preview`**: equipos coordinados con auditorías independientes; **depende de plan/acceso** y puede solicitar una aprobación inicial del alcance.
- **Reglas persistentes**: `AGENTS.md` en raíz y archivos en `.agents/rules/`.
- **No basar flujos nuevos en workflows IDE tradicionales**: la documentación advierte de su discontinuación el 19/10/2026; preferir skills/reglas y comandos actuales.

**Documentación oficial de referencia:**
- https://antigravity.google/docs/commands/goal
- https://antigravity.google/docs/subagents
- https://antigravity.google/docs/teamwork
- https://antigravity.google/docs/rules-workflows

## Roles y separación de responsabilidades

**Coordinador**: lee el cerebro, establece una meta con aceptación verificable, evita conflictos de archivos, decide qué tareas pueden ser paralelas y comunica bloqueos. No aprueba él solo sus propios cambios.

**Implementador**: trabaja en modernización/worktree autorizado, realiza cambios mínimos en el código, añade tests, construye binario QA e identifica hashes.

**Auditor adversarial**: revisa código y ejecutable **independientemente**, sin editar código de producción ni invalidar evidencias; usa pruebas negativas y documenta hallazgos por severidad, reproducibilidad y impacto.

**Documentador**: actualiza cerebro, decisiones e índices según evidencia, sin «promover» una afirmación de desarrollador a un hecho auditado.

## Ciclo autónomo de trabajo

1. Leer `AGENTS.md`, `CEPRO_MICAELA_CEREBRO_MAESTRO.md` e informe actual. Verificar estado real del repo; no confiar en narrativas.
2. Definir meta y criterios de aceptación. En este momento: cierre independiente CRIT-41-01 sobre instalador **v2.0.2**.
3. Delegar **auditoría inicial** a contexto independiente, leyendo SHA-256 del artefacto e instalador realmente ejecutado.
4. Si aparecen defectos: registrar reproducción sintética, asignar corrección al implementador, reconstruir y reejecutar auditoría independiente **sobre el binario reconstruido**. No reutilizar evidencias antiguas.
5. Si todo pasa: ejecutar regresión `npm run test:sandbox`, `npm run build`, instalación/E2E/SQLite/backup dentro de sandbox; verificar que Git y original están intactos.
6. Documentar resultados, contradicciones y limitaciones, actualizar cerebro, presentar un único informe final y solicitar autorización de siguiente objetivo cuando proceda.
7. Si una prueba bloquea por riesgos de datos/seguridad, **detener ejecución peligrosa** e informar. No repetir fallos indefinidamente.

## Límites humanos que no se automatizan

Se requiere autorización humana para **datos institucionales reales, restauración destructiva fuera de QA, cambios al repositorio original, publicación/producción, firma con clave real, eliminación definitiva, decisiones de contratación/certificados y permisos elevables del sistema**.

## Meta inicial lista para pegar en Antigravity

```text
/goal Actúa como coordinador autónomo de ingeniería de CEPRO_MICAELA 2.0. Antes de actuar lee AGENTS.md, docs/cerebro-proyecto/CEPRO_MICAELA_CEREBRO_MAESTRO.md, docs/cerebro-proyecto/PROTOCOLO_ORQUESTADOR_AUTONOMO.md e INFORME_TAREA41A_CORRECCION_SEGURIDAD.md (busca su ubicación real). OBJETIVO ACTUAL: ejecutar la auditoría independiente de cierre 41B del hallazgo CRIT-41-01 contra el instalador QA v2.0.2 y el binario exactos: confirma SHA-256, repite el listener loopback 9988, valida el interceptor por separado de CSP, redirecciones, host/puerto, secreto no expuesto, /api/setup y RBAC; resuelve discrepancia sobre screenshot con 0 estudiantes vs reporte de persistencia. Comprueba npm run test:sandbox, npm run build, E2E de ejecutable empaquetado, instalación/reinstalación y riesgos de actualizaciones; usa exclusivamente datos sintéticos aislados. Delega a un auditor independiente con código productivo solo lectura. Si encuentra errores, asigna correcciones completas a un implementador separado en rama/worktree autorizada y reaudita binario nuevo hasta superar todos los criterios o identificar bloqueo real; no alteres el repositorio original. Al finalizar actualiza el cerebro con hallazgos, evidencias, comandos, hashes y dictamen (APROBADO / CON OBSERVACIONES / RECHAZADO). No declares producción aprobada ni instales sobre datos reales. No pidas confirmaciones intermedias para tareas reversibles y autorizadas, pero respeta aprobaciones de seguridad del producto y detente ante riesgo de daño.
```

## Si existe `/teamwork-preview` en el plan

Puede utilizarse en lugar de `/goal` cuando el alcance amerita varios agentes especializados y controles independientes. Leer primero las instrucciones del comando, aprobar su brief inicial y fijar **directorio de trabajo seguro**: nunca usar repositorio institucional original como directorio editable. La disponibilidad no se presupone.

## Transferencia entre chats y saturación de contexto

Al concluir cada ciclo: actualizar **estado**, **decisiones**, **hallazgos**, **hashes**, **pendientes** del cerebro. Para ChatGPT nuevo, adjuntar `CEPRO_MICAELA_CEREBRO_MAESTRO.md` y el último informe; en Antigravity, abrir nueva conversación en mismo workspace: el agente debe leer `AGENTS.md` y cerebro. Un agente nuevo no hereda automáticamente memoria implícita completa de uno antiguo.

## Lo que este paquete NO hace por sí mismo

No instala subagentes, no edita tu Windows ni ejecuta Antigravity de manera remota. Es un conjunto de reglas/instrucciones que debes incorporar al repositorio y activar desde tu interfaz Antigravity. La autonomía real dependerá del plan, la versión, los permisos de ejecución y los bloqueos que aparezcan.
