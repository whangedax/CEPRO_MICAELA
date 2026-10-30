# CEPRO_MICAELA 2.0 — CEREBRO MAESTRO Y TRANSFERENCIA DE CONTEXTO

**Corte documental:** 29 de octubre de 2026. **Naturaleza:** memoria persistente del proyecto integrando arquitectura, evidencias de implementación, resolución de observaciones, peritajes forenses y dictámenes de auditoría adversarial independiente; **no sustituye la verificación de los archivos del repositorio actual**. 

## 1. Misión y alcance

Modernizar un sistema de gestión académica de CETPRO a una aplicación Windows **offline-first**, manteniendo reglas institucionales canónicas y sin pérdida de información. Arquitectura actual reportada: **React 19, TypeScript, Tailwind CSS, Vite, Electron, Node.js 24, `node:sqlite`/`DatabaseSync`, backend HTTP local y SQLite WAL**. Roles: **DIRECTOR, SECRETARIA, DOCENTE**. Incluye sincronización USB `.cetpro`, emisión de documentos institucionales y respaldo/restauración cifrada `.cetpro-backup`.

## 2. Repositorios y límites irreversibles

- **Original protegido:** `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2`. Es de **solo lectura**; incluye SQLite original y WAL/SHM. No modificar código, base, plantillas ni `private-data`. Nunca ejecutar el backend original de modo que escriba allí (verificado: 0 modificaciones, Count: 0).
- **Modernización autorizada:** `C:\CETPRO\CETPRO_MODERNIZACION_V2`.
- **Sandbox normal de desarrollo:** `C:\CETPRO\CETPRO_MODERNIZACION_V2\dev-sandbox\data`, backend de referencia `127.0.0.1:8085`.
- **QA aislada:** `C:\CETPRO\CETPRO_MODERNIZACION_V2\dev-sandbox\data\qa-isolated`, referencia `127.0.0.1:8089`; pruebas destructivas solo con copias sintéticas descartables.
- No distribuir ni poblar el instalador con SQLite, WAL/SHM, backups, credenciales, certificados o claves de pruebas. Prohibido simular resultados QA.

## 3. Arquitectura y entradas de código conocidas

- Electron: `electron/main.cjs`, `electron/preload.cjs`, `electron/backend-runner.cjs`.
- Backend: `scripts/offline-core.cjs`, `scripts/offline-http.cjs`, `scripts/server-offline.cjs`.
- API/UI, Modo Oscuro y Filtrado Contextual: `src/App.tsx`, `src/api/client.ts`, `src/api/types.ts`, `src/pages/`, `src/context/ThemeContext.tsx`, `src/components/ui/Topbar/ThemeSwitcher.tsx`, `src/components/ui/PdfViewer.tsx`, `src/utils/documentTemplates.ts` (`getVisibleTemplates` y `getAvailableCategories`), `public/theme-init.js` (anti-FOUC conforme a CSP sin `'unsafe-inline'`), `src/index.css` (Tailwind v4, red de seguridad anti-cajas blancas y `@media print`), React.
- Instalador y Tooling: `installer-institutional.iss`, `package.json`, `scripts/package-institutional.cjs`, `scripts/build-installer-institutional.cjs`, `scripts/sign-executables.cjs`, artefactos en `release/`.
- QA, Verificación Forense, Homologación y UX E2E: `scripts/run-qa-tests.cjs`, `tests/verify-installer-full-lifecycle.cjs`, `tests/crit-41-01-security-interceptor.test.cjs`, `tests/institutional-bundle-clean.test.cjs`, `tests/verify-homologacion-windows.cjs`, `scripts/verify_expediente_tables.cjs`, `scripts/audit_bg_white.cjs`, `scripts/seed-complete-simulation.cjs`, `scripts/verify_all_21_preflights.cjs`, `tests/document-template-filter.test.mjs` (`npm run test:document-filter`), `tests/verify-ux-darkmode.cjs` (`npm run test:ux-darkmode`), capturas en `capturas_ux_modo_oscuro/` y `capturas_ux_modo_oscuro/v2/` (17 archivos v2) y `evidencia-auditoria-ux.json`.
- Informes Oficiales, Expediente Institucional y Auditoría de Plantillas: `docs/INFORME_TAREA43_HOMOLOGACION_WINDOWS.md`, `docs/expediente-configuracion/` (Formularios 01 al 07, Documento 08), `docs/expediente-configuracion/INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md`, `docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md`, `docs/INFORME_INTEGRACION_UX_DARKMODE.md`, `docs/auditoria-plantillas/AUDITORIA_INTEGRAL_21_PLANTILLAS_MINEDU.md`, `docs/auditoria-plantillas/INFORME_FINAL_SIMULACION_21_PLANTILLAS_MINEDU.md`.
- Reconfirmar rutas, scripts y contratos **leyendo el repositorio actual** antes de editar.

## 4. Funcionalidad reportada

Autenticación y roles; dashboards de Dirección, Secretaría y Docente; estudiantes; matrículas; grupos/aulas; asistencia; evaluación; documentos y configuración documental; entregas; cuentas y asignaciones; configuración por año lectivo (institución, periodos, planes, unidades UD1–UD7 + EFSRT, parámetros de referencia, personal, clonación de año); sincronización USB; respaldos/restauración; diagnósticos SQLite; asistente de primer arranque; Electron e instalador Inno Setup con perfil QA e institucional limpio.

**Condición importante:** «implementado» y «auditado» se refieren a **resultados reportados y verificados**; no equivalen a certificación general de producción institucional sin homologación presencial en hardware físico.

## 5. Trayectoria de auditoría y decisiones

- **TAREA 37:** respaldos auditados con observaciones; riesgo de backups JSON sensibles sin cifrar.
- **TAREA 38:** integración Electron e introducción de `.cetpro-backup` con AES-256-GCM, derivación scrypt.
- **TAREA 39:** auditoría rechazó Electron: arranque roto (`/api/status`) y supuestos E2E en navegador web, CSP insuficiente.
- **TAREA 39A:** corrección del arranque, asistente inicial, endurecimiento CSP, E2E del ejecutable, secreto de instancia.
- **TAREA 39B:** aprobó con observaciones integración Electron; secreto visible previamente en argumentos de proceso y ausencia de firma.
- **TAREA 40:** instalador Inno Setup; cambio a interceptor de cabecera en Electron Main; nueva exposición hacia puertos loopback ajenos.
- **TAREA 41:** auditor independiente reprodujo **CRIT-41-01**: `X-CETPRO-Instance-Secret` se filtró a un listener en `127.0.0.1:9988`. Prohibida distribución institucional. Instalación/actualización/desinstalación y restauración reportadas favorables en QA.
- **TAREA 41A (informe desarrollador 27-10-2026):** desarrollador reportó corrección de CRIT-41-01 mediante interceptor restringido a `127.0.0.1:${activePort}`, comprobación de URL, purga de cabeceras y CSP dinámica. 211/211 pruebas, instalador v2.0.2. Se identificaron dudas sobre captura UX de 0 estudiantes y alcance de pruebas.
- **TAREA 41B (auditoría adversarial independiente 28-10-2026):** dictamen formal **APROBADO CON OBSERVACIONES (Apto para QA y Homologación Técnica)**. Mitigación de CRIT-41-01 comprobada adversarialmente con y sin CSP (0 fugas). Discrepancia UX resuelta (causa raíz: payload incompleto en test E2E corregido a contrato canónico y verificado en SQLite). 214 pruebas en 22 suites, 100% aprobadas. Preservación estricta de base SQLite tras desinstalación verificada con `DatabaseSync`.
- **TAREA 42 (auditoría de perfil limpio 28-10-2026):** dictamen formal **APROBADO (Apto para Entrega y Homologación Institucional)**. Resolución de OBS-41B-02 (bundle institucional limpio sin leyendas dev/sandbox) y OBS-41B-01 (tooling Authenticode con RFC 3161 y reporte veraz NotSigned).
- **TAREA 43 (homologación técnica Windows 29-10-2026):** dictamen formal **APROBADO CON OBSERVACIONES (Apto para Homologación Técnica Windows y Entrega de Piloto Staging)**. Matriz de 15 puntos (HOM-01 a HOM-15): 14 aprobados al 100%, 1 aprobado con observaciones (HOM-15 por estado NotSigned). Subsanación crítica de empaquetado (inclusión de carpeta `app/` con los 21 manifiestos MINEDU en `package-institutional.cjs`). Generación e inspección del instalador oficial institucional `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe` (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB).
- **TAREA 44 (expediente de configuración institucional y revisión correctiva 29-10-2026):** dictamen formal **CONFORMIDAD TOTAL**. Subsanación del 100% de las 8 observaciones de la supervisión registrada en `docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md` (11,122 bytes). Preservación curricular irrenunciable garantizando soporte a las 7 UDs de Peluquería y Barbería M2 (`TMPL-17` y plantilla extendida `TMPL-05_EXT`) sin reducciones forzadas por software. Higiene total en Formularios 01 al 07 (cero tecnicismos de código o bases de datos para firma del Director Lic. Eloy Valerio Paredes Feliciano y Secretaría). Evidencia técnica y arquitectural concentrada en Documento 08 (`ConfiguracionDocumental.tsx`, `academic-config.cjs` con `cloneYear`, `document-contracts.cjs`, `offline-core.cjs`, SQLite WAL y 219 tests superados al 100% en 22 suites). Tablas verificadas al 100% en 8 columnas mediante `scripts/verify_expediente_tables.cjs` (0 errores). Informe ejecutivo corregido (`INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md`, 19,275 bytes).
- **INTEGRACIÓN UX MODO OSCURO, FILTRADO CONTEXTUAL Y SANEAMIENTO VISUAL INTEGRAL (ramas integ/ux-darkmode-tarea43 y feat/ux-contexto-documental-oscuro, commit be92a40, 29-10-2026):** dictamen formal **APROBADO — CONFORMIDAD TOTAL (100%)**. Integración y resolución definitiva de cajas blancas en `src/index.css` mediante red de seguridad CSS con cláusulas `!important` para inputs, selects, textareas y tablas institucionales. Saneamiento integral en 5 pantallas críticas: `EntregasRevision.tsx`, `Sincronizacion.tsx`, `GestionCuentas.tsx` (aulas asignadas, badges y erradicación de UUIDs crudos), `ConfiguracionDocumental.tsx` y `CentroDocumental.tsx`. Filtrado contextual documental en `src/utils/documentTemplates.ts`: DOCENTE restringido a 15 formatos base y a 4 en UD activa (TMPL-04, 05, 11, 18), con soporte irrenunciable para UD7 de Peluquería M2 (TMPL-17). Reducción de ruido cognitivo. Eliminación estricta de scripts inline vía `public/theme-init.js` para cumplimiento 100% de CSP con 0 ms FOUC. Lienzo Canvas en `PdfViewer.tsx` inviolable (#FFFFFF sobre mesa de luz #0B1210) y `@media print` forzado a papel blanco. Medición dinámica de contraste en DOM de **17.43:1** (supera WCAG 2.2 AA y AAA).
- **ESTANDARIZACIÓN EXHAUSTIVA DE MODO OSCURO EN TODOS LOS PANELES INSTITUCIONALES (commit e87acb506ea99b0d47db71d7adfd5115e2e0ea85, 30-10-2026):** dictamen formal **APROBADO — CONFORMIDAD TÉCNICA TOTAL (100%)** emitido por `cepro-auditor`. Estandarización exhaustiva en `ConfiguracionAcademica.tsx` (5 pestañas, tablas curriculares, valores y 2 modales de clonación/personal), `RespaldoRestauracion.tsx` (historial, dropzone accesible, diagnóstico SQLite PRAGMA quick_check y exportación AES-256-GCM), `RegistroEvaluaciones.tsx` (matriz completa de 26 columnas, columna sticky de estudiante `#182220`, celdas vigesimales y modal 409), `PendingChangesContext.tsx` (modal accesible `#182220`), `PanelDireccionProvisional.tsx` y `PanelSecretariaProvisional.tsx` (tarjetas y accesos), `DashboardDireccion.tsx`, `DashboardSecretaria.tsx` y `RegistroAsistencia.tsx`. Red de seguridad reforzada en `src/index.css` para tablas (`tbody` transparente, `tbody tr` `#182220`, hover `#1F2D2A`, `td` `#263834`). Cero cajas blancas residuales en paneles auditados con `scripts/audit_bg_white.cjs`. 219/219 pruebas aprobadas en `npm run test:sandbox` (22 suites), 6/6 aprobadas en `npm run test:document-filter`, 9/9 aprobadas en `npm run test:ux-darkmode`. Compilación limpia exit code 0 (`npm run build` y `npm run build:institutional`). Hash del instalador oficial institucional de Tarea 43 (`AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`) preservado intacto. Repositorio original inalterado (0 modificaciones). Documento rector: `docs/INFORME_INTEGRACION_UX_DARKMODE.md`. Rama preparada para fusión formal en `main`.
- **SIMULACIÓN CANÓNICA INTEGRAL Y VALIDACIÓN DE PREFLIGHTS DE LAS 21 PLANTILLAS OFICIALES MINEDU (30-10-2026):** dictamen formal **APROBADO — CONFORMIDAD TÉCNICA Y NORMATIVA TOTAL (100%)** emitido por `cepro-auditor`. Poblado determinista de datos canónicos del CETPRO Micaela Bastidas en `dev-sandbox/data` mediante `scripts/seed-complete-simulation.cjs` (2 aulas canónicas: Computación MOD-009 y Peluquería M2 con sus 7 UDs, 30 estudiantes con DNI regional, asistencias hábiles al 100%, matriz vigesimal y prácticas EFSRT en empresas de San Román). Ejecución del arnés de auditoría `scripts/verify_all_21_preflights.cjs`: **21/21 formatos oficiales aprobados al 100%** (TMPL-01 a TMPL-21) con `Preflight Complete: true` y **0 campos faltantes**. Emisión canónica oficial limpia sin marcas físicas de BORRADOR ni DEMOSTRACIÓN (`isDraft === false`). Preservación irrenunciable ratificada de la 7ma UD de Peluquería M2 mediante la plantilla oficial `TMPL-17`. Motor PDF de alta fidelidad con renderizado en memoria sin excepciones ni `FIELD_OVERFLOW`. Invarianza de límites irreversibles verificada: instalador oficial institucional intacto (SHA-256 `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) y repositorio histórico original inalterado (0 modificaciones). Documento rector: `docs/auditoria-plantillas/INFORME_FINAL_SIMULACION_21_PLANTILLAS_MINEDU.md`.
- **SINCRONIZACIÓN DE 21 PLANTILLAS OFICIALES MINEDU Y LIMPIEZA PROFUNDA DEL REPOSITORIO (commit 6b2357dbfb415b0e96e6ca82af88c1f7bbfd2506, 30-10-2026):** dictamen formal **CONFORMIDAD TOTAL**. Sincronización 1:1 de los 21 archivos PDF desde `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2\sources\templates\PLANTILLAS_PDF_IMPRIMIR\PDF_INDIVIDUALES` hacia `sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/` (coincidencia 100% SHA-256 en los 21 binarios). Evaluación en el arnés de preflights focalizada estricta y exclusivamente en las 21 plantillas oficiales (`TMPL-01` a `TMPL-21`), alcanzando 21/21 READY, 0 campos faltantes y 0 marcas de borrador. Limpieza profunda y saneamiento integral del proyecto: 754 archivos eliminados, 78,330 líneas legacy erradicadas y 4.36 GB (4,366.20 MB) de espacio en disco liberado (purgados staging intermedio de 3.17 GB en `release/`, artefactos de test de 634 MB en `tests/offline-artifacts/`, dumps de sandbox de 485 MB en `dev-sandbox/data/backups/`, y carpetas obsoletas `app-v2/`, `scratch/`, `modules/`, `tools/`, capturas y evidencias temporales, subcarpetas de plantillas y scripts V1). Verificación de no-regresión: 219/219 pruebas aprobadas en 22 suites (`npm run test:sandbox`), 6/6 casos de filtrado aprobados (`npm run test:document-filter`), instalador institucional intacto (SHA-256 `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) y repositorio histórico inalterado (0 modificaciones, estrictamente solo lectura).

## 6. Evidencia técnica y dictamen formal de AUDITORÍA TAREA 43 (HOMOLOGACIÓN WINDOWS)

### 6.1 Dictamen Formal
- **Calificación:** **APROBADO CON OBSERVACIONES (Apto para Homologación Técnica Windows y Entrega de Piloto Staging)**.
- **Resultado Cuantitativo:** **14 Controles APROBADOS al 100%**, **1 Control APROBADO CON OBSERVACIONES** (HOM-15: Certificado Authenticode supeditado a provisión externa de la institución).
- **Documento Rector:** [INFORME_TAREA43_HOMOLOGACION_WINDOWS.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/INFORME_TAREA43_HOMOLOGACION_WINDOWS.md).

### 6.2 Matriz Unificada de Homologación de 15 Puntos (HOM-01 a HOM-15)
1. **HOM-01 (Higiene del paquete):** APROBADO. Cero bases SQLite, cero WAL/SHM, cero claves privadas o carpetas sensibles dentro del instalador.
2. **HOM-02 (Bundle institucional limpio):** APROBADO. 5/5 pruebas aprobadas en `tests/institutional-bundle-clean.test.cjs`. Cero ocurrencias de "PROTOTIPO", "DATOS FICTICIOS", "director.dev" o "docente.dev".
3. **HOM-03 (Instalación silenciosa desatendida):** APROBADO. Inno Setup ejecuta con `/VERYSILENT /SUPPRESSMSGBOXES` sin bloqueos.
4. **HOM-04 (Primer arranque virgen y setup formal):** APROBADO. Asistente inicial sin sugerencias de sandbox; Director configurado exitosamente.
5. **HOM-05 (Segregación RBAC formal):** APROBADO. Restricciones comprobadas (Secretaria bloqueada de backups; Docente bloqueado de padrón de estudiantes).
6. **HOM-06 (Flujo académico sintético):** APROBADO. Estudiante Quispe Mamani (DNI 70891234) matriculado, asistencia registrada y notas guardadas (18).
7. **HOM-07 (Catálogo de 21 formatos MINEDU):** APROBADO. 21 plantillas normadas reconocidas y generadas con encabezado `%PDF-` válido.
8. **HOM-08 (Marcas reglamentarias físicas):** APROBADO. Marca de agua física BORRADOR confirmada en preflight incompleto.
9. **HOM-09 (Respaldo cifrado .cetpro-backup):** APROBADO. Exportación AES-256-GCM derivado con scrypt; rechazo 400 con clave errónea y validación 200 con clave correcta.
10. **HOM-10 (Sincronización USB .cetpro):** APROBADO. Paquete GROUP_EXCHANGE exportado con sobre sellado y firma Ed25519 íntegra.
11. **HOM-11 (Desinstalación limpia y preservación SQLite):** APROBADO. Binario removido; `cetpro.sqlite` preservado con 3 usuarios y el alumno intacto.
12. **HOM-12 (Actualización compatible sin pérdida):** APROBADO. Reinstalación exitosa reconociendo los datos previos de inmediato.
13. **HOM-13 (Mitigación adversarial CRIT-41-01):** APROBADO. Fetch a listener 9988 bloqueado; cero secreto transmitido; /api/status directo = HTTP 401.
14. **HOM-14 (Higiene CommandLine y Electron):** APROBADO. Sin credenciales en `Win32_Process`; contextIsolation: true, nodeIntegration: false, sandbox: true.
15. **HOM-15 (Inspección Authenticode formal):** APROBADO CON OBSERVACIONES. Tooling operativo con RFC 3161; reporte veraz `NotSigned` listo para aplicar PFX oficial.

### 6.3 Identidad Criptográfica de los Binarios Oficiales
- **Instalador Oficial Institucional (Tarea 43):** `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe`
  * SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`
  * Tamaño: 166,525,695 bytes (166.5 MB)
  * Estado de firma: `NotSigned` (RFC 3161 Ready)
- **Ejecutable PE Host Institucional:** `release/CEPRO_MICAELA_2.0_Institucional-win32-x64/CEPRO_MICAELA_2.0.exe`
  * SHA-256: `61F45E6F522C666C6156222680712870B38F3A4ACBD2E847B987F53DDB613544`
  * Tamaño: 175,703,040 bytes
  * Estado de firma: `NotSigned`
- **Bundle App Compilado en resources/app/dist:**
  * SHA-256: `41B1F3C81EBC07FDF93A93EA527C0540D031708EAF72D9ECBB4DA9FCC9B69E95`
- **Instalador de Referencia QA (Tarea 41B - Preservado):** `release/CEPRO_MICAELA_2.0_Setup_QA_x64.exe`
  * SHA-256: `FC684E858AAB8B4FEF51C97AA9AE415E1A3CA9FC4E7E7DFF970ABB8B4DE64913`
  * Tamaño: 166,488,123 bytes

### 6.4 Subsanación Crítica en Empaquetado
- **Causa Raíz:** `scripts/package-institutional.cjs` omitía copiar la carpeta `app/` en `resources/app`, impidiendo que el backend offline cargara los 21 manifiestos MINEDU y el catálogo semilla.
- **Corrección:** Inclusión de `'app'` en `foldersToCopy = ['app', 'dist', 'electron', 'scripts', 'sources']` y recompilación del instalador oficial con los 21 manifiestos íntegros.

### 6.5 Evidencias Visuales de UX en Alta Resolución (1920x1080)
- `01-homologacion-primer-arranque-limpio.png`: Asistente de configuración formal sin cuentas sandbox.
- `02-homologacion-dashboard-director.png`: Dashboard institucional limpio sin marcas de prototipo.
- `03-homologacion-gestion-academica.png`: Padrón con estudiante Carlos Quispe Mamani y contadores activos.
- `04-homologacion-documentos-oficiales.png`: Centro documental con los 21 formatos MINEDU disponibles.

## 7. Recomendaciones y Requisitos para Despliegue en Campo (Pendiente)

1. **Firma Digital con PFX Institucional (Opcional según disponibilidad):** Si el CETPRO Micaela Bastidas o la UGEL/DRE disponen de un certificado de firma de código `.pfx`, ejecutar el comando `npm run sign:release` definiendo `AUTHENTICODE_PFX_PATH` y `AUTHENTICODE_PFX_PASSWORD` antes de la distribución masiva para eludir el diálogo SmartScreen de Windows.
2. **Homologación Técnica en Hardware Físico:** Realizar la sesión de prueba de campo en los equipos de cómputo del CETPRO con asistencia del personal directivo, verificando la compatibilidad de drivers de impresión en los 21 formatos documentales y la sincronización USB `.cetpro`.
3. **Límite Irreversible Vigente:** Queda terminantemente prohibida la modificación manual del repositorio histórico `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2`. La base de datos original se mantiene exclusivamente como fuente histórica de lectura (verificado: 0 modificaciones).

## 8. Estado actual y próximo objetivo formal

**ESTADO ACTUAL:** **TAREA 43 CERRADA (HOMOLOGACIÓN TÉCNICA WINDOWS APROBADA CON OBSERVACIONES), TAREA 44 CERRADA CON CONFORMIDAD TOTAL (EXPEDIENTE DE CONFIGURACIÓN INSTITUCIONAL), ESTANDARIZACIÓN EXHAUSTIVA DE MODO OSCURO EN TODOS LOS PANELES, SIMULACIÓN CANÓNICA DE LAS 21 PLANTILLAS OFICIALES MINEDU APROBADA CON CONFORMIDAD TÉCNICA Y NORMATIVA TOTAL (100%), Y SINCRONIZACIÓN CANÓNICA CON LIMPIEZA PROFUNDA DEL REPOSITORIO CONSOLIDADA (COMMIT DEFINITIVO `6b2357dbfb415b0e96e6ca82af88c1f7bbfd2506` EN RAMA feat/ux-contexto-documental-oscuro)**. 
- Instalador oficial institucional generado y validado en 15 puntos de homologación técnica (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB), con 21 manifiestos MINEDU empaquetados y persistencia SQLite ratificada tras desinstalación.
- Revisión Correctiva de TAREA 44 completada con dictamen de **CONFORMIDAD TOTAL** ([REGISTRO_CORRECCIONES_EXPEDIENTE.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md)): subsanación integral de las 8 observaciones del supervisor. Preservación irrenunciable del plan de estudios oficial con las 7 UDs de Peluquería y Barbería M2 (soportada mediante `TMPL-17`) sin reducciones por límites de software. Higiene absoluta en Formularios 01 al 07 (libres de tecnicismos y código) listos para firma y sello del Director Lic. Eloy Valerio Paredes Feliciano y Secretaría. Evidencia técnica y arquitectural concentrada en Documento 08 (`ConfiguracionDocumental.tsx`, `academic-config.cjs` con `cloneYear`, `document-contracts.cjs`, `offline-core.cjs`, SQLite WAL y 219 tests superados al 100% en 22 suites). Tablas verificadas al 100% en 8 columnas normalizadas mediante `scripts/verify_expediente_tables.cjs` (0 errores).
- Estandarización Exhaustiva de Modo Oscuro en Todos los Paneles Institucionales y Filtrado Contextual Documental RBAC completada con dictamen de **CONFORMIDAD TÉCNICA TOTAL (100%)** (commit `e87acb506ea99b0d47db71d7adfd5115e2e0ea85`, ver [INFORME_INTEGRACION_UX_DARKMODE.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/INFORME_INTEGRACION_UX_DARKMODE.md)): saneamiento minucioso en 11 módulos clave, red CSS para tablas en `src/index.css`, 0 cajas blancas en `scripts/audit_bg_white.cjs`, filtrado documental por rol (DOCENTE: 15 base -> 4 en UD activa, preservando la 7ma UD de Peluquería M2 vía TMPL-17), reducción de ruido cognitivo, CSP estricto cumplido vía `public/theme-init.js`, contraste DOM medido en 17.43:1, lienzo Canvas inviolable (#FFFFFF sobre #0B1210), 219/219 tests en 22 suites aprobados, 6/6 tests de filtrado y 9/9 controles E2E aprobados en `test:ux-darkmode`.
- Simulación Canónica Integral y Validación de Preflights de las 21 Plantillas Oficiales MINEDU completada con dictamen de **CONFORMIDAD TÉCNICA Y NORMATIVA TOTAL (100%)** ([INFORME_FINAL_SIMULACION_21_PLANTILLAS_MINEDU.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/auditoria-plantillas/INFORME_FINAL_SIMULACION_21_PLANTILLAS_MINEDU.md)):
  * **21/21 formatos oficiales homologados al 100%** (`TMPL-01` a `TMPL-21`) con `Preflight Complete = true` y **0 campos faltantes** mediante `scripts/verify_all_21_preflights.cjs`.
  * Emisión física oficial limpia sin marcas de BORRADOR ni DEMOSTRACIÓN (`isDraft === false`).
  * Sembrado canónico determinista en `dev-sandbox/data` mediante `scripts/seed-complete-simulation.cjs` (datos del CETPRO Micaela Bastidas en San Román, 2 aulas canónicas: Computación MOD-009 y Peluquería M2 con 7 UDs, 30 estudiantes con DNI regional, asistencias y notas vigesimales).
  * Preservación irrenunciable ratificada de la 7ma UD de Peluquería M2 mediante `TMPL-17`.
  * Motor PDF de alta fidelidad: renderizado en memoria sin excepciones ni `FIELD_OVERFLOW` (~12s totales para las 21 plantillas).
- Sincronización Canónica y Limpieza Profunda del Repositorio (commit `6b2357dbfb415b0e96e6ca82af88c1f7bbfd2506`):
  * Sincronización 1:1 de los 21 archivos PDF desde `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2\sources\templates\PLANTILLAS_PDF_IMPRIMIR\PDF_INDIVIDUALES` a `sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/` con coincidencia SHA-256 idéntica al 100%.
  * **754 archivos eliminados**, **78,330 líneas legacy erradicadas** y **4.36 GB (4,366.20 MB) liberados** (staging de empaquetado 3.17 GB, artefactos offline 634 MB, copias de sandbox 485 MB, carpetas temporales/legacy y scripts deprecados V1 purgados).
  * Verificación rigurosa de invarianzas: 219/219 pruebas automatizadas aprobadas en 22 suites (`npm run test:sandbox`), 6/6 en `npm run test:document-filter`, instalador institucional oficial intacto (SHA-256 `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) y repositorio histórico original inalterado (0 modificaciones, estrictamente solo lectura).
  * Rama preparada para fusión formal en `main`.

**PRÓXIMO OBJETIVO RECOMENDADO:** **FUSIÓN AUTORIZADA EN MAIN, FASE DE FIRMA INSTITUCIONAL Y PROTOCOLO DE INTEGRACIÓN EN 4 FASES**:
1. **Fase 0 (Fusión Autorizada):** Fusión formal de la rama `feat/ux-contexto-documental-oscuro` (e `integ/ux-darkmode-tarea43`) en `main` bajo autorización de la Dirección.
2. **Fase 1 (Suscripción y Formalización):** Firma y sellado físico/digital de los formularios 01 al 07 por parte de la Dirección (Lic. Eloy Valerio Paredes Feliciano) y Secretaría del CETPRO "Micaela Bastidas Puyucawa".
3. **Fase 2 (Ingeniería de Ingesta):** Adaptación de `scripts/load-institutional-source.cjs` para ingesta automática de los valores oficiales suscritos y ampliación de campos en SQLite.
4. **Fase 3 (Migración Atómica Transaccional):** Ejecución transaccional protegida con generación previa obligatoria de respaldo cifrado `.cetpro-backup` y verificación preflight de los 21 formatos normados MINEDU sin marcas BORRADOR.
5. **Fase 4 (Homologación Presencial en Campo):** Prueba de campo sobre equipamiento físico del CETPRO con Directivos y Docentes, validando emisión PDF e impresión física de los 21 formatos normados y sincronización USB `.cetpro`.

## 9. Modo de trabajo solicitado por el usuario

- Trabajar por **objetivos completos**, no «microtareas» ni restricciones arbitrarias de tiempo.
- Antigravity autónomo con agentes especializados (coordinador, implementador, auditor adversarial independiente y documentador) delegados formalmente.
- Mantener **memoria persistente en archivos** para continuidad operativa entre sesiones sin pérdida de contexto.
- Protección estricta de datos institucionales y repositorio original: solo lectura garantizada.
- Aprobación humana explícita reservada para despliegues en producción, bases reales, firmas definitivas y eliminación de información.

## 10. Regla de continuidad

Antes de trabajar: leer este archivo, `AGENTS.md` y el informe más reciente. **Separar rigurosamente hechos probados por auditor de autodeclaraciones de desarrollo.** Antes de declarar superado un objetivo, exigir logs reproducibles, pruebas automatizadas, compilación exitosa y hashes SHA-256 de los binarios. Actualizar este documento al finalizar cada hito formal.

## 11. Mensaje listo para un nuevo ChatGPT

> Continúa como arquitecto supervisor de CEPRO_MICAELA 2.0. Usa `docs/cerebro-proyecto/CEPRO_MICAELA_CEREBRO_MAESTRO.md`, `docs/INFORME_TAREA43_HOMOLOGACION_WINDOWS.md`, `docs/expediente-configuracion/INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md`, `docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md`, `docs/INFORME_INTEGRACION_UX_DARKMODE.md`, `docs/auditoria-plantillas/AUDITORIA_INTEGRAL_21_PLANTILLAS_MINEDU.md` y `docs/auditoria-plantillas/INFORME_FINAL_SIMULACION_21_PLANTILLAS_MINEDU.md` como contexto histórico y memoria persistente. El estado actual es: **TAREA 43 CERRADA con DICTAMEN APROBADO CON OBSERVACIONES (Homologación Técnica Windows y Staging)** con instalador oficial (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB), **TAREA 44 CERRADA CON CONFORMIDAD TOTAL** (expediente institucional subsanado al 100%, preservación de 7 UDs de Peluquería M2 e higiene en formularios para firma directiva), **ESTANDARIZACIÓN EXHAUSTIVA DE MODO OSCURO EN TODOS LOS PANELES CON CONFORMIDAD TÉCNICA TOTAL (100%)**, **SIMULACIÓN CANÓNICA INTEGRAL DE LAS 21 PLANTILLAS OFICIALES MINEDU APROBADA CON CONFORMIDAD TÉCNICA Y NORMATIVA TOTAL (100%)** (21/21 formatos oficiales con Preflight Complete: true y 0 campos faltantes en `dev-sandbox/data`, 0 marcas de borrador, renderizado en memoria sin excepciones ni desbordamientos, y soporte irrenunciable para UD7 de Peluquería M2 con TMPL-17), y **SINCRONIZACIÓN CANÓNICA DE 21 PLANTILLAS MINEDU Y LIMPIEZA PROFUNDA DEL REPOSITORIO (commit 6b2357dbfb415b0e96e6ca82af88c1f7bbfd2506)** (sincronización 100% SHA-256 de las 21 plantillas oficiales de `PDF_INDIVIDUALES`, 754 archivos eliminados, 78,330 líneas legacy erradicadas, 4.36 GB liberados, 219/219 tests aprobados en 22 suites). El repositorio original `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2` es estrictamente de solo lectura. El siguiente paso es la autorización de fusión a `main`, la suscripción del expediente por la Dirección y el protocolo de integración de datos oficiales en 4 fases. Sigue el protocolo multiagente y no apliques cambios destructivos sin autorización humana expresa.


