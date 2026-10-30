# Instalación segura del kit v2 de orquestación CEPRO_MICAELA 2.0

## Atención: no sobreescribir archivos que ya existen
Este ZIP **no se ha instalado automáticamente** en tu computadora. No contiene scripts ejecutables ni datos reales. El kit anterior tenía `.agents/agents/` vacío; esta versión añade perfiles reales de arquitecto, implementador, auditor y documentador, más la skill de coordinación.

1. Realiza una copia segura o commit de los archivos actuales del proyecto modernizado.
2. Descomprime el ZIP. **Copia el CONTENIDO INTERIOR** de `CEPRO_ORQUESTADOR_KIT_V2/` a `C:\CETPRO\CETPRO_MODERNIZACION_V2\`. No agregues un segundo nivel `CEPRO_ORQUESTADOR_KIT_V2` dentro del repositorio.
3. Si ya existe `AGENTS.md`, **no lo sobrescribas**. Abre ambas versiones y fusiona reglas; la seguridad más restrictiva prevalece. Si ya existen los mismos nombres de `.agents/agents/*` o la skill, revísalos antes de reemplazar.
4. Comprueba que las rutas queden así:
   - `C:\CETPRO\CETPRO_MODERNIZACION_V2\AGENTS.md`
   - `...\.agents\agents\cepro-arquitecto.md`
   - `...\.agents\agents\cepro-implementador.md`
   - `...\.agents\agents\cepro-auditor.md`
   - `...\.agents\agents\cepro-documentador.md`
   - `...\.agents\skills\cepro-orquestacion\SKILL.md`
   - `...\docs\cerebro-proyecto\CEPRO_MICAELA_CEREBRO_MAESTRO.md`
   - `...\docs\cerebro-proyecto\PROTOCOLO_ORQUESTADOR_AUTONOMO.md`
5. Deja disponible `INFORME_TAREA41A_CORRECCION_SEGURIDAD.md` en el workspace (si ya existe, no dupliques).
6. Abre Antigravity con carpeta de trabajo modernizada, inicia **nueva conversación** `00-ORQUESTADOR-CEPRO` y pega el texto de `INICIO_ORQUESTADOR.txt`. Preferir `/teamwork-preview` cuando esté disponible; si no, usar el objetivo alternativo `/goal` que figura allí.
7. Cuando pida una revisión del alcance inicial, valida que no utiliza el repositorio original, datos reales o entorno institucional. El orquestador debe delegar, auditar y actualizar la memoria hasta cumplir la meta o reportar un bloqueo real.

**Meta inicial:** TAREA 41B — auditoría independiente de cierre de CRIT-41-01. **No es** publicación ni autorización de uso institucional.

Documentación oficial: https://antigravity.google/docs/rules/ ; https://antigravity.google/docs/subagents ; https://antigravity.google/docs/skills ; https://antigravity.google/docs/teamwork ; https://antigravity.google/docs/commands/goal
