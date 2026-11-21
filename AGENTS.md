# Reglas principales — CEPRO_MICAELA 2.0

Consultar primero `docs/cerebro-proyecto/INDICE_ACTIVO.md` (lectura corta). Consultar `CEPRO_MICAELA_CEREBRO_MAESTRO.md` o `HISTORIAL_TAREAS.md` **solo mediante búsqueda puntual (`rg -n`)**, nunca leyendo el archivo completo salvo pedido expreso.

## Límites obligatorios
- Modificar **solo** `C:\CETPRO\CETPRO_MODERNIZACION_V2`; `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2` es estrictamente **solo lectura** (incluido SQLite/WAL/SHM/private-data).
- No usar datos reales en pruebas destructivas. Usar datos sintéticos y sandbox QA (`dev-sandbox/data`). No copiar bases, tokens, claves o backups dentro de instaladores.
- No modificar reglas académicas ni roles `DIRECTOR`/`SECRETARIA`/`DOCENTE` sin trazabilidad y autorización. Preservar 21 formatos MINEDU y protocolos `.cetpro`, `.cetpro-backup`.
- Seguridad obligatoria Electron: `contextIsolation` activo, `nodeIntegration` desactivado, sandbox/CSP efectivos, IPC validado, backend local autenticado, secretos nunca en `argv`, logs o renderer.
- No declararse «listo para institución» solo por pruebas unitarias: auditar binario, instalador, SHA-256, persistencia y escenarios negativos.
- No aplicar migraciones destructivas, restauraciones reales, eliminación de datos, publicación, firma digital ni despliegue sin aprobación humana expresa.

## Eficiencia de Tokens y Orquestación
- Seguir `.agents/skills/token-saver/SKILL.md`: localizar con `rg -n` antes de leer, leer solo rangos necesarios (<= 120 líneas), filtrar salidas largas de consola y evitar narración redundante entre agentes.
- Delegar por especialidad según `.agents/skills/cepro-orquestacion/SKILL.md`: separar escritura (`cepro-implementador`) de auditoría (`cepro-auditor`), evitando lecturas duplicadas y ediciones concurrentes del mismo archivo.
- Parar ante riesgo de pérdida/corrupción de datos, fuga de secretos, cambios en original, pruebas sin sandbox o decisiones irreversibles.
- En cada entrega: reportar hechos verificados vs hipótesis, comandos reales, resultados, archivos, SHA-256 y bloqueos.

## Configuración local instalada

- Flujo y perfiles: `.agents/skills/cepro-orquestacion/SKILL.md` y `.agents/agents/`.
- Cada perfil declara skills, entradas, salidas, archivos y criterio de cierre.
- Máximo dos especialistas activos por defecto, sin subdelegación y un escritor por archivo.
- Guía: `docs/ORQUESTACION_LOCAL.md`; UI: `docs/UI_ARCHITECTURE.md`.
- Comprobar instalación: `node scripts/verify-agent-config.cjs`.
