# Reglas principales — CEPRO_MICAELA 2.0

**Leer siempre** `docs/cerebro-proyecto/CEPRO_MICAELA_CEREBRO_MAESTRO.md` antes de planear cambios de arquitectura, base de datos, instalador o seguridad. El cerebro contiene contexto histórico, no sustituye verificar los archivos del repo actual.

## Límites obligatorios
- Modificar **solo** `C:\CETPRO\CETPRO_MODERNIZACION_V2`; el original `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2` es estrictamente **solo lectura**, incluido SQLite/WAL/SHM/private-data.
- No usar datos reales en pruebas destructivas. Crear datos sintéticos y sandbox QA independientes. No copiar bases, tokens, claves o backups dentro de instaladores.
- No modificar reglas académicas ni roles DIRECTOR/SECRETARIA/DOCENTE sin trazabilidad y autorización. Preservar 21 formatos documentales y protocolos `.cetpro`, `.cetpro-backup`.
- Seguridad obligatoria Electron: `contextIsolation` activo, `nodeIntegration` desactivado, sandbox/CSP efectivos, IPC validado, backend local autenticado, secretos no expuestos ni en argv, logs o renderer.
- No declararse «listo para institución» únicamente por pasar pruebas unitarias. Auditar binario empaquetado, instalador real, SHA-256, persistencia y escenarios negativos.
- No aplicar migraciones destructivas, restauraciones en fuentes de datos reales, eliminación de datos, publicación, firma digital ni despliegue sin aprobación humana expresa.

## Orquestación
- Ejecutar **objetivos completos**, con implementación, regresión, validación adversarial independiente, evidencias y memoria. Evitar instrucciones fragmentadas o llamadas «microtareas».
- El coordinador puede delegar investigación, cambios limitados y QA aislado a subagentes. Separar escritura de producción y auditoría; no permitir ediciones concurrentes del mismo archivo.
- Parar ante riesgo de pérdida/corrupción de datos, fuga de secretos, cambios en repositorio original, pruebas sin sandbox, límites de privilegios o decisiones irreversibles.
- En cada entrega: reportar hechos verificados vs hipótesis; comandos reales, resultados, archivos, SHA-256, hallazgos y bloqueos. Actualizar cerebro del proyecto solo con evidencia.

## Estado más reciente
- TAREA 43 CERRADA — Dictamen: **APROBADO CON OBSERVACIONES (Apto para Homologación Técnica Windows y Entrega de Piloto Staging)**. Matriz de homologación técnica de 15 puntos superada (14 aprobados, 1 con observaciones por firma Authenticode NotSigned lista para PFX institucional). Instalador oficial institucional: `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe` (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB), con 21 manifiestos MINEDU y persistencia SQLite ratificada.
- TAREA 44 CERRADA — Dictamen: **CONFORMIDAD TOTAL**. Revisión correctiva completada (8 observaciones subsanadas al 100% en `docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md`), preservación irrenunciable de las 7 UDs de Peluquería y Barbería M2 (soportadas mediante TMPL-17 y TMPL-05_EXT), higiene total en Formularios 01 al 07 para firma del Director Lic. Eloy Valerio Paredes Feliciano, evidencia técnica en Documento 08, 219 pruebas automatizadas aprobadas en 22 suites y tablas verificadas con 0 errores en `scripts/verify_expediente_tables.cjs`.
- INTEGRACIÓN UX MODO OSCURO (rama `integ/ux-darkmode-tarea43`) — Dictamen: **CONFORMIDAD TOTAL**. Resolución de 6 conflictos de integración, cumplimiento estricto de CSP de Electron (`script-src 'self' blob:` sin `'unsafe-inline'`) vía `public/theme-init.js` con 0 ms FOUC, lienzo Canvas en documentos oficiales inviolable (#FFFFFF sobre mesa de luz institucional #0B1210), regla `@media print` forzando papel blanco, 219/219 pruebas automatizadas aprobadas en 22 suites (`npm run test:sandbox`), 9/9 controles E2E aprobados en `npm run test:ux-darkmode` (WCAG 2.2 AA 13.5:1), 17 capturas visuales en `capturas_ux_modo_oscuro/`, instalador oficial institucional de TAREA 43 intacto (SHA-256 `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) y repositorio histórico original inalterado (0 modificaciones). Rama preparada para fusión formal en `main` bajo autorización directiva.
