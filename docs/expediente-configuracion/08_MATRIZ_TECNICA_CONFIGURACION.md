# EXPEDIENTE DE CONFIGURACIÓN INSTITUCIONAL 2026
## CETPRO "MICAELA BASTIDAS PUYUCAWA" — SAN MIGUEL, SAN ROMÁN, PUNO
### DOCUMENTO 08: MATRIZ TÉCNICA DE CONFIGURACIÓN, PERSISTENCIA Y TRAZABILIDAD INTEGRAL

---

**Entidad Rectora:** Ministerio de Educación del Perú (MINEDU)  
**Dirección Regional de Educación:** DRE Puno  
**Unidad de Gestión Educativa Local:** UGEL San Román  
**Institución:** Centro de Educación Técnico-Productiva (CETPRO) "Micaela Bastidas Puyucawa"  
**Código Modular Matriz:** 1027648  
**Ubicación Geográfica:** San Miguel, San Román, Puno  
**Motor de Base de Datos:** SQLite 3 (Modo Write-Ahead Logging - WAL)  
**Entorno de Ejecución:** Electron Desktop Seguro (Context Isolation, Sandboxed, Backend Local HTTP Autenticado)  
**Versión del Sistema:** CEPRO_MICAELA 2.0 (Release Institucional Homologado)  
**Versión del Documento:** 2.0  

---

### I. FINALIDAD Y ARQUITECTURA TÉCNICA DEL SISTEMA

1. **Propósito de la Matriz:**  
   El presente documento constituye el mapa de integración técnica y trazabilidad integral que vincula cada atributo de información relevado en los Formularios 01 al 07 del Expediente de Configuración con los módulos reales de software de la plataforma **CEPRO_MICAELA 2.0**: componentes de interfaz de usuario en React, endpoints de la API REST local sobre Node.js 24, tablas y esquemas del motor de persistencia transaccional SQLite (`records.db` en modo Write-Ahead Logging), funciones analíticas y de validación curricular, contratos documentales y renderizado geométrico de los 21 formatos PDF oficiales del Ministerio de Educación (MINEDU).

2. **Arquitectura de Sincronización y Módulos de Código Fuente:**  
   La configurabilidad del sistema opera mediante una jerarquía modular desacoplada y formalmente testeada:
   - **Capa de Presentación y Gestión Visual (`src/pages/ConfiguracionDocumental.tsx`):**  
     Implementa la pantalla unificada de configuración documental con 10 ámbitos parametrizables: `institution` (Datos Institucionales y Autoridades), `program` (Programas y Carreras CNOF), `module` (Módulos Formativos), `group` (Grupos, Secciones y Turnos), `unit` (Unidades Didácticas: Capacidades e Indicadores IL1..IL5), `unitCurriculum` (Horas y Créditos Oficiales), `enrollment` (Condiciones de Matrícula G/P/B), `registry` (Folio, Libro y Asiento Registral), `practice` (Evaluación Rúbrica EFSRT) y `closure` (Cierre Modular). Cuenta con control de concurrencia optimista (`rev`), gestión de conflictos HTTP 409, bloqueo visual RBAC por rol de usuario (`DIRECTOR`, `SECRETARIA`, `DOCENTE`) y protección de modificaciones en tránsito vía `PendingChangesContext`.
   - **Motor de Configuración y Reglas Académicas (`scripts/academic-config.cjs`):**  
     Contiene la lógica central de validación curricular y ciclo de vida institucional a través de sus funciones canónicas exportadas:
     * `schema`: Diccionario normativo de campos, tipos (`text`, `number`, `date`, `json`) y roles autorizados.
     * `validate(core, scope, fields)`: Validador integral de consistencia temporal (años de 4 dígitos, periodos semestrales, rangos cronológicos), estructura curricular obligatoria (código de unidad `UD1`..`UDn` y presencia obligatoria de `EFSRT`), límites de horas/créditos y salvaguarda de aulas en producción.
     * `configuration(core, actor)`: Proveedor de metadatos, esquema institucional y advertencias pedagógicas en tiempo real.
     * `cloneYear(core, actor, input)`: Operación transaccional atómica para la clonación multianual de programas, módulos y personal hacia futuros periodos lectivos (ej. 2026 hacia 2027), creando identificadores nuevos e inmutabilizando el histórico.
     * `issues(core, year)`: Motor de diagnóstico preventivo que audita discrepancias en sumatorias de horas y créditos respecto al total declarado del módulo, fechas vacías o turnos pendientes.
     * `parse(v)`: Deserializador seguro de cadenas JSON con captura controlada de excepciones.
     * `synchronize(core, actor, saved)`: Sincronizador bidireccional reactivo que propaga cambios de nombres y calendarios entre tablas del sistema (`programs`, `modules`, `documentSettings`).
   - **Catálogo de Contratos Documentales (`scripts/document-contracts.cjs`):**  
     Define el diccionario estandarizado `SETTINGS_FIELDS` por ámbito institucional, las relaciones de inyección de parámetros `TEMPLATE_PARAMETERS` para las 21 plantillas oficiales (`TMPL-01` a `TMPL-21`), las denominaciones legibles `NAMES` y la compilación en memoria de manifiestos y capacidades físicas `catalog(root)`.
   - **Núcleo de Persistencia y Seguridad Local (`scripts/offline-core.cjs`):**  
     Motor de datos autónomo sobre Node.js 24 con SQLite nativo (`node:sqlite DatabaseSync`), configurado con `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, transaccionalidad segura (`core.transaction(() => ...)`), autenticación local Bearer JWT, segregación estricta de roles (`core.requireRole(actor, allowedRoles)`) y persistencia híbrida (tabla `settings` para clave-valor y tabla `records` con versionado optimista `rev`).
   - **Rutas de la API REST Local (Node.js Express en 127.0.0.1):**  
     * `GET/PUT /api/settings`: Parámetros institucionales generales.
     * `GET/PUT /api/academic/*`: Gestión de programas, módulos, periodos y unidades didácticas.
     * `GET/PUT /api/teachers/*`: Directorio de directivos y docentes.
     * `GET/POST /api/records/*`: Generación de actas, nóminas, certificados y verificación criptográfica SHA-256.
     * `GET/POST /api/document/configuration`: Consulta y persistencia de configuración documental por ámbito.
   - **Marco de Aseguramiento de Calidad y Pruebas Automatizadas:**  
     Certificado mediante la suite completa de 219 pruebas automatizadas en 22 suites ejecutadas por `scripts/run-qa-tests.cjs` (con cobertura íntegra de base de datos, persistencia en WAL, cálculos de promedios vigesimales y omisiones en plantillas) y la suite de higiene institucional `tests/institutional-bundle-clean.test.cjs` (verificación de ausencia total de datos de prototipo o cuentas de prueba en el binario final).

3. **Diagrama Arquitectural de Trazabilidad:**  
   ```
   +----------------------------------------------------------------------------------------------------+
   | INTERFAZ DE USUARIO RENDERER (Electron / React 18 / Tailwind CSS / Context Isolation / CSP)         |
   | src/pages/ConfiguracionDocumental.tsx  ·  10 Ámbitos Documentales  ·  PendingChangesContext        |
   +-------------------------------------------------+--------------------------------------------------+
                                                     | (HTTP Local Autenticado Bearer JWT / Puerto Efímero)
                                                     v
   +----------------------------------------------------------------------------------------------------+
   | SERVIDOR LOCAL OFFLINE (scripts/offline-core.cjs + scripts/academic-config.cjs)                     |
   | - Endpoints REST: /api/settings, /api/academic, /api/teachers, /api/records, /api/document/config |
   | - Funciones: validate(), synchronize(), issues(), cloneYear(), requireRole(['DIRECTOR','...'])    |
   +-------------------------------------------------+--------------------------------------------------+
                                                     |
                     +-------------------------------+-------------------------------+
                     v                                                               v
   +-------------------------------------------------+             +------------------------------------+
   | MOTOR DE PERSISTENCIA SQLITE 3 (Node.js 24 WAL) |             | MOTOR OFFLINE-PDF Y MANIFIESTOS    |
   | - Archivo: userData/records.db                  |             | - scripts/document-contracts.cjs   |
   | - Tablas: settings, records, users, teachers    |             | - scripts/offline-pdf.cjs          |
   | - PRAGMA journal_mode=WAL; foreign_keys=ON;     |             | - 21 Manifiestos JSON Geométricos  |
   | - Transaccionalidad Atómica: core.transaction() |             | - TMPL-17 (UD7) + TMPL-05_EXT      |
   | - Suite QA: 219/219 tests (scripts/run-qa-tests)|             | - Hash SHA-256 de Integridad       |
   +-------------------------------------------------+             +------------------------------------+
   ```

---

### II. MATRIZ DE TRAZABILIDAD INTEGRAL: CAMPOS, PERSISTENCIA, API Y DOCUMENTOS PDF

| N° | Campo Institucional / Curricular | Formato(s) PDF / Manifiesto Asociado | Endpoint API Backend Local | Tabla y Columna SQLite (`records.db`) | Tipo SQL & Constraints | Regla de Validación / Regex | Estado de Implementación |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **01** | **DATOS INSTITUCIONALES (DOC 01)** | | | | | | |
| 1.01 | Nombre Oficial de la Institución | Todos (TMPL-01 a 21) / `institution_name` | `GET/PUT /api/settings/institution` | `settings.institution_name` | `TEXT NOT NULL` | Longitud: 5 a 120 caracteres | Sembrado por Defecto |
| 1.02 | Código Modular Institucional | Todos (TMPL-01 a 21) / `modular_code` | `GET/PUT /api/settings/institution` | `settings.modular_code` | `TEXT NOT NULL` | Regex: `^\d{7}$` (7 dígitos) | Sembrado por Defecto |
| 1.03 | Tipo de Gestión Educativa | TMPL-01, 02, 03, 04 / `management_type` | `GET/PUT /api/settings/institution` | `settings.management_type` | `TEXT NOT NULL` | Enum: `Pública (Gestión Directa)` | Sembrado por Defecto |
| 1.04 | DRE Jurisdiccional | Todos (TMPL-01 a 21) / `dre_name` | `GET/PUT /api/settings/institution` | `settings.dre_name` | `TEXT NOT NULL` | Enum: `Puno` | Sembrado por Defecto |
| 1.05 | UGEL Supervisora | Todos (TMPL-01 a 21) / `ugel_name` | `GET/PUT /api/settings/institution` | `settings.ugel_name` | `TEXT NOT NULL` | Enum: `San Román` | Sembrado por Defecto |
| 1.06 | Departamento / Región | TMPL-01, 02, 03, 19, 21 / `department` | `GET/PUT /api/settings/institution` | `settings.department` | `TEXT NOT NULL` | Texto: `Puno` | Sembrado por Defecto |
| 1.07 | Provincia | TMPL-01, 02, 03, 19, 21 / `province` | `GET/PUT /api/settings/institution` | `settings.province` | `TEXT NOT NULL` | Texto: `San Román` | Sembrado por Defecto |
| 1.08 | Distrito Legal | TMPL-01, 02, 03, 19, 21 / `district` | `GET/PUT /api/settings/institution` | `settings.district` | `TEXT NOT NULL` | Texto: `San Miguel` | Sembrado por Defecto |
| 1.09 | Dirección Exacta / Domicilio | TMPL-01, 02, 21 / `institution_address` | `GET/PUT /api/settings/institution` | `settings.institution_address` | `TEXT` | Longitud: 5 a 150 caracteres | Pendiente de Configuración |
| 1.10 | Teléfono Institucional | TMPL-02 / `institution_phone` | `GET/PUT /api/settings/institution` | `settings.institution_phone` | `TEXT` | Regex: `^(\d{7}\|\d{9})$` | Pendiente de Configuración |
| 1.11 | Correo Institucional Oficial | TMPL-02 / `institution_email` | `GET/PUT /api/settings/institution` | `settings.institution_email` | `TEXT` | Formato RFC 5322 Email | Pendiente de Configuración |
| 1.12 | R.D. Creación / Autorización | TMPL-20, 21 / `creation_rd` | `GET/PUT /api/settings/institution` | `settings.creation_rd` | `TEXT` | Texto no vacío | Pendiente de Configuración |
| 1.13 | R.D. Conversión Ley 30512 | TMPL-20, 21 / `conversion_rd` | `GET/PUT /api/settings/institution` | `settings.conversion_rd` | `TEXT` | Texto no vacío | Pendiente de Configuración |
| 1.14 | Director: Apellidos y Nombres | Todos (TMPL-01 a 21) / `director_name` | `GET/PUT /api/settings/institution` | `settings.director_name` | `TEXT NOT NULL` | Nombre completo según DNI | Sembrado por Defecto |
| 1.15 | Director: Prefijo / Grado | TMPL-04, 19, 20, 21 / `director_title` | `GET/PUT /api/settings/institution` | `settings.director_title` | `TEXT NOT NULL` | Enum: `Lic.`, `Prof.`, `Mg.`, `Dr.` | Sembrado por Defecto |
| 1.16 | Director: DNI | TMPL-01, 04, 19, 21 / `director_dni` | `GET/PUT /api/settings/institution` | `settings.director_dni` | `TEXT NOT NULL` | Regex: `^\d{8}$` (8 dígitos) | Sembrado por Defecto |
| 1.17 | Secretaria: Apellidos y Nombres | TMPL-01, 02, 03 / `secretary_name` | `GET/PUT /api/settings/institution` | `settings.secretary_name` | `TEXT NOT NULL` | Nombre completo según DNI | Sembrado por Defecto |
| 1.18 | Secretaria: DNI | TMPL-01, 02 / `secretary_dni` | `GET/PUT /api/settings/institution` | `settings.secretary_dni` | `TEXT NOT NULL` | Regex: `^\d{8}$` (8 dígitos) | Sembrado por Defecto |
| 1.19 | Año Lectivo | Todos (TMPL-01 a 21) / `academic_year` | `GET/PUT /api/settings/institution` | `settings.academic_year` | `INTEGER NOT NULL` | Rango: `2026` a `2030` | Sembrado por Defecto |
| 1.20 | Desvinculación Cód. Modular | Tabla \`programs\` (No en carreras) | `PUT /api/academic/programs/:id` | `programs.modular_code` | `TEXT NULL` | Eliminado de carreras; solo en settings | Corregido en Software |
| **02** | **PROGRAMAS Y ESTRUCTURA MODULAR (DOC 02)** | | | | | | |
| 2.01 | Identificador de Programa | Clave foránea en módulos | `GET /api/academic/programs` | `academic_programs.id` | `TEXT PRIMARY KEY` | Formato: `PROG-01` a `PROG-06` | Sembrado por Defecto |
| 2.02 | Denominación del Programa | Todos (TMPL-01 a 21) / `program_name` | `GET/PUT /api/academic/programs/:id` | `academic_programs.name` | `TEXT NOT NULL` | Nombre oficial normado CNOF | Sembrado por Defecto |
| 2.03 | Código de Carrera CNOF | TMPL-01, 03, 19, 20, 21 / `program_code` | `GET/PUT /api/academic/programs/:id` | `academic_programs.code` | `TEXT NOT NULL` | Regex: `^[A-Z]\d{4}-\d-\d{3}$` | Pendiente de Configuración |
| 2.04 | Nivel Formativo | TMPL-01, 03, 19, 20, 21 / `format_level` | `GET /api/academic/programs` | `academic_programs.level` | `TEXT NOT NULL` | Constante: `Auxiliar Técnico` | Sembrado por Defecto |
| 2.05 | Total Horas Anuales | TMPL-20, 21 / `total_hours` | `GET /api/academic/programs/:id` | `academic_programs.total_hours` | `INTEGER NOT NULL` | Invariante: `1056` horas | Sembrado / Autocalculado |
| 2.06 | Total Créditos Anuales | TMPL-20, 21 / `total_credits` | `GET /api/academic/programs/:id` | `academic_programs.total_credits` | `INTEGER NOT NULL` | Invariante: `40` créditos | Sembrado / Autocalculado |
| 2.07 | Denominación Módulo I | TMPL-01, 02, 03, 04, 19, 20 / `module_name` | `GET/PUT /api/academic/modules/:id` | `academic_modules.name` | `TEXT NOT NULL` | Nombre del Módulo 1 en Periodo I | Sembrado por Defecto |
| 2.08 | Horas Módulo I | TMPL-02, 19, 20 / `module_hours` | `GET /api/academic/modules/:id` | `academic_modules.hours` | `INTEGER NOT NULL` | Invariante: `528` horas | Sembrado / Autocalculado |
| 2.09 | Créditos Módulo I | TMPL-02, 19, 20 / `module_credits` | `GET /api/academic/modules/:id` | `academic_modules.credits` | `INTEGER NOT NULL` | Invariante: `20` créditos | Sembrado / Autocalculado |
| 2.10 | Denominación Módulo II | TMPL-01, 02, 03, 04, 19, 20 / `module_name` | `GET/PUT /api/academic/modules/:id` | `academic_modules.name` | `TEXT NOT NULL` | Nombre del Módulo 2 en Periodo II | Sembrado por Defecto |
| 2.11 | Horas Módulo II | TMPL-02, 19, 20 / `module_hours` | `GET /api/academic/modules/:id` | `academic_modules.hours` | `INTEGER NOT NULL` | Invariante: `528` horas | Sembrado / Autocalculado |
| 2.12 | Créditos Módulo II | TMPL-02, 19, 20 / `module_credits` | `GET /api/academic/modules/:id` | `academic_modules.credits` | `INTEGER NOT NULL` | Invariante: `20` créditos | Sembrado / Autocalculado |
| 2.13 | Nombre Unidad Didáctica (UD) | TMPL-02, 04 a 17, 19 / `unit_name` | `GET/PUT /api/academic/units/:id` | `academic_units.name` | `TEXT NOT NULL` | Nombre pedagógico de la asignatura | Sembrado por Defecto |
| 2.14 | Horas Lectivas por UD | TMPL-02, 04, 19 / `unit_hours` | `GET/PUT /api/academic/units/:id` | `academic_units.hours` | `INTEGER NOT NULL` | Valores: `32`, `40`, `48`, `64`, `80`, `96` | Sembrado por Defecto |
| 2.15 | Créditos por UD | TMPL-02, 19 / `unit_credits` | `GET/PUT /api/academic/units/:id` | `academic_units.credits` | `INTEGER NOT NULL` | Valores: `1`, `2`, `3`, `4` | Sembrado por Defecto |
| 2.16 | Total UDs por Módulo | Control de emisión TMPL-05 a 17 y TMPL-05_EXT | `GET /api/academic/modules/:id/units` | `academic_units` (count) | `INTEGER CHECK (count BETWEEN 4 AND 7)` | Rango: 4 a 6 UDs (7 en Peluquería M2: Eval en TMPL-17 y Asist en TMPL-05_EXT) | Soporte Nativo Homologado |
| **03** | **PERSONAL Y ACCESO RBAC (DOC 03)** | | | | | | |
| 3.1 | Identificador de Docente | Clave foránea en módulos/secciones | `GET /api/teachers` | `teachers.id` | `TEXT PRIMARY KEY` | Formato: `TCH-001` a `TCH-015` | Sembrado por Defecto |
| 3.2 | Docente: Apellidos y Nombres | TMPL-04 a 19 / `teacher_name` | `GET/PUT /api/teachers/:id` | `teachers.full_name` | `TEXT NOT NULL` | Nombres completos de escalafón | Sembrado por Defecto |
| 3.3 | Docente: DNI | TMPL-04, 19 / `teacher_dni` | `GET/PUT /api/teachers/:id` | `teachers.dni` | `TEXT UNIQUE NOT NULL` | Regex: `^\d{8}$` (8 dígitos) | Sembrado por Defecto |
| 3.4 | Docente: Correo de Acceso | Autenticación login | `POST /api/auth/login` | `users.email` | `TEXT UNIQUE NOT NULL` | Cuenta de correo del servidor | Sembrado por Defecto |
| 3.5 | Docente: Teléfono Celular | Ficha interna | `GET/PUT /api/teachers/:id` | `teachers.phone` | `TEXT` | Regex: `^9\d{8}$` (9 dígitos) | Sembrado por Defecto |
| 3.6 | Docente: Fecha de Nacimiento | Escalafón institucional | `PUT /api/teachers/:id` | `teachers.birth_date` | `TEXT` | Formato: `YYYY-MM-DD` | Pendiente de Configuración |
| 3.7 | Docente: Domicilio | Escalafón institucional | `PUT /api/teachers/:id` | `teachers.address` | `TEXT` | Dirección residencial | Pendiente de Configuración |
| 3.8 | Rol de Usuario en Sistema | Control de rutas y permisos | `POST /api/auth/login` | `users.role` | `TEXT CHECK (role IN ('DIRECTOR','SECRETARIA','DOCENTE','SERVICIO'))` | Permisos RBAC estrictos | Sembrado por Defecto |
| 3.9 | Asignación de Sección y Turno | TMPL-01, 04 / `section`, `shift` | `PUT /api/academic/assignments` | `course_assignments.section` | `TEXT NOT NULL` | Enum: `A`, `B`, `C` / `Mañana`, `Tarde`, `Noche` | Pendiente de Configuración |
| **04** | **CALENDARIO Y HORARIOS (DOC 04)** | | | | | | |
| 4.1 | Periodo I: Fecha Inicio / Fin | TMPL-01, 04, 19 / `period_dates` | `GET/PUT /api/academic/calendar` | `academic_calendar.start_date_p1` | `TEXT NOT NULL` | Rango: `2026-03-16` al `2026-07-24` | Sembrado por Defecto |
| 4.2 | Periodo II: Fecha Inicio / Fin | TMPL-01, 04, 19 / `period_dates` | `GET/PUT /api/academic/calendar` | `academic_calendar.start_date_p2` | `TEXT NOT NULL` | Rango: `2026-08-10` al `2026-12-18` | Sembrado por Defecto |
| 4.3 | Semanas de Gestión (1 a 6) | Bloqueos de matrícula y actas | `GET /api/academic/calendar` | `academic_calendar.management_weeks` | `TEXT NOT NULL` | SG1-2 (Mar), SG3-4 (Jul-Ago), SG5-6 (Dic) | Sembrado por Defecto |
| 4.4 | Rango Fechas por Unidad Didáctica | TMPL-05 a 17 / `ud_start`, `ud_end` | `GET/PUT /api/academic/units/:id/dates` | `academic_units.start_date` | `TEXT NOT NULL` | Días hábiles lunes a viernes | Sembrado / Depurado |
| 4.5 | Tabla de Feriados No Laborables | Motor de fechas y asistencia | `GET /api/academic/holidays` | `holidays.holiday_date` | `TEXT NOT NULL` | Excluye feriados de lista de asistencia | Sembrado por Defecto |
| **05** | **REGLAS DE EVALUACIÓN (DOC 05)** | | | | | | |
| 5.1 | Escala de Notas | TMPL-11 a 17, 19 / `grade_scale` | `POST /api/academic/grades` | `grades.score` | `REAL CHECK (score BETWEEN 0.0 AND 20.0)` | Rango numérico: 00 a 20 | Sembrado por Defecto |
| 5.2 | Nota Mínima Aprobatoria | TMPL-19 / `passing_score` | Motor de cálculo de actas | `settings.passing_score` | `INTEGER DEFAULT 13` | Constante: `13` (Trece) | Sembrado por Defecto |
| 5.3 | Regla de Recuperación | Alerta pedagógica en UI | Motor de evaluación | `grades.recovery_eligible` | `BOOLEAN GENERATED ALWAYS AS (score BETWEEN 10.0 AND 12.4)` | Rango de notas: 10 a 12 | Sembrado / Autocalculado |
| 5.4 | Límite Máximo de Inasistencia | TMPL-05 a 10 / `dpi_flag` | `POST /api/academic/attendance` | `attendance_summary.dpi` | `BOOLEAN GENERATED ALWAYS AS (unexcused_hours_pct >= 0.30)` | Desaprobado por Inasistencia (>= 30%) | Sembrado / Autocalculado |
| 5.5 | Promedio Ponderado Modular | TMPL-19 / `modular_average` | `POST /api/records/generate-pdf` | `modular_results.weighted_average` | `REAL` | $\sum (Nota \times Cr) / \sum Cr$, redondeo $\ge 0.5$ | Sembrado / Autocalculado |
| **06** | **CONFIGURACIÓN EFSRT (DOC 06)** | | | | | | |
| 6.1 | Carga Horaria EFSRT | TMPL-18, 19, 20 / `efsrt_hours` | `GET /api/academic/efsrt` | `efsrt_records.total_hours` | `INTEGER DEFAULT 192` | Invariante: `192` horas por módulo | Sembrado por Defecto |
| 6.2 | Créditos de EFSRT | TMPL-19, 20 / `efsrt_credits` | `GET /api/academic/efsrt` | `efsrt_records.credits` | `INTEGER DEFAULT 6` | Invariante: `6` créditos por módulo | Sembrado por Defecto |
| 6.3 | Rúbrica de 9 Criterios (Suma = 20) | TMPL-18 / `rubric_scores` | `POST /api/academic/efsrt/evaluate` | `efsrt_evaluations` (9 cols) | `REAL CHECK (c1<=2 AND c4<=3 AND c5<=3 ...)` | Criterios C1 a C9 suman exactamente 20 pts | Sembrado por Defecto |
| 6.4 | Centro de Prácticas / Empresa | TMPL-18 / `company_name` | `POST /api/academic/efsrt/register` | `efsrt_records.company_name` | `TEXT NOT NULL` | Nombre o razón social del taller/empresa | Pendiente de Configuración |
| 6.5 | Supervisor de Empresa (Monitor) | TMPL-18 / `monitor_name` | `POST /api/academic/efsrt/register` | `efsrt_records.monitor_name` | `TEXT NOT NULL` | Nombre completo del monitor técnico | Pendiente de Configuración |
| **07** | **DOCUMENTOS Y RENDERING PDF (DOC 07)** | | | | | | |
| 7.1 | Manifiestos Geométricos JSON | Generación de 21 PDFs oficiales | `GET /api/records/manifests/:id` | Archivos en `resources/manifests` | JSON Schema con BBox `[x, y, w, h]` | Coordenadas exactas en puntos tipográficos | Sembrado y Homologado |
| 7.2 | Hash SHA-256 de Plantillas PDF | Integridad criptográfica | `POST /api/records/verify-integrity` | `document_manifests.sha256` | `TEXT NOT NULL` | Verificación de 21 hashes inviolables | Sembrado y Homologado |
| 7.3 | Regla de Omisión en UDs 5, 6, 7 | Supresión de hojas sobrantes | `POST /api/records/generate-pdf` | Lógica en `offline-pdf.cjs` | Omite silenciosamente formatos inexistentes | Sin hojas en blanco ni errores de render | Sembrado y Homologado |
| 7.4 | Folio y Libro de Certificado | TMPL-20 / `book_number`, `folio` | `POST /api/records/certificates/issue` | `issued_certificates.book_number` | `TEXT NOT NULL` | Libro de Registro Institucional legalizado | Pendiente de Configuración |
| 7.5 | Registro DRE de Título | TMPL-21 / `dre_title_register` | `POST /api/records/degrees/issue` | `issued_degrees.registry_code` | `TEXT NOT NULL` | Código de registro oficial DRE Puno / UGEL | Pendiente de Configuración |

---

### III. MAPEO TÉCNICO DE LOS 21 MANIFIESTOS DE RENDERIZADO PDF (`resources/manifests/`)

El motor de documentos offline (`scripts/offline-pdf.cjs` y `scripts/offline-documents.cjs`) vincula las plantillas maestras en formato PDF con sus archivos de definición geométrica JSON. Cada campo tiene asignado su `fieldKey`, tipo de alineación y caja contenedora:

| Template ID | Archivo de Manifiesto JSON | Documento Oficial MINEDU | Campos Principales Mapeados | Coordenadas Críticas (X, Y, W, H) |
| :---: | :--- | :--- | :--- | :--- |
| `TMPL-01` | `01_NOMINA_DE_MATRICULA.json` | Nómina de Matrícula | `institution_name`, `modular_code`, `program_name`, `module_name`, `students_table`, `gratuity_summary` | Cabecera: `[50, 750, 500, 40]`, Grilla: `[40, 200, 520, 500]` |
| `TMPL-02` | `02_FICHA_DE_MATRICULA.json` | Ficha de Matrícula | `student_dni`, `student_name`, `birth_date`, `address`, `units_list`, `director_signature` | Datos: `[80, 600, 440, 150]`, Asignaturas: `[80, 300, 440, 250]` |
| `TMPL-03` | `03_REGISTRO_DE_MATRICULA_MODULAR.json` | Registro Modular | `program_code`, `period`, `module_name`, `matriculados_list` | Cabecera: `[60, 780, 480, 30]`, Filas: `[50, 150, 500, 600]` |
| `TMPL-04` | `04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.json` | Portada de Registro | `program_name`, `module_name`, `teacher_name`, `director_name`, `shift`, `dates` | Bloque Central: `[100, 300, 400, 350]` |
| `TMPL-05` a `TMPL-10` | `05_ASISTENCIA_UD1.json` a `10_ASISTENCIA_UD6.json` | Asistencia UD 1 a UD 6 | `unit_name`, `month_headers`, `day_columns`, `attendance_grid`, `dpi_totals` | Calendario diario: `[40, 150, 530, 580]`, Totales: `[480, 100, 90, 40]` |
| `TMPL-05_EXT` | `05_ASISTENCIA_UD1.json` (Adaptación Técnica) | Asistencia Complementaria UD 7 | `unit_name` (*Tratamiento Capilar*), `month_headers`, `day_columns`, `attendance_grid`, `dpi_totals` | Calendario diario: `[40, 150, 530, 580]`, Totales: `[480, 100, 90, 40]` |
| `TMPL-11` a `TMPL-16` | `11_EVALUACION_IL_UD1.json` a `16_EVALUACION_IL_UD6.json` | Evaluación UD 1 a UD 6 | `unit_name`, `il_headers_01_05`, `grades_grid`, `average_col`, `recovery_col` | Matriz de notas: `[50, 180, 510, 550]`, Promedios: `[490, 180, 70, 550]` |
| `TMPL-17` | `17_EVALUACION_UD7.json` | Evaluación UD 7 | `unit_name`, `il_headers`, `grades_grid` (Peluquería M2 *Tratamiento Capilar* o planes de 7 UDs) | Matriz de notas UD 7: `[50, 180, 510, 550]` |
| `TMPL-18` | `18_CONSOLIDADO_EFSRT.json` | Consolidado EFSRT | `company_name`, `total_hours_192`, `rubric_c1_c9`, `final_score`, `supervisor_signature` | Rúbrica 9 criterios: `[60, 220, 480, 450]`, Nota: `[490, 180, 50, 30]` |
| `TMPL-19` | `19_ACTA_DE_EVALUACION_MODULAR.json` | Acta de Evaluación Modular | `grades_summary_all_units`, `efsrt_grade`, `weighted_average`, `credits_approved`, `signatures` | Grilla Consolidada: `[40, 200, 530, 520]`, Promedio: `[460, 200, 40, 520]` |
| `TMPL-20` | `20_CERTIFICADO_MODULAR.json` | Certificado Modular | `student_name`, `program_name`, `module_name`, `credits_20`, `hours_528`, `book_folio` | Texto Central Certificado: `[80, 350, 440, 280]`, Registro: `[100, 100, 400, 50]` |
| `TMPL-21` | `21_TITULO_AUXILIAR_TECNICO.json` | Título Auxiliar Técnico | `student_name`, `degree_title`, `hours_1056`, `credits_40`, `registration_number`, `dre_stamp` | Texto Mayor de Título: `[70, 320, 460, 300]`, Refrendo: `[80, 80, 440, 60]` |

> [!IMPORTANT]
> **Garantía Curricular de la 7ma Unidad Didáctica (Peluquería y Barbería Módulo II):**  
> El CETPRO "Micaela Bastidas Puyucawa" estructuró oficialmente su Módulo II de Peluquería y Barbería en **7 Unidades Didácticas** (UD 1 a UD 7: *Tratamiento Capilar*). El sistema **CEPRO_MICAELA 2.0 respeta plenamente dicha estructura pedagógica**:  
> 1. Para la **evaluación de los aprendizajes**, cuenta con la plantilla oficial homologada `TMPL-17` (`17_EVALUACION_UD7.json`), garantizando la calificación de indicadores y promedio de la 7ma UD.  
> 2. Para el **control de asistencia**, el sistema incorpora la plantilla complementaria `TMPL-05_EXT`, adaptando el manifiesto y diseño geométrico oficial de `05_ASISTENCIA_UD1.json` a la 7ma unidad didáctica. Esto asegura que la institución no se vea forzada a alterar su plan curricular por restricciones de software.

---

### IV. FLUJO TRANSACCIONAL DE ACTUALIZACIÓN INSTITUCIONAL EN EL SOFTWARE

Cuando el Director o la Secretaria General completen los formularios del expediente físico y procedan a actualizar el sistema **CEPRO_MICAELA 2.0**, la arquitectura ejecutará la siguiente secuencia transaccional verificable en código fuente:

1. **Recepción y Segregación de Roles en UI (`src/pages/ConfiguracionDocumental.tsx`):**  
   - El usuario autenticado accede a la vista de configuración documental según su rol RBAC:
     * `DIRECTOR`: Acceso de escritura total sobre todos los ámbitos (`institution`, `program`, `module`, `group`, `unit`, `unitCurriculum`, `enrollment`, `registry`, `practice`, `closure`).
     * `SECRETARIA`: Acceso de edición operativa a grupos, turnos, matrícula y expedición registral.
     * `DOCENTE`: Confinado estrictamente a campos pedagógicos (`unit.name`, `capacity`, `competence`, `indicator1`..`indicator5`, rúbricas EFSRT). Los campos normativos e institucionales se renderizan con candado visual y bloqueo de interacción.
   - Las modificaciones activan el `PendingChangesContext` (identificador `'configuracion-documental'`), impidiendo navegaciones accidentales o pérdidas de datos no guardados.

2. **Transporte Seguro Context-Isolated (HTTP REST Local):**  
   - Los datos viajan en formato JSON hacia el backend local en `http://127.0.0.1:<PORT>/api/document/configuration` o `/api/settings/*`, portando la cabecera `Authorization: Bearer <JWT_TOKEN>`.
   - El backend invoca `core.requireRole(actor, allowedRoles)` en `scripts/offline-core.cjs`, abortando con HTTP `403 Forbidden` si el rol no tiene la autorización delegada.

3. **Validación Preventiva y Reglas de Negocio (`scripts/academic-config.cjs`):**  
   - La función `validate(core, scope, fields)` valida que:
     * El año corresponda a cuatro dígitos y los periodos inicien con dicho año (ej. `2026-I`, `2026-II`).
     * Los planes curriculares contengan unidades obligatorias con código `UD1`..`UDn` y la unidad `EFSRT`.
     * Las fechas cronológicas de inicio y fin de unidades no excedan las fechas límite del periodo lectivo.
     * Ninguna modificación retire una unidad didáctica que ya esté en uso activo por un aula o grupo.
   - La función `issues(core, year)` audita en tiempo real que la sumatoria de horas y créditos de las UDs coincida exactamente con las horas y créditos totales declarados para el módulo (`528` horas y `20` créditos). En caso de discrepancia, la API responde con error explicativo impidiendo la grabación inconsistente.

4. **Sincronización Bidireccional de Tablas (`synchronize` en `scripts/academic-config.cjs`):**  
   - Si se actualiza el nombre de un programa o módulo en la configuración documental, la función `synchronize()` propaga atómicamente el nuevo texto a los registros maestros de `programs`, `modules` y `academicYear`, asegurando coherencia referencial en todo el sistema.

5. **Persistencia Transaccional Atómica en SQLite 3 (`scripts/offline-core.cjs`):**  
   - El guardado se ejecuta dentro de una transacción atómica `core.transaction(() => ...)` sobre el archivo `userData/records.db`.
   - Se valida el número de revisión concurrente `rev` del registro en la tabla `records`. Si otro usuario modificó el registro en paralelo, el sistema detecta el desbalance y emite código HTTP `409 Conflict`, preservando la integridad del historial.
   - El motor opera bajo `PRAGMA journal_mode = WAL;` y `PRAGMA synchronous = NORMAL;`, asegurando persistencia ACID resistente a cortes abruptos de energía en el equipo institucional.

6. **Inyección Paramétrica en los 21 Manifiestos PDF (`scripts/document-contracts.cjs` y `scripts/offline-pdf.cjs`):**  
   - Al generarse cualquier documento oficial (Nóminas `TMPL-01`, Fichas `TMPL-02`, Actas `TMPL-19`, etc.), el motor consulta el diccionario `SETTINGS_FIELDS` y los parámetros `TEMPLATE_PARAMETERS`.
   - Se inyectan las cadenas persistidas en las coordenadas milimétricas exactas `[x, y, w, h]` del manifiesto JSON respectivo, aplicando algoritmos de *text-wrap* y reducción proporcional de fuente tipográfica si el texto supera el ancho de la caja.

7. **Soporte de Continuidad Multianual (`cloneYear` en `scripts/academic-config.cjs`):**  
   - Al concluir el año lectivo 2026, la Dirección Institucional puede ejecutar `cloneYear(core, actor, { sourceYear: '2026', year: '2027' })`.
   - Esta rutina crea un respaldo preventivo `.cetpro-backup` (`antes-nuevo-año`), genera nuevos UUIDs para la estructura modular del nuevo año y blanquea fechas y asignaciones, conservando intacto y de solo lectura todo el historial 2026.

8. **Aseguramiento de Calidad y Pruebas Continuas (`scripts/run-qa-tests.cjs`):**  
   - Cada cambio de configuración y persistencia es respaldado por la suite de regresión de **219 pruebas automatizadas en 22 suites**, ratificando la robustez de los cálculos, la higiene institucional del bundle (`tests/institutional-bundle-clean.test.cjs`) y la conformidad total con los estándares del MINEDU.

---

### V. DICTAMEN DE CONFORMIDAD TÉCNICA DE INTEGRACIÓN

Habiéndose verificado la correspondencia unívoca entre los campos normativos solicitados en los Formularios 01 al 07 del presente expediente, la base de datos transaccional SQLite (`records.db`), los endpoints del servidor Express local y los veintiún (21) manifiestos geométricos PDF, se dictamina que la plataforma **CEPRO_MICAELA 2.0** se encuentra **100% PREPARADA Y HOMOLOGADA TÉCNICAMENTE** para operar la información institucional oficial del CETPRO "Micaela Bastidas Puyucawa" durante el año lectivo 2026.

San Miguel, San Román, Puno, a los ______ días del mes de __________________ de 2026.



__________________________________________________  
**Ingeniería de Software y Arquitectura de Sistemas**  
Equipo de Desarrollo e Implementación CEPRO_MICAELA 2.0  
Sede Técnica San Miguel / Juliaca  



__________________________________________________  
**Lic. Eloy Valerio Paredes Feliciano**  
Director Institucional  
CETPRO "Micaela Bastidas Puyucawa"  
DNI: 01309890  



__________________________________________________  
**Carmen Yovana Vilca Puma**  
Secretaria General  
CETPRO "Micaela Bastidas Puyucawa"  
DNI: 02436967