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
- API/UI: `src/App.tsx`, `src/api/client.ts`, `src/api/types.ts`, `src/pages/`, React.
- Instalador y Tooling: `installer-institutional.iss`, `package.json`, `scripts/package-institutional.cjs`, `scripts/build-installer-institutional.cjs`, `scripts/sign-executables.cjs`, artefactos en `release/`.
- QA, Verificación Forense y Homologación: `scripts/run-qa-tests.cjs`, `tests/verify-installer-full-lifecycle.cjs`, `tests/crit-41-01-security-interceptor.test.cjs`, `tests/institutional-bundle-clean.test.cjs`, `tests/verify-homologacion-windows.cjs`, `scripts/verify_expediente_tables.cjs`.
- Informes Oficiales y Expediente Institucional: `docs/INFORME_TAREA43_HOMOLOGACION_WINDOWS.md`, `docs/expediente-configuracion/` (Formularios 01 al 07, Documento 08), `docs/expediente-configuracion/INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md`, `docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md`.
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

**ESTADO ACTUAL:** **TAREA 43 CERRADA (HOMOLOGACIÓN TÉCNICA WINDOWS APROBADA CON OBSERVACIONES) Y TAREA 44 CERRADA CON CONFORMIDAD TOTAL (EXPEDIENTE DE CONFIGURACIÓN INSTITUCIONAL Y REVISIÓN CORRECTIVA SUBSANADA AL 100%)**. 
- Instalador oficial institucional generado y validado en 15 puntos de homologación técnica (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB), con 21 manifiestos MINEDU empaquetados y persistencia SQLite ratificada tras desinstalación.
- Revisión Correctiva de TAREA 44 completada con dictamen de **CONFORMIDAD TOTAL** ([REGISTRO_CORRECCIONES_EXPEDIENTE.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md)): subsanación integral de las 8 observaciones del supervisor. Preservación irrenunciable del plan de estudios oficial con las 7 UDs de Peluquería y Barbería M2 (soportadas mediante `TMPL-17` y plantilla extendida `TMPL-05_EXT`) sin reducciones por límites de software. Higiene absoluta en Formularios 01 al 07 (libres de tecnicismos y código) listos para firma y sello del Director Lic. Eloy Valerio Paredes Feliciano y Secretaría. Evidencia técnica y arquitectural concentrada en Documento 08 (`ConfiguracionDocumental.tsx`, `academic-config.cjs` con `cloneYear`, `document-contracts.cjs`, `offline-core.cjs`, SQLite WAL y 219 tests superados al 100% en 22 suites). Tablas verificadas al 100% en 8 columnas normalizadas mediante `scripts/verify_expediente_tables.cjs` (0 errores).

**PRÓXIMO OBJETIVO RECOMENDADO:** **FASE DE FIRMA INSTITUCIONAL Y PROTOCOLO DE INTEGRACIÓN EN 4 FASES**:
1. **Fase 1 (Suscripción y Formalización):** Firma y sellado físico/digital de los formularios 01 al 07 por parte de la Dirección (Lic. Eloy Valerio Paredes Feliciano) y Secretaría del CETPRO "Micaela Bastidas Puyucawa".
2. **Fase 2 (Ingeniería de Ingesta):** Adaptación de `scripts/load-institutional-source.cjs` para ingesta automática de los valores oficiales suscritos y ampliación de campos en SQLite.
3. **Fase 3 (Migración Atómica Transaccional):** Ejecución transaccional protegida con generación previa obligatoria de respaldo cifrado `.cetpro-backup` y verificación preflight de los 21 formatos normados MINEDU sin marcas BORRADOR.
4. **Fase 4 (Homologación Presencial en Campo):** Prueba de campo sobre equipamiento físico del CETPRO con Directivos y Docentes, validando emisión PDF e impresión física de los 21 formatos normados y sincronización USB `.cetpro`.

## 9. Modo de trabajo solicitado por el usuario

- Trabajar por **objetivos completos**, no «microtareas» ni restricciones arbitrarias de tiempo.
- Antigravity autónomo con agentes especializados (coordinador, implementador, auditor adversarial independiente y documentador) delegados formalmente.
- Mantener **memoria persistente en archivos** para continuidad operativa entre sesiones sin pérdida de contexto.
- Protección estricta de datos institucionales y repositorio original: solo lectura garantizada.
- Aprobación humana explícita reservada para despliegues en producción, bases reales, firmas definitivas y eliminación de información.

## 10. Regla de continuidad

Antes de trabajar: leer este archivo, `AGENTS.md` y el informe más reciente. **Separar rigurosamente hechos probados por auditor de autodeclaraciones de desarrollo.** Antes de declarar superado un objetivo, exigir logs reproducibles, pruebas automatizadas, compilación exitosa y hashes SHA-256 de los binarios. Actualizar este documento al finalizar cada hito formal.

## 11. Mensaje listo para un nuevo ChatGPT

> Continúa como arquitecto supervisor de CEPRO_MICAELA 2.0. Usa `docs/cerebro-proyecto/CEPRO_MICAELA_CEREBRO_MAESTRO.md`, `docs/INFORME_TAREA43_HOMOLOGACION_WINDOWS.md`, `docs/expediente-configuracion/INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md` y `docs/expediente-configuracion/REGISTRO_CORRECCIONES_EXPEDIENTE.md` como contexto histórico y memoria persistente. El estado actual es: **TAREA 43 CERRADA con DICTAMEN APROBADO CON OBSERVACIONES (Homologación Técnica Windows y Staging)** con instalador oficial (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) y **TAREA 44 CERRADA CON DICTAMEN DE CONFORMIDAD TOTAL** (expediente de configuración institucional de 8 documentos subsanado al 100% en sus 8 observaciones, preservación irrenunciable de las 7 UDs de Peluquería y Barbería M2 vía TMPL-17 y TMPL-05_EXT, higiene absoluta en Formularios 01 a 07 para firma del Director Lic. Eloy Valerio Paredes Feliciano, tablas de 8 columnas verificadas con 0 errores y 219 tests en 22 suites aprobados). El repositorio original `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2` es estrictamente de solo lectura. El siguiente paso es la suscripción de los formularios por la Dirección institucional y la ejecución del protocolo de integración en 4 fases. Sigue el protocolo multiagente y no apliques cambios destructivos sin autorización humana expresa.


