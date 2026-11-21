# Registro de Lotes — Rediseño Visual Integral (3 Roles)

**Rama:** `feat/multianio-sync-modular` | **Sistema rector:** `docs/design/SYSTEM.md` | **Piloto ref.:** `C:\Users\whangedax\.codex\worktrees\d14c\CETPRO_MODERNIZACION_V2`

| Lote | Pantallas / Alcance | Roles | Responsable | Estado | Pruebas / Verificación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **1. Inventario y diagnóstico** | 16 rutas DIRECTOR, 15 SECRETARIA, 12 DOCENTE, 2 públicas, shell y contextos | Todos | `cepro-explorador` + `cepro-disenador-ui` | **Cerrado** | `git status --short`, lectura `App.tsx`, `SYSTEM.md` |
| **2. Sistema visual y compartidos** | `public/fonts/` (Plus Jakarta Sans offline), tokens `--ui-*` en `src/index.css`, `AppShell`, `Sidebar`, `Topbar`, `NoticeModal`, `StatusBadge` | Todos | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, `build:institutional`, `test:bundle:clean`, `test:ux-darkmode` |
| **3. Panel Dirección** | `DashboardDireccion.tsx` (KPIs, accesos directos, alertas institucionales) | `DIRECTOR` | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, auditoría visual, contraste y responsivo (1024/1366) |
| **4. Panel Secretaría** | `DashboardSecretaria.tsx` (trámites, matrículas, filtros y tablas) | `SECRETARIA` | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, validación de acciones rápidas y vista adaptativa |
| **5. Panel Docente** | `DashboardDocente.tsx`, `ClassroomCard.tsx`, `ActivityCard.tsx` | `DOCENTE` | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, verificación de tarjetas de aula y flujo pedagógico |
| **6A. Acceso y Contexto** | `LoginPage.tsx`, `MiCuentaPerfil.tsx`, `ActiveUnitContextBanner.tsx`, `SelectUnitModal.tsx` | Todos | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, cambio de contexto de unidad y formulario de sesión |
| **6B. Operación Académica** | `GestionEstudiantes.tsx`, `GestionMatriculas.tsx`, `GestionGrupos.tsx`, `ModuloFichaRegistro2026.tsx`, `ConfiguracionAcademica.tsx`, `DocumentaryCatalogManager.tsx` | `DIRECTOR`, `SECRETARIA` | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, carga de catálogos, tablas y fichas normativas 2026 |
| **6C. Seguimiento Pedagógico** | `RegistroAsistencia.tsx`, `RegistroEvaluaciones.tsx` | `DOCENTE`, `DIRECTOR` | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, planillas de notas/asistencia y contraste de estados |
| **6D. Gestión Documental** | `CentroDocumental.tsx`, `ConfiguracionDocumental.tsx`, `EntregasRevision.tsx`, `AcademicWorkflowModal.tsx` | Todos | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, preflight MINEDU y modales de flujo documental |
| **6E. Sistema y Red** | `GestionCuentas.tsx`, `ActualizarExportarDatos.tsx`, `RespaldoRestauracion.tsx`, `FormularioAdmisionPublico.tsx`, `Sincronizacion.tsx`, `DirectorNetworkPanel.tsx`, `SecretariaSyncPanel.tsx`, `DocenteSyncPanel.tsx` | Según rol | `cepro-implementador` → `cepro-auditor` | **Cerrado** | `build`, RBAC paneles sincronización y formularios públicos |
| **7. Comprobación integral** | Validación cruzada 3 roles, 1024/1366 claro/oscuro, fuente local, cero CDN, 21 MINEDU | Todos | `cepro-auditor` + `browser` | **Cerrado** | Sandbox completo, tipografía, UX darkmode, preflights y E2E |

## Resultados de Pruebas Ejecutadas (Lote 7)

- `npm run build` -> `exit=0` (compilación estándar Vite/React sin errores).
- `npm run build:institutional` -> `exit=0` (compilación modo institucional correcta).
- `npm run test:bundle:clean` -> `5/5` pass (sin rastros ni dependencias espurias en bundle).
- `node scripts/verify_all_21_preflights.cjs` -> `21/21` formatos MINEDU aprobados.
- `npm run test:sandbox` -> `219/219` pruebas en 22 suites aprobadas.
- `npm run test:typography` -> `6/6` aprobadas (cumplimiento tipográfico offline `Plus Jakarta Sans`).
- `npm run test:ux-darkmode` -> 100% controles aprobados (WCAG `17.43:1`, lienzo PDF `rgb(255,255,255)` intacto, `@media print` `rgb(255,255,255)`).
- **Verificación E2E en Navegador (3 roles, 1024px y 1366px, claro/oscuro):**
  - Tipografía `Plus Jakarta Sans` cargada localmente sin peticiones externas (`0` requests a CDN/Google Fonts).
  - `0` errores de consola/página.
  - `0` desbordamientos horizontales (`overflow-x`).
  - Bloqueo estricto de rutas restringidas por RBAC verificado:
    - `SECRETARIA`: ruta `respaldo` bloqueada.
    - `DOCENTE`: rutas `matriculas`, `ficha-registro-2026`, `respaldo` y `configuracion-academica` bloqueadas.

## Pendiente Explícito

- Prueba en Electron real empaquetado y validación de escalado nativo en entorno Windows (fuera del alcance del navegador headless, y sin generación de instaladores `.exe` en este encargo, reservado para cuando se autorice salir de modo dev).
