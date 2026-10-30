# INFORME TÉCNICO DE INTEGRACIÓN UX — MODO OSCURO INSTITUCIONAL
## CEPRO_MICAELA 2.0: Sistema de Gestión Académica Windows Offline-First

- **Fecha:** 29 de octubre de 2026 (Corte 23:15 UTC-5)
- **Autoría:** Equipo de Ingeniería y Documentación CEPRO_MICAELA 2.0
- **Auditoría Adversarial Independiente:** `cepro-auditor` (Dictamen: APROBADO — CONFORMIDAD TOTAL 100%)
- **Implementación y Saneamiento Definitivo:** `cepro-implementador` (Orquestador B)
- **Rama:** `feat/ux-contexto-documental-oscuro` (sobre base `integ/ux-darkmode-tarea43`)
- **Commit Definitivo:** `be92a404b59c2a61fc4728b985274b06cb485561` (*fix(ux): correccion integral definitiva modo oscuro, filtrado documental contextual y erradicacion de ruido visual*)
- **Estado Técnico:** CONFORMIDAD TOTAL — LISTO PARA FUSIÓN EN `main` (Supeditado a autorización de la Dirección)

---

## 1. Resumen Ejecutivo

El presente informe documenta de forma exhaustiva la misión de integración técnica, saneamiento visual integral y optimización de usabilidad contextual entre la **Línea Base Homologada de TAREA 43 / TAREA 44** y las ramas de modernización de interfaz:
1. **`feat/ux-darkmode-modernizacion`** consolidada en **`integ/ux-darkmode-tarea43`** (resolución de 6 conflictos troncales y cumplimiento estricto de CSP).
2. **`feat/ux-contexto-documental-oscuro`** consolidada en el commit definitivo **`be92a404b59c2a61fc4728b985274b06cb485561`**, que resuelve la totalidad de cajas blancas residuales, introduce una red de seguridad CSS global con `!important`, implementa el filtrado documental contextual por rol (RBAC) y erradica el ruido técnico y cognitivo para docentes.

La misión consolidada garantiza los siguientes logros técnicos y funcionales:
1. **Endurecimiento de Seguridad CSP (Content Security Policy):** Eliminación total de scripts en línea (`'unsafe-inline'`) para la inicialización del tema mediante el desacople síncrono en `public/theme-init.js`, preservando el principio de FOUC cero (0 ms) bajo la directiva estricta de Electron `script-src 'self' blob:`.
2. **Erradicación Definitiva de Cajas Blancas:** Red de seguridad global en `src/index.css` con cláusulas `!important` para `input`, `select`, `textarea`, `option` y elementos de tabla (`table thead tr`, `table tbody tr`). Saneamiento manual y exhaustivo en 5 pantallas clave (`EntregasRevision.tsx`, `Sincronizacion.tsx`, `GestionCuentas.tsx`, `ConfiguracionDocumental.tsx`, `CentroDocumental.tsx`). Auditoría automatizada con `node scripts/audit_bg_white.cjs` confirmando 0 cajas blancas residuales en pantallas críticas.
3. **Filtrado Contextual y RBAC en Centro Documental:** La función `getVisibleTemplates` y `getAvailableCategories` (`src/utils/documentTemplates.ts`) restringe el catálogo según el rol del usuario:
   - **DOCENTE:** Solo visualiza sus 15 plantillas autorizadas. Al seleccionar un aula y una unidad didáctica activa (ej. UD1), el catálogo interactivo se reduce a los **4 formatos relevantes** (TMPL-04 Portada, TMPL-05 Asistencia UD1, TMPL-11 Evaluación UD1, TMPL-18 Informe EFSRT).
   - **Preservación Curricular Irrenunciable:** Soporte pleno para la 7ma Unidad Didáctica de Peluquería y Barbería M2 (TMPL-17) cuando la unidad activa es UD7.
   - **SECRETARIA (12 plantillas) y DIRECTOR (21 plantillas):** Mantienen sus ámbitos de visibilidad normados.
   - **Categorías Dinámicas:** Ocultamiento automático de categorías vacías en el contexto activo.
4. **Reducción de Ruido Cognitivo y Técnico:** La huella digital preflight (`fingerprint`), los identificadores de versión (`rev`), selectores de ámbito técnico (`currentScopeId`) y origen de datos (`f.source`) quedan ocultos para el perfil DOCENTE, mostrándose exclusivamente para el perfil DIRECTOR con propósitos de auditoría y visado. En asignación de cuentas se erradican los UUIDs crudos formateando como `grp?.name || ...`.
5. **Accesibilidad y Contraste Superiores (WCAG 2.2):** Medición dinámica en DOM mediante Puppeteer arrojando un ratio de **17.43:1** (Texto `rgb(240, 253, 248)` sobre Fondo `rgb(15, 23, 21)`), superando holgadamente los umbrales de 4.5:1 para AA y 7.0:1 para AAA.
6. **Inviolabilidad Canónica de Documentos MINEDU:** Protección absoluta del lienzo Canvas en `src/components/ui/PdfViewer.tsx` (#FFFFFF estricto sobre mesa de luz institucional #0B1210) y regla de impresión `@media print` forzando fondo blanco puro sin consumo indebido de tóner.
7. **Compilación Limpia:** `npm run build` y `npm run build:institutional` completados con éxito (exit code 0).
8. **Regresión Total Superada (100%):** Conciliación y ejecución exitosa de las 219 pruebas automatizadas en 22 suites (`npm run test:sandbox`), 6/6 casos unitarios de filtrado (`npm run test:document-filter`) y 9/9 controles E2E de modo oscuro (`npm run test:ux-darkmode`) respaldados por 17 capturas visuales v2 en `capturas_ux_modo_oscuro/v2/`.
9. **Intactitud Criptográfica de la Línea Base:** Ratificación inalterada del instalador oficial institucional `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe` (SHA-256 `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB) y aislamiento total del repositorio histórico original (0 modificaciones).

---

## 2. Identificación de Ramas, Commits e Identidades Criptográficas

La arquitectura de ramas y el historial de commits integrados se detalla a continuación:

| Entidad / Rama | Commit Hash | Rol en el Proyecto | Estado Técnico |
|---|---|---|---|
| **Línea Base Homologada** (`baseline/tarea43-homologada`) | `2b53a8b` | Base técnica cerrada en TAREA 43 y validada con Expediente de Configuración TAREA 44 | SELLADO / HOMOLOGADO |
| **Rama Feature UX** (`feat/ux-darkmode-modernizacion`) | `2b15acc61fbe66cfbde4caf75dd7a2209506f1a9` | Modernización completa de interfaz Tailwind v4, paleta esmeralda/petróleo y Modo Oscuro | FUSIONADO EN INTEG |
| **Integración Temporal** (`integ/ux-darkmode-tarea43`) | `73d6861` | Merge resolviendo los 6 conflictos con soporte CSP estricto y perfiles institucionales | SUPERADO |
| **Consolidación E2E Inicial** (`integ/ux-darkmode-tarea43`) | `ff3db09` | Capturas iniciales y reporte de verificación E2E de modo oscuro | SUPERADO |
| **Pulido Visual y Contexto** (`feat/ux-contexto-documental-oscuro`) | `259efe4` | Erradicación inicial de cajas blancas, filtrado contextual RBAC y reducción de ruido | SUPERADO |
| **Medición Dinámica y Capturas v2** (`feat/ux-contexto-documental-oscuro`) | `317aa1b` | Medición dinámica DOM WCAG (17.43:1), script `test:document-filter` y capturas v2 | SUPERADO |
| **Saneamiento Integral Definitivo** (`feat/ux-contexto-documental-oscuro`) | `be92a404b59c2a61fc4728b985274b06cb485561` | Corrección integral definitiva modo oscuro, red CSS `!important`, saneamiento de 5 pantallas y auditoría | HEAD ACTUAL / CONFORMIDAD TOTAL |

### 2.1 Identidad de Binarios Oficiales Institucionales (Tarea 43)

- **Instalador Oficial:** `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe`
  * **SHA-256:** `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`
  * **Tamaño:** 166,525,695 bytes (166.5 MB)
  * **Estado:** Totalmente inalterado y preservado.
- **Ejecutable PE Host:** `release/CEPRO_MICAELA_2.0_Institucional-win32-x64/CEPRO_MICAELA_2.0.exe`
  * **SHA-256:** `61F45E6F522C666C6156222680712870B38F3A4ACBD2E847B987F53DDB613544`
  * **Tamaño:** 175,703,040 bytes

---

## 3. Matriz de Resolución de los 6 Conflictos de Integración

Durante la fusión inicial de `feat/ux-darkmode-modernizacion` en `integ/ux-darkmode-tarea43` se identificaron y subsanaron 6 conflictos en componentes troncales. A continuación se resume la matriz de resolución aplicada en el commit `73d6861`:

| Archivo en Conflicto | Conflicto Identificado | Estrategia de Resolución Aplicada | Resultado Verificado |
|---|---|---|---|
| [`index.html`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/index.html) | Conflicto entre CSP dinámico de Electron (Línea Base A) vs script inline de inicialización de tema anti-FOUC (Rama B). | Se extrajo la lógica de inicialización a un archivo estático externo [`public/theme-init.js`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/public/theme-init.js) invocado con `<script src="./theme-init.js"></script>`. Se preservó la directiva CSP estricta administrada por `electron/main.cjs`. | CSP 100% compliant (`script-src 'self' blob:`, cero `'unsafe-inline'`), 0 ms FOUC. |
| [`src/pages/DashboardDireccion.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/DashboardDireccion.tsx) | Superposición de estilos visuales oscuros (Rama B) sobre las mejoras de perfil institucional y badges dinámicos (Línea Base A). | Se amalgamaron las clases oscuras (`dark:bg-[#0F1715]`, `dark:border-[#263834]`, etc.) manteniendo intactas las comprobaciones de perfil de `appProfile.ts` y contadores de matrícula. | Dashboard directivo con alternancia de tema fluida y datos institucionales íntegros. |
| [`src/pages/DashboardDocente.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/DashboardDocente.tsx) | Conflicto en selectores de unidad modular y estado de entregas con respecto a estilos de tarjetas y pestañas en modo oscuro. | Se aplicaron tokens de color institucional en modo oscuro sobre los selectores de unidades (UD1–UD7 + EFSRT) y tablas de entrega, preservando los contratos RBAC de docente. | Interfaz docente adaptable con navegación ágil y semáforo visual legible. |
| [`src/pages/DashboardSecretaria.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/DashboardSecretaria.tsx) | Discrepancia en métricas de matrículas y estilos de la lista de acciones rápidas de Secretaría. | Se combinaron las clases oscuras y bordes de alta accesibilidad con los indicadores institucionales y restricciones RBAC de Secretaría. | Padrón y gestión de matrícula con contraste verificado WCAG 2.2 AA. |
| [`src/pages/LoginPage.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/LoginPage.tsx) | Conflicto entre el selector de cuentas de sandbox (Rama B) vs el flujo institucional higienizado de la TAREA 42/43 (Línea Base A). | Se condicionó la visualización de selectores de prueba a perfiles no institucionales mediante `isInstitutional()`, garantizando que en el perfil oficial la pantalla de login permanezca limpia y profesional, soportando tema claro y oscuro. | Pantalla de inicio de sesión institucional profesional, con soporte total de modo oscuro. |
| [`src/pages/PlaceholderPage.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/PlaceholderPage.tsx) | Diferencias en estructura de contenedor y temas de fondo en pantallas en construcción. | Se unificaron los contenedores usando el patrón `dark:bg-[#0F1715]` y tipografía institucional. | Coherencia visual completa en rutas en desarrollo o módulos secundarios. |

---

## 4. Arquitectura de Modo Oscuro y Cumplimiento Estricto de CSP de Electron

Uno de los principales riesgos de regresión de seguridad identificados en la modernización UX era la inserción de scripts inline dentro del `<head>` de `index.html` para evitar el parpadeo de pantalla blanca al recargar la aplicación (FOUC: Flash of Unstyled Content).

### 4.1 Riesgo de Violación de CSP Mitigado

En Electron, la directiva CSP configurada dinámicamente en `electron/main.cjs` restringe la ejecución de scripts a:
```http
script-src 'self' blob:;
```
La presencia de cualquier bloque `<script> ... </script>` inline sin firma o `'unsafe-inline'` es bloqueada de inmediato por el motor Chromium de Electron, impidiendo el arranque de la aplicación o disparando errores en consola. Habilitar `'unsafe-inline'` hubiese significado una grave regresión de seguridad según los estándares fijados en la TAREA 39A y 41A.

### 4.2 Solución Arquitectural Implementada: `public/theme-init.js`

La inicialización se desacopló hacia un script servido como recurso estático propio (`'self'`):

```javascript
// public/theme-init.js
(function () {
  try {
    var pref = localStorage.getItem('cetpro_theme_preference');
    var isDark = pref === 'dark' || ((!pref || pref === 'system') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      root.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
```

En `index.html`:
```html
<script src="./theme-init.js"></script>
```

**Ventajas verificadas:**
1. **0 ms FOUC:** El script se ejecuta sincrónicamente durante el parseo inicial del DOM, aplicando `.dark` a `<html>` antes de que se pinte el elemento `<body>`.
2. **Cumplimiento 100% CSP:** Se carga bajo la regla `'self'`, sin requerir `'unsafe-inline'`, nonces dinámicos ni hashes SHA en las cabeceras HTTP.
3. **Persistencia y Reactividad:** Sincronizado bidireccionalmente con `src/context/ThemeContext.tsx` y el componente `ThemeSwitcher.tsx`.

---

## 5. Saneamiento Integral Definitivo, Filtrado Contextual RBAC y Reducción de Ruido Visual

El commit definitivo **`be92a404b59c2a61fc4728b985274b06cb485561`** (*fix(ux): correccion integral definitiva modo oscuro, filtrado documental contextual y erradicacion de ruido visual*) consolidó la experiencia de usuario y erradicó todos los defectos visuales detectados:

### 5.1 Red de Seguridad Global CSS en `src/index.css`

Para blindar la aplicación frente a cualquier elemento nativo del navegador que omitiese clases de Tailwind, se implementó una red de seguridad global con `!important`:
```css
/* Red de seguridad base para controles de formulario en Modo Oscuro */
html.dark input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="file"]):not([type="range"]),
html.dark select,
html.dark textarea {
  background-color: #0F1715 !important;
  border-color: #263834 !important;
  color: #F1F5F9 !important;
  color-scheme: dark !important;
}

html.dark input::placeholder,
html.dark textarea::placeholder {
  color: #64748B !important;
}

html.dark select option {
  background-color: #131C1A !important;
  color: #F1F5F9 !important;
}

/* Red de seguridad para tablas en Modo Oscuro */
html.dark table thead tr {
  background-color: #131C1A !important;
  color: #94A3B8 !important;
  border-color: #263834 !important;
}

html.dark table tbody tr {
  border-color: #263834 !important;
}
```

### 5.2 Saneamiento Módulo por Módulo (5 Pantallas Clave)

1. **`EntregasRevision.tsx`:**
   - **Tarjetas de KPIs:** Reemplazo de fondos blancos por `dark:bg-[#182220]` y bordes `dark:border-[#263834]`.
   - **Tabla de Entregas:** Encabezados y filas con fondos oscuros coherentes, estados visuales y badges semafóricos accesibles.
   - **Barra de Búsqueda:** Input con `dark:bg-[#0F1715]` y `dark:border-[#263834]`.
   - **Modal de Visor PDF:** Contenedor de vista previa, barra superior y pie de revisión adaptados a modo oscuro.
   - **Badges Preflight y Botones:** Botones de acción (visar, observar, recibir) con tokens institucionales oscuros.

2. **`Sincronizacion.tsx`:**
   - **Tarjetas de Pasos (1 al 3):** Fondos adaptados a `dark:bg-[#182220]`, eliminando tarjetas blancas brillantes.
   - **Tabla de Equipos Vinculados:** Encabezados `dark:bg-[#131C1A]`, bordes `dark:border-[#263834]` y texto claro.
   - **Metadatos de Impacto:** Cajas de resumen de cambios y advertencias con estilo oscuro institucional.

3. **`GestionCuentas.tsx`:**
   - **Aulas Asignadas:** Tarjetas de grupos asignados a docentes y secretaría con fondos oscuros.
   - **Badges de Unidades:** Badges de UD1–UD7 con paleta nocturna de alto contraste.
   - **Erradicación de UUIDs Crudos:** Erradicación total de identificadores crudos como `a8e74f1b-32...` en el listado de asignaciones, formateándolos de forma amigable como `grp?.name || 'Aula ' + id.slice(0, 8)`.

4. **`ConfiguracionDocumental.tsx`:**
   - **Tarjeta de Selección de Plantilla:** Estructura con `dark:bg-[#182220]` y bordes sutiles.
   - **Inputs y Textareas:** Configuración pedagógica de encabezados, directores y sellos adaptada a modo oscuro.
   - **Ocultamiento de IDs Técnicos:** Identificadores internos ocultos al docente, presentando únicamente denominaciones oficiales.

5. **`CentroDocumental.tsx`:**
   - **Sincronización Reactiva con Unidad:** Al cambiar la unidad activa en la cabecera, la lista de plantillas y la selección interactiva se sincronizan de inmediato sin desajustes.
   - **Badges de Número de Plantilla:** Badges de TMPL con estilo oscuro `dark:bg-[#132B25]` y texto verde esmeralda `dark:text-[#5EEAD4]`.
   - **Estado sin Aula:** Pantalla de bienvenida / selección con contenedor `dark:bg-[#182220]`.

### 5.3 Filtrado Contextual y RBAC en Centro Documental

En [`src/utils/documentTemplates.ts`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/utils/documentTemplates.ts) las funciones `getVisibleTemplates` y `getAvailableCategories` garantizan:
1. **Segregación por Rol (RBAC):**
   - **DOCENTE:** Restringido a 15 formatos pedagógicos (TMPL-04 al TMPL-18). Sin acceso a actas, nóminas ni certificaciones.
   - **SECRETARIA:** Restringida a 12 formatos administrativos (TMPL-01 a TMPL-03, TMPL-19, TMPL-20, etc.).
   - **DIRECTOR:** Acceso irrestricto a los 21 formatos normados.
2. **Contexto de Unidad Activa:**
   Al seleccionar un aula y una unidad didáctica (ej. UD1), la interfaz reduce la lista a los **4 formatos indispensables**:
   - `TMPL-04`: Portada de Carpeta Pedagógica.
   - `TMPL-05`: Registro de Asistencia de UD1.
   - `TMPL-11`: Registro de Evaluación de UD1.
   - `TMPL-18`: Ficha de Supervisión y Evaluación EFSRT.
3. **Preservación Curricular Irrenunciable (Peluquería y Barbería M2):**
   Cuando el aula corresponde a Peluquería M2 y la unidad activa es UD7, el sistema selecciona automáticamente `TMPL-17` (Evaluación de UD7), garantizando el cumplimiento de las 7 UDs oficiales.
4. **Filtrado de Categorías Vacías:**
   `getAvailableCategories` oculta pestañas de categorías sin plantillas en el contexto actual.

### 5.4 Reducción de Ruido Cognitivo y Técnico

En [`src/pages/CentroDocumental.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/CentroDocumental.tsx):
- La **huella digital preflight** (`fingerprint: 5dceed...`) se muestra exclusivamente para el perfil `DIRECTOR`. Para el docente se oculta, eliminando confusión técnica innecesaria.
- En la lista de parámetros preflight, la etiqueta interna `Origen: {f.source}` se oculta para el perfil `DOCENTE`, mostrando únicamente el nombre del parámetro y su estado de cumplimiento.

### 5.5 Hallazgo de Seguridad y Recomendación de Defensa en Profundidad

> **Nota de Auditoría:** El filtrado contextual documental implementado en `src/utils/documentTemplates.ts` opera en la capa de presentación (frontend). El backend (`scripts/offline-core.cjs`) ya valida las reglas RBAC principales por rol. Se documenta formalmente como **recomendación arquitectónica** extender la validación contextual por unidad directamente en los endpoints HTTP (`/api/document/pdf` y `/api/document`) en hitos subsiguientes para consolidar una defensa en profundidad robusta.

---

## 6. Conciliación y Cobertura de la Suite de Pruebas Automatizadas

Se conciliaron y ejecutaron de manera exhaustiva todas las suites de prueba:

### 6.1 Auditoría Automatizada de Cajas Blancas (`scripts/audit_bg_white.cjs`)

Script de inspección estática del árbol de componentes (`node scripts/audit_bg_white.cjs`):
- **Resultado:** **0 cajas blancas residuales** en las pantallas críticas auditadas (`EntregasRevision.tsx`, `Sincronizacion.tsx`, `GestionCuentas.tsx`, `ConfiguracionDocumental.tsx`).
- Las ocurrencias restantes corresponden a overlays semitransparentes deliberados (`bg-white/10`, `bg-white/20`) sobre fondos oscuros o el elemento inviolable `<canvas>` del PDF.

### 6.2 Regresión Completa del Sistema (`npm run test:sandbox`)

Ejecución auditada mediante `scripts/run-qa-tests.cjs`:
- **Suites:** 22 suites completas (18 archivos de test aislados).
- **Pruebas:** 219 pruebas automatizadas.
- **Resultado:** **219 pruebas aprobadas al 100% (0 fallos)**.

### 6.3 Suite Unitaria de Filtrado Documental (`npm run test:document-filter`)

Ejecución auditada de [`tests/document-template-filter.test.mjs`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/tests/document-template-filter.test.mjs):
```text
🧪 Iniciando prueba automatizada de filtrado de plantillas documentales...
  ✔ CASO 1 APROBADO: DOCENTE base solo contiene formatos de su competencia (TMPL-04..18).
  ✔ CASO 2 APROBADO: DOCENTE en UD1 ve solo los 4 formatos de su contexto pedagógico.
  ✔ CASO 3 APROBADO: Soporte irrenunciable de UD7 para Peluquería M2 (TMPL-17).
  ✔ CASO 4 APROBADO: SECRETARIA restringida a las 12 plantillas normadas.
  ✔ CASO 5 APROBADO: DIRECTOR tiene visibilidad de las 21 plantillas oficiales.
  ✔ CASO 6 APROBADO: Categorías disponibles filtran categorias vacías.
✅ TODOS LOS CASOS DE FILTRADO DOCUMENTAL PASARON CON ÉXITO (6/6).
```

### 6.4 Compilación Limpia

- **Modo Estándar:** `npm run build` (`tsc && vite build`) -> Exit code 0 en 3.33s.
- **Modo Institucional:** `npm run build:institutional` (`tsc && vite build --mode institutional`) -> Exit code 0 en 4.56s.

---

## 7. Evidencia de Verificación E2E de Modo Oscuro y Catálogo Visual de Capturas v2

La suite E2E de Puppeteer ([`tests/verify-ux-darkmode.cjs`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/tests/verify-ux-darkmode.cjs)) fue ejecutada con éxito.

### 7.1 Matriz de Resultados E2E Actualizada

| N° | Control E2E Evaluado | Condición Verificada | Veredicto |
|---|---|---|---|
| 1 | **Anti-FOUC & Persistencia de Tema** | `<html>` adquiere la clase `.dark` y `data-theme="dark"` sincrónicamente tras recarga con `localStorage = 'dark'`. | **APROBADO** |
| 2 | **Dashboard Dirección (Claro / Oscuro)** | Conmutación interactiva mediante `ThemeSwitcher`. Verificación de tokens `#0F1715` y `#182220`. | **APROBADO** |
| 3 | **Dashboard Secretaría (Claro / Oscuro)** | Renderizado en 1920x1080 y 1366x768 con tablas de estudiantes y filtros de búsqueda. | **APROBADO** |
| 4 | **Dashboard Docente (Claro / Oscuro)** | Aulas activas, unidades de aprendizaje y accesibilidad visual de estados. | **APROBADO** |
| 5 | **Centro Documental y Visor Canvas PDF** | Apertura de modal, selección de plantilla TMPL-05 (Asistencia UD1), checklist preflight y renderizado de páginas en canvas. | **APROBADO** |
| 6 | **Registro de Evaluaciones** | Matriz de notas, escala vigesimal y legibilidad de celdas en modo oscuro. | **APROBADO** |
| 7 | **Gestión y Padrón de Estudiantes** | Formularios de edición, modales de confirmación y listas tabulares adaptadas. | **APROBADO** |
| 8 | **Medición Dinámica de Contraste DOM WCAG 2.2** | Ratio medido dinámicamente en DOM: **17.43:1** (Texto `rgb(240, 253, 248)` sobre Fondo `rgb(15, 23, 21)`). Supera AA (4.5:1) y AAA (7.0:1). | **APROBADO** |
| 9 | **Regla de Impresión Oficial** | Evaluación de `@media print`: fondo forzado en `rgb(255, 255, 255)` y color de texto `rgb(0, 0, 0)`. Cero tinta oscura. | **APROBADO** |

### 7.2 Catálogo Visual v2 (`capturas_ux_modo_oscuro/v2/`)

Las 17 capturas actualizadas v2 demuestran la erradicación total de cajas blancas y el filtrado pedagógico:

1. `v2/01-login-modo-claro-1920x1080.png` (40,918 bytes)
2. `v2/01-login-modo-oscuro-1366x768.png` (36,122 bytes)
3. `v2/01-login-modo-oscuro-1920x1080.png` (40,561 bytes)
4. `v2/02-dashboard-director-claro-1920x1080.png` (179,072 bytes)
5. `v2/02-dashboard-director-oscuro-1366x768.png` (125,296 bytes)
6. `v2/02-dashboard-director-oscuro-1920x1080.png` (169,808 bytes)
7. `v2/03-dashboard-secretaria-claro-1920x1080.png` (168,292 bytes)
8. `v2/03-dashboard-secretaria-oscuro-1366x768.png` (131,899 bytes)
9. `v2/03-dashboard-secretaria-oscuro-1920x1080.png` (173,989 bytes)
10. `v2/04-dashboard-docente-claro-1920x1080.png` (279,557 bytes)
11. `v2/04-dashboard-docente-oscuro-1366x768.png` (201,488 bytes)
12. `v2/04-dashboard-docente-oscuro-1920x1080.png` (278,436 bytes)
13. `v2/05-centro-documental-oscuro-1920x1080.png` (179,682 bytes)
14. `v2/05-pdf-viewer-mesa-luz-oscura-lienzo-blanco-1920x1080.png` (211,830 bytes)
15. `v2/06-registro-evaluaciones-oscuro-1920x1080.png` (122,048 bytes)
16. `v2/07-gestion-estudiantes-oscuro-1366x768.png` (108,075 bytes)
17. `v2/07-gestion-estudiantes-oscuro-1920x1080.png` (114,788 bytes)
- `v2/evidencia-auditoria-ux.json` (1,278 bytes)

---

## 8. Inviolabilidad Documental MINEDU y Regla de Impresión Institucional

Los formatos oficiales MINEDU (actas consolidadas, fichas de matrícula y registros de asistencia) poseen valor legal estricto. La auditoría adversarial ratificó:

### 8.1 Principio de Mesa de Luz y Lienzo Intacto

En [`src/components/ui/PdfViewer.tsx`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/components/ui/PdfViewer.tsx):
- Mesa de luz de fondo: `bg-slate-200/70 dark:bg-[#0B1210]`.
- Elemento `<canvas>` inmutable:
  ```html
  <canvas
    ref={canvasRef}
    aria-label="Vista previa del documento institucional oficial"
    className="bg-white shadow-2xl rounded-sm mx-auto transition-all"
  />
  ```
- **Resultado comprobado en test E2E:** `backgroundColor = rgb(255, 255, 255)`, `filter = "none"`. Cero inversión cromática, cero distorsión de sellos o textos ministeriales.

### 8.2 Regla de Impresión `@media print`

En [`src/index.css`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/index.css):
```css
@media print {
  html, body {
    background-color: #ffffff !important;
    color: #000000 !important;
    color-scheme: light !important;
  }
  .dark {
    color-scheme: light !important;
  }
}
```
Asegura que cualquier orden de impresión física (Ctrl+P) forzará fondo blanco y tinta negra, garantizando cero consumo indebido de tóner en equipamiento institucional.

---

## 9. Preservación Criptográfica de la Línea Base y Aislamiento del Repositorio Histórico

Se ratificaron los límites irreversibles del sistema:

1. **Aislamiento del Repositorio Histórico Original:**
   - Ruta: `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2`
   - Verificación: **0 modificaciones (Count: 0)**. Modo solo lectura 100% respetado.

2. **Integridad del Binario Oficial Institucional:**
   - Archivo: `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe`
   - Tamaño: `166,525,695 bytes` (166.5 MB)
   - SHA-256 verificado: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`
   - Inalterado desde la homologación formal de la TAREA 43.

3. **Validez del Expediente Institucional de Configuración (Tarea 44):**
   - Ejecución de [`scripts/verify_expediente_tables.cjs`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/verify_expediente_tables.cjs):
   - 7/7 documentos normativos verificados con tablas exactas de 8 columnas (0 errores).

---

## 10. Dictamen Formal de Auditoría Adversarial Independiente

Tras la inspección del código fuente integrado en `integ/ux-darkmode-tarea43` y `feat/ux-contexto-documental-oscuro` (commit `be92a404b59c2a61fc4728b985274b06cb485561`), la ejecución de las 219 pruebas de sandbox, los 6 casos unitarios de filtrado, las 9 pruebas E2E visuales y la verificación estática de cajas blancas, el auditor adversarial independiente (`cepro-auditor`) emite el siguiente dictamen formal:

> ### DICTAMEN: APROBADO — CONFORMIDAD TOTAL (100%)
> 
> **Fundamentación:**
> 1. Saneamiento total y definitivo de cajas blancas residuales con red de seguridad CSS `!important` en `src/index.css` y auditoría en 0 errores (`scripts/audit_bg_white.cjs`).
> 2. Saneamiento específico completado en `EntregasRevision.tsx`, `Sincronizacion.tsx`, `GestionCuentas.tsx`, `ConfiguracionDocumental.tsx` y `CentroDocumental.tsx`.
> 3. Filtrado documental contextual y por rol implementado con precisión pedagógica (DOCENTE: 15 base -> 4 en UD activa; preservando la 7ma UD de Peluquería M2 vía TMPL-17).
> 4. Reducción efectiva de ruido cognitivo mediante el ocultamiento de huella digital preflight y parámetros técnicos a docentes, y formateo amigable de identificadores de aula.
> 5. Ratio de contraste medido dinámicamente en DOM de **17.43:1**, superando holgadamente los estándares WCAG 2.2 AA y AAA.
> 6. Regresión 100% aprobada: 219/219 tests de sandbox, 6/6 tests de filtrado documental, 9/9 controles E2E y compilación limpia (exit code 0).
> 7. Inviolabilidad documental, cumplimiento estricto de CSP (`public/theme-init.js`), instalador oficial de TAREA 43 y repositorio histórico preservados íntegramente.

---

## 11. Conclusión y Recomendación de Fusión en `main`

La rama **`feat/ux-contexto-documental-oscuro`** (commit `be92a404b59c2a61fc4728b985274b06cb485561`) se encuentra técnicamente consolidada, saneada al 100%, auditada adversarialmente y en estado óptimo.

Se recomienda a la Dirección Orquestadora y Supervisión Arquitectónica:
1. **Autorizar la fusión formal (fast-forward o merge commit limpio) hacia la rama principal `main`**.
2. **Preservar los tags y ramas de referencia** (`baseline/tarea43-homologada`, `feat/ux-darkmode-modernizacion` y `feat/ux-contexto-documental-oscuro`) para fines de trazabilidad histórica y auditoría forense.
3. **Continuar hacia el siguiente objetivo institucional:** la suscripción física de los 7 formularios del Expediente de Configuración por el Director Lic. Eloy Valerio Paredes Feliciano y la ejecución del Protocolo de Ingesta en 4 Fases.
