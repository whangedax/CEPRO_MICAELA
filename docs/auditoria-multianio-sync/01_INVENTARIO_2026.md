# Inventario y Clasificación de Ocurrencias del Literal "2026"

**Fecha:** 2026-11-12  
**Alcance:** Scripts de backend (`scripts/*.cjs`) y frontend (`src/**/*.ts`, `src/**/*.tsx`).  
**Total de coincidencias encontradas:** 802 ocurrencias en 45 archivos.

---

## 1. Topología de Archivos con Mayor Concentración

| Conteo | Archivo | Naturaleza Principal |
|---|---|---|
| **158** | `scripts/import-real-bd-2026.cjs` | Script de importación y siembra de la BD real 2026 de Puno |
| **92** | `scripts/seed-complete-simulation.cjs` | Poblado determinista de aulas, matrículas y notas para pruebas 2026 |
| **80** | `scripts/ficha-registro-2026.cjs` | Generador de Ficha de Matrícula MINEDU 2026 con QR |
| **49** | `src/pages/ModuloFichaRegistro2026.tsx` | Componente UI para ficha de registro del estudiante 2026 |
| **47** | `scripts/init-dev-sandbox.cjs` | Inicialización de base de datos de desarrollo |
| **45** | `src/components/academic/DocumentaryCatalogManager.tsx` | Selector de catálogos y plantillas con años lectivos |
| **44** | `scripts/cepro-bd-catalog.cjs` | Catálogo canónico de carreras, módulos y periodos 2026-I / 2026-II |
| **40** | `src/utils/calendar.ts` | Motor de cálculo de días útiles y feriados nacionales/regionales |
| **35** | `scripts/offline-documents.cjs` | Reglas de validación documental y persistencia de settings |
| **34** | `scripts/offline-http.cjs` | Rutas de la API HTTP local y endpoints de sincronización |
| **32** | `scripts/academic-calendar-engine.cjs` | Calendario académico y cálculo de fechas de UDs |
| **17** | `src/components/academic/AcademicWorkflowModal.tsx` | Asistente de selección modular y carreras |
| **15** | `scripts/verify_all_21_preflights.cjs` | Verificación de las 21 plantillas oficiales MINEDU |
| **13** | `scripts/package-production-2026.cjs` | Script de empaquetado y compresión de la base oficial |
| **11** | `scripts/build-installer-production-2026.cjs` | Compilación de Inno Setup para instalador |
| **11** | `scripts/configure-official-2026.cjs` | Ajustes institucionales de Puno / San Román |
| **11** | `src/pages/DashboardDireccion.tsx` | Métricas y atajos para el Director |
| **11** | `src/pages/DashboardSecretaria.tsx` | Métricas y atajos para Secretaría |
| **10** | `scripts/offline-core.cjs` | Motor criptográfico, SQLite y sincronización |

---

## 2. Clasificación Categórica de Literales

### Categoría A: Datos Legítimos de Siembra y Catálogo Actual 2026 (70% - ~560 ocurrencias)
- **Descripción:** Nombres de periodos (`2026-I`, `2026-II`), identificadores de periodo escolar actual, matrículas reales importadas del padrón MINEDU 2026 de Puno.
- **Acción requerida:** **PRESERVAR INTACTO**. Son los datos oficiales con los que la institución opera en el año académico 2026.
- **Archivos:** `import-real-bd-2026.cjs`, `seed-complete-simulation.cjs`, `cepro-bd-catalog.cjs`, `configure-official-2026.cjs`.

### Categoría B: Valores por Defecto y Fallbacks (20% - ~160 ocurrencias)
- **Descripción:** Valores por defecto cuando no se selecciona un año explícito en pantalla, por ejemplo `selectedYear || '2026'`, `academicYear:2026`.
- **Riesgo:** Si el sistema pasa al año 2027, el fallback seguiría apuntando a 2026 a menos que se resuelva dinámicamente desde el año activo de la institución.
- **Acción requerida (Fase 5):** Reemplazar fallbacks estáticos por:
  ```typescript
  const activeYear = institution?.activeYear || new Date().getFullYear().toString() || '2026';
  ```
- **Archivos:** `AcademicWorkflowModal.tsx`, `Topbar.tsx`, `DashboardDireccion.tsx`, `DashboardSecretaria.tsx`, `DocumentaryCatalogManager.tsx`.

### Categoría C: Acoplamientos Rígidos Críticos (10% - ~82 ocurrencias) — ¡P0 para Años Futuros!
- **Descripción:** Código donde la lógica asume que el año escolar SIEMPRE empieza con "2026", impidiendo la operación en 2027, 2028 o 2029:
  1. **Expresiones regulares y prefijos:**
     - En `scripts/offline-documents.cjs`: `recId === 'admissionConfig2026'`, `profile2026:`.
     - Filtros que evalúan `periodId.startsWith('2026')`.
  2. **Catálogo de feriados en `src/utils/calendar.ts`:**
     - Actualmente solo tiene el mapa de feriados para 2026. Al ingresar fechas de 2027, las funciones de días hábiles calculan sin feriados oficiales.
  3. **Identificadores en `AcademicWorkflowModal.tsx`:**
     - Botones de "Módulo I (2026-I)" y "Módulo II (2026-II)" con texto quemado en el componente.
  4. **Plantillas MINEDU (TMPL-01 a TMPL-21):**
     - Algunas plantillas tienen campos que concatenan el año a partir del periodo o asumen 2026 en textos de preflight.
- **Acción requerida:**
  - Implementar en `scripts/academic-config.cjs` y `scripts/offline-documents.cjs` la resolución dinámica de cualquier año lectivo (`academicYear:${year}`).
  - Desacoplar las etiquetas de periodos en la UI para que se deriven de la entidad `periods` (`period.code`, `period.name`).
  - Extender `src/utils/calendar.ts` para soportar cálculo algorítmico de feriados móviles (Semana Santa) y fijos para cualquier año.

---

## 3. Plan de Desacoplamiento para la Fase 5
1. Centralizar la consulta del año activo en `GET /api/academic/active-year` o en `institution.activeYear`.
2. Proteger los años históricos (`2026` cuando se esté en `2027`) como modo **solo lectura** para evitar alteraciones accidentales de actas oficiales.
3. Permitir a Dirección cambiar de año lectivo activo de trabajo con un conmutador sin perder ni pisar configuraciones.
