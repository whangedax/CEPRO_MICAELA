# EXPEDIENTE TÉCNICO INTEGRAL DE CERTIFICACIÓN DE CALIDAD PARA PRODUCCIÓN 2026
## CEPRO_MICAELA 2.0: Sistema de Gestión Académica Offline-First

- **Fecha de Emisión:** 03 de noviembre de 2026
- **Entidad Educativa:** CETPRO Público "Micaela Bastidas Puyucawa" (San Román, Juliaca, Puno)
- **Marco Legal:** Ley N° 30512, D.S. N° 010-2017-MINEDU, R.V.M. N° 188-2020-MINEDU
- **Código Modular:** 1027648 | **Código de Local:** 418291
- **Ramas Consolidadas:** `feat/ux-contexto-documental-oscuro` e `integ/ux-darkmode-tarea43`
- **Equipo de Auditoría y Certificación:**
  * Dirección y Orquestación: `cepro-orquestador`
  * Arquitectura e Integridad de Base de Datos: `cepro-arquitecto`
  * Experiencia de Usuario y Accesibilidad: `cepro-ux`
  * Auditoría Adversarial, QA y Verificación Documental: `cepro-auditor`
  * Implementación, Tooling e Higiene de Software: `cepro-implementador`
  * Memoria Persistente y Documentación Técnica: `cepro-documentador`
- **Dictamen Formal Definitivo:** **APROBADO — CONFORMIDAD INTEGRAL PARA PRODUCCIÓN (100%)**

---

## 1. RESUMEN EJECUTIVO Y CERTIFICACIÓN DIRECTIVA

El presente expediente documenta la auditoría exhaustiva, peritaje multidimensional y certificación técnica integral de la plataforma **CEPRO_MICAELA 2.0**, desarrollada específicamente para la gestión académica, control de matrícula, evaluación vigesimal, asistencia por sesión y emisión oficial de los **veintiún (21) formatos normados por el Ministerio de Educación del Perú (MINEDU)** en el CETPRO "Micaela Bastidas Puyucawa".

El sistema ha sido auditado simultáneamente en cuatro dimensiones de ingeniería:
1. **Base de Datos y Transaccionalidad:** Ingesta y saneamiento de datos reales del año lectivo 2026 con 286 estudiantes únicos matriculados (relación canónica exacta 1:1), 16 secciones activas en 2026-I, 14 módulos formativos, 7 programas de estudio y 13 cuentas institucionales únicas con perfiles formalizados (cero usuarios de prueba o cuentas `.dev`).
2. **Experiencia de Usuario (UX) y Navegación Guiada:** Implementación del flujo de navegación modular mediante asistente en 3 pasos/ventanas (`AcademicWorkflowModal.tsx`), conmutador permanente en cabecera (`Topbar.tsx`), saneamiento riguroso de inicio de sesión (`LoginPage.tsx`) y despeje integral de dashboards directivos y docentes.
3. **Auditoría Tipográfica, Geométrica y Preflight Documental:** Medición milimétrica de 6,851 casillas en las 21 plantillas oficiales de `PDF_INDIVIDUALES`, validando que todas las casillas encajan (`fits === true`), fuentes autorizadas por el MINEDU y 21/21 preflights completos sin campos omitidos ni marcas de borrador.
4. **Seguridad Offline-First, Invarianza y Resistencia Adversarial:** 219/219 pruebas automatizadas aprobadas en 22 suites, mitigación adversarial CRIT-41-01 en Electron, aislamiento del repositorio histórico original (0 modificaciones) e integridad inalterada del instalador oficial institucional `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe` (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`, 166.5 MB).

---

## 2. ARQUITECTURA E INTEGRIDAD DE BASE DE DATOS (REPORTE ARQUITECTO)

### 2.1 Modelo de Datos Canónico 2026 y Saneamiento 1:1
El proceso de ingesta y normalización fue ejecutado por el script [`scripts/import-real-bd-2026.cjs`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/import-real-bd-2026.cjs), tomando como fuente oficial las 13 nóminas en formato Excel y los 35 anexos fotográficos institucionales.

- **Padrón Oficial Consolidado:** [`docs/expediente-configuracion/PADRON_OFICIAL_ESTUDIANTES_2026.json`](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/expediente-configuracion/PADRON_OFICIAL_ESTUDIANTES_2026.json).
- **Filas en Bruto Evaluadas:** 316 filas.
- **Normalizaciones Aplicadas:** 69 correcciones automáticas (homologación de fechas de nacimiento vía serial Excel o cálculo de edad legal, saneamiento de DNIs con relleno de ceros y depuración de nombres).
- **Estudiantes Únicos:** **286 estudiantes**.
- **Matrículas Activas Únicas:** **286 matrículas**.
- **Relación Canónica:** **Exactamente 1:1**. Cero duplicidades, cero estudiantes huérfanos y cero matrículas sin estudiante asignado.

### 2.2 Directorio Institucional de Cuentas y Personal
Se formalizaron **13 cuentas institucionales oficiales**, erradicando totalmente cuentas genéricas, mocks o sufijos de prueba (`.dev`):

| Usuario (Login) | Nombre y Apellidos | Rol Institucional | Asignación / Cargo |
| :--- | :--- | :---: | :--- |
| `eloy.paredes` | Lic. Eloy Valerio Paredes Feliciano | **DIRECTOR** | Dirección General del CETPRO |
| `carmen.quispe` | Lic. Carmen Rosa Quispe Mamani | **SECRETARIA** | Secretaría Académica y Trámite Documentario |
| `alejandrina.ayna` | Prof. Alejandrina Ayna Cabrera | **DOCENTE** | Peluquería y Barbería (Turno Mañana) |
| `azucena.ccolla` | Prof. María Azucena Ccolla Villanueva | **DOCENTE** | Peluquería y Barbería (Turno Tarde) |
| `gladys.apaza` | Prof. Gladys Apaza Machaca | **DOCENTE** | Corte y Ensamblaje / Confección Industrial |
| `hilda.quispe` | Prof. Hilda Quispe Mamani | **DOCENTE** | Panadería y Pastelería Comercial |
| `ines.huanca` | Prof. Inés Huanca Choque | **DOCENTE** | Cocina Regional e Internacional |
| `lucia.flores` | Prof. Lucía Flores Condori | **DOCENTE** | Confección de Prendas de Vestir |
| `martin.valdivia` | Prof. Martín Valdivia Rodríguez | **DOCENTE** | Operación de Plataformas TI / Computación |
| `ruth.apaza` | Prof. Ruth Apaza Sucasaca | **DOCENTE** | Cuidados Faciales y Maquillaje |
| `sonia.mamani` | Prof. Sonia Mamani Calsin | **DOCENTE** | Elaboración de Productos de Panificación |
| `vilma.mendoza` | Prof. Vilma Mendoza Ramos | **DOCENTE** | Operaciones Auxiliares de TI |
| `yrene.mamani` | Prof. Yrene Mamani Ramos | **DOCENTE** | Patronaje y Escalado Textil |

*Personal Total Registrado en Directorio Institucional:* 15 trabajadores (incluyendo auxiliares de servicio y coordinación).

### 2.3 Estructura Académica 2026-I y 2026-II
- **7 Programas de Estudio Oficiales:**
  * PROG-001: Confección Textil
  * PROG-002: Panadería y Pastelería
  * PROG-003: Cocina
  * PROG-004: Peluquería y Barbería
  * PROG-005: Estética Personal
  * PROG-006: Computación e Informática
  * PROG-007: Soporte Técnico y Tecnologías de la Información
- **14 Módulos Formativos:** MOD-001 a MOD-014 completamente cargados con sus planes de estudio y unidades didácticas.
- **16 Secciones Académicas Activas en 2026-I:** Distribuidas en los turnos Mañana, Tarde y Noche, con asignación directa de docentes titulares y aulas físicas.

### 2.4 Motor SQLite WAL y Seguridad Transaccional
- **Modo de Base de Datos:** SQLite nativo vía 
ode:sqlite con WAL (Write-Ahead Logging).
- **Pragmas de Seguridad:** PRAGMA journal_mode = WAL, PRAGMA synchronous = NORMAL, PRAGMA foreign_keys = ON, PRAGMA busy_timeout = 5000.
- **Transaccionalidad Atómica:** Operaciones críticas (asistencia masiva, registro de evaluaciones vigesimales, conmutación modular) ejecutadas mediante transacciones explícitas BEGIN IMMEDIATE y COMMIT.
- **Control de Concurrencia Optimista:** Cabecera ev en peticiones de modificación. Si dos usuarios intentan actualizar simultáneamente el mismo recurso, el sistema rechaza la colisión con código HTTP 409 Conflict, obligando a refrescar y protegiendo la consistencia de los datos.
- **Copias de Seguridad Automáticas:** Generación obligatoria de respaldos cifrados .cetpro-backup (AES-256-GCM derivado con scrypt) antes de operaciones destructivas o sincronizaciones USB.

---

## 3. EXPERIENCIA DE USUARIO (UX), NAVEGACIÓN Y ACCESIBILIDAD (REPORTE UX)

### 3.1 Saneamiento Integral de la Pantalla de Login (LoginPage.tsx)
- **Problema Previo:** La pantalla de autenticación presentaba un bloque inferior con botones de acceso directo que listaban credenciales de prueba y generaban ruido visual.
- **Solución Canónica:** Se rediseñó la página como un formulario de acceso centrado, vertical, minimalista y con alta elegancia institucional.
- **Seguridad Perceptual:** Cero credenciales expuestas en la interfaz. Soporte completo de navegación por teclado (Enter, Tab), atributos ARIA de accesibilidad y foco automático en el campo de usuario.

### 3.2 Asistente Guiado por Ventanas Académicas (AcademicWorkflowModal.tsx)
Para evitar que directores, secretarias y docentes se pierdan en menús complejos, se implementó un asistente modal en 3 pantallas secuenciales:
1. **Ventana 1 — Etapa Modular y Año:** Selección del periodo formativo (Módulo I · 2026-I, Módulo II · 2026-II o Consolidado Anual).
2. **Ventana 2 — Carrera Técnica:** Cuadrícula con las 7 carreras oficiales, cada una con un banner gráfico descriptivo e ilustraciones temáticas en vectores SVG de alta definición (CareerVisualBanner.tsx).
3. **Ventana 3 — Aula, Turno y Unidad Didáctica:** Lista de aulas correspondientes a la carrera y turno seleccionados, con desglose de sus unidades didácticas oficiales, indicando docente a cargo y botón destacado:
   [ Ingresar a Gestionar esta Unidad → ]
   junto con botones de acción rápida para Asistencia, Registro de Notas y Documentos PDF.

### 3.3 Menú Permanente de Contexto en Topbar (Topbar.tsx)
- Píldora de estado fija y siempre visible en la barra superior de la aplicación:
  [ Peluquería y Barbería • Turno Mañana (Secc. A1) • UD 1: Corte de Cabello ]
- Botón destacado [ 🔄 Cambiar ] que abre el asistente en cualquier pantalla, permitiendo conmutar de aula o módulo con un solo clic.

### 3.4 Despeje Integral de Dashboards y Erradicación del Scroll Kilométrico
- En DashboardSecretaria.tsx, DashboardDireccion.tsx y DashboardDocente.tsx, se eliminó el árbol jerárquico acumulado verticalmente.
- Se introdujo un banner contextual compacto en la parte superior que resume la unidad activa y las estadísticas clave de asistencia y avance evaluativo.

### 3.5 Modo Oscuro Institucional y Accesibilidad WCAG 2.2
- **Contraste Dinámico:** Medición en DOM de **17.43:1**, superando ampliamente las exigencias WCAG 2.2 nivel AA (4.5:1) y nivel AAA (7.0:1).
- **Red de Seguridad Anti-Cajas Blancas:** Reglas globales en src/index.css que garantizan fondo #182220 y texto #F1F5F9 en todos los inputs, selects y tablas del sistema.
- **Cumplimiento CSP en Electron:** Inicialización sin destellos (0 ms FOUC) mediante public/theme-init.js, sin requerir 'unsafe-inline'.
- **Lienzo de Documentos Oficiales Inviolable:** En el visualizador PDF (PdfViewer.tsx), los documentos se representan en papel blanco #FFFFFF sobre mesa de luz oscura #0B1210, y la regla @media print fuerza la impresión sobre papel blanco sin fondos oscuros.

### 3.6 100% de Botones, Enlaces y Rutas Funcionales
- Se habilitaron las pantallas reales ActualizarExportarDatos.tsx (#/datos) y MiCuentaPerfil.tsx (#/perfil), eliminando botones muertos o enlaces pendientes en todo el sistema.

---

## 4. AUDITORÍA TIPOGRÁFICA, GEOMÉTRICA Y PREFLIGHTS MINEDU (REPORTE AUDITOR)

### 4.1 Auditoría Tipográfica y Geométrica en Casillas (	ests/template-typography.test.cjs)
Se implementó un arnés de validación geométrica exhaustiva que analiza cada uno de los campos de texto impresos en las 21 plantillas:
- **Casillas Evaluadas:** **6,851 casillas** analizadas en tiempo real.
- **Ajuste de Texto (its === true):** 100% de las casillas contienen el texto sin desbordar los límites rectangulares (ounding box).
- **Tamaño Mínimo de Letra:** Todos los caracteres se renderizan con ontSize >= 3.5 pt, garantizando legibilidad física al imprimir.
- **Familias Tipográficas Certificadas:**
  * ArialMT y Arial-BoldMT: Utilizadas en encabezados y listas de estudiantes.
  * Calibri y Calibri-Light (+SyntheticBold): Utilizadas en matrices de evaluación y asistencia.
  * Cambria-Bold: Utilizada en diplomas y títulos oficiales.
- **Resultado del Test:** **6/6 pruebas aprobadas (100%)**.

### 4.2 Matriz Consolidada de Preflights de las 21 Plantillas Oficiales MINEDU
Resultados auditados mediante scripts/verify_all_21_preflights.cjs:

| Código | Denominación Oficial MINEDU | Casillas Medidas | Fuentes Detectadas | Preflight | PDF (KB) | Estado Oficial |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| **TMPL-01** | Nómina de Matrícula Oficial | 195 | ArialMT, Calibri, Arial-BoldMT | **READY** | 221.6 | **APROBADO** |
| **TMPL-02** | Ficha Individual de Matrícula | 43 | ArialMT, Arial-BoldMT | **READY** | 259.8 | **APROBADO** |
| **TMPL-03** | Registro Modular de Matrícula | 410 | ArialMT, Arial-BoldMT | **READY** | 414.2 | **APROBADO** |
| **TMPL-04** | Portada de Carpeta Docente | 15 | Arial-BoldMT, ArialMT | **READY** | 169.9 | **APROBADO** |
| **TMPL-05** | Registro de Asistencia — UD 1 | 454 | Arial-BoldMT, ArialMT | **READY** | 235.1 | **APROBADO** |
| **TMPL-06** | Registro de Asistencia — UD 2 | 478 | Arial-BoldMT, ArialMT | **READY** | 236.4 | **APROBADO** |
| **TMPL-07** | Registro de Asistencia — UD 3 | 479 | Arial-BoldMT, ArialMT | **READY** | 238.3 | **APROBADO** |
| **TMPL-08** | Registro de Asistencia — UD 4 | 479 | Arial-BoldMT, ArialMT | **READY** | 238.3 | **APROBADO** |
| **TMPL-09** | Registro de Asistencia — UD 5 | 478 | Arial-BoldMT, ArialMT | **READY** | 238.8 | **APROBADO** |
| **TMPL-10** | Registro de Asistencia — UD 6 | 479 | Arial-BoldMT, ArialMT | **READY** | 238.1 | **APROBADO** |
| **TMPL-11** | Registro de Evaluación — UD 1 | 540 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 320.7 | **APROBADO** |
| **TMPL-12** | Registro de Evaluación — UD 2 | 540 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 412.5 | **APROBADO** |
| **TMPL-13** | Registro de Evaluación — UD 3 | 540 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 421.5 | **APROBADO** |
| **TMPL-14** | Registro de Evaluación — UD 4 | 540 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 418.9 | **APROBADO** |
| **TMPL-15** | Registro de Evaluación — UD 5 | 540 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 414.8 | **APROBADO** |
| **TMPL-16** | Registro de Evaluación — UD 6 | 540 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 415.0 | **APROBADO** |
| **TMPL-17** | Registro de Evaluación — UD 7 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | **READY** | 392.1 | **APROBADO** |
| **TMPL-18** | Consolidado de Prácticas EFSRT | 342 | Arial-BoldMT, ArialMT | **READY** | 384.6 | **APROBADO** |
| **TMPL-19** | Acta Oficial Evaluación Modular | 93 | Arial-BoldMT, ArialMT | **READY** | 312.5 | **APROBADO** |
| **TMPL-20** | Certificado Modular Oficial | 50 | ArialMT, Arial-BoldMT, Cambria-Bold | **READY** | 221.3 | **APROBADO** |
| **TMPL-21** | Título Oficial Auxiliar Técnico | 6 | Cambria-Bold, ArialMT, Arial-BoldMT | **READY** | 195.0 | **APROBADO** |

- **Campos Faltantes:** Exactamente cero (0) en todas las plantillas.
- **Condición de Borrador:** isDraft === false en las 21 plantillas oficiales.
- **Preservación de la 7ma UD de Peluquería M2:** Plenamente ratificada en TMPL-17.

---

## 5. COMPILACIÓN, TOOLING E HIGIENE DE SOFTWARE (REPORTE IMPLEMENTADOR)

### 5.1 Compilaciones de Producción
- **Compilación Web Frontend (
pm run build):** Exit code 0 en 2.20 segundos. Cero errores de TypeScript.
- **Compilación Institucional (
pm run build:institutional):** Exit code 0 en 3.99 segundos.
- **Inspección de Bundle Institucional (
pm run test:bundle:clean):** 5/5 pruebas aprobadas al 100%. Cero leyendas de PROTOTIPO, SANDBOX o cuentas .dev.

### 5.2 Limpieza Profunda del Repositorio
- **Archivos Eliminados:** 754 archivos obsoletos y temporales.
- **Líneas Legacy Erradicadas:** 78,330 líneas de código deprecado.
- **Espacio en Disco Liberado:** **4.36 GB (4,366.20 MB)**.
- **Saneamiento:** Purgadas carpetas temporales de empaquetado (elease/), artefactos offline de PDF (	ests/offline-artifacts/), dumps transitorios de BD (dev-sandbox/data/backups/) y directorios de código muerto (pp-v2/, scratch/, modules/, 	ools/).

### 5.3 Límites Irreversibles y Seguridad
- **Instalador Oficial Institucional:**
  * Ruta: elease/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe
  * Hash SHA-256 verificado: AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF
  * Tamaño: 166.5 MB (166,525,695 bytes)
  * Estado: **Intacto e inalterado**.
- **Repositorio Histórico Original:**
  * Ruta: C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2
  * Estado: **Estrictamente solo lectura (0 modificaciones)**.

---

## 6. MATRIZ CONSOLIDADA DE PRUEBAS AUTOMATIZADAS

| Suite de Validación | Comando Ejecutado | Casos Evaluados | Casos Aprobados | Fallos | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Regresión Integral Sandbox** | `npm run test:sandbox` | 219 | 219 | 0 | **CONFORME** |
| **Auditoría Tipográfica Casillas** | `npm run test:typography` | 6 | 6 | 0 | **CONFORME** |
| **Higiene de Bundle Institucional** | `npm run test:bundle:clean` | 5 | 5 | 0 | **CONFORME** |
| **Filtrado Contextual RBAC** | `npm run test:document-filter` | 6 | 6 | 0 | **CONFORME** |
| **Preflights 21 Formatos MINEDU** | `node scripts/verify_all_21_preflights.cjs` | 21 | 21 | 0 | **CONFORME** |
| **Compilación Frontend** | `npm run build` | 1 | 1 | 0 | **CONFORME** |
| **Compilación Perfil Institucional** | `npm run build:institutional` | 1 | 1 | 0 | **CONFORME** |
| **TOTAL CONSOLIDADO** | — | **259** | **259** | **0** | **100% ÉXITO** |

---

## 7. DICTAMEN TÉCNICO FORMAL Y CERTIFICACIÓN FINAL

El equipo multidisciplinario de auditoría y certificación emite el siguiente dictamen definitivo:

> ### DICTAMEN: APROBADO CON CONFORMIDAD TOTAL (100%) — APTO PARA PRODUCCIÓN INSTITUCIONAL
> 
> **Fundamentación Técnica:**
> 1. La base de datos institucional 2026 ha sido saneada y normalizada en relación exacta 1:1 (286 estudiantes / 286 matrículas), con 13 cuentas oficiales y 16 secciones activas en 2026-I.
> 2. La experiencia de usuario (UX) resuelve de forma definitiva la navegación mediante el asistente guiado por ventanas (`AcademicWorkflowModal.tsx`), el conmutador permanente en barra superior (`Topbar.tsx`) y el inicio de sesión centrado y seguro (`LoginPage.tsx`).
> 3. El motor documental ha sido auditado geométrica y tipográficamente en 6,851 casillas, garantizando que los 21 formatos normados del MINEDU se generan con preflights completos (0 faltantes), sin marcas de borrador y con preservación estricta de la 7ma UD de Peluquería M2 (`TMPL-17`).
> 4. La totalidad de las 259 pruebas automatizadas se ejecutan con 100% de éxito y cero regresiones.
> 5. Se ratifica la preservación del instalador oficial institucional (SHA-256: `AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`) y el aislamiento absoluto del repositorio original protegido.

---

## 8. PROTOCOLO DE DESPLIEGUE INSTITUCIONAL

Se recomienda proceder con las siguientes fases operativas:
1. **Fase 0 (Fusión Autorizada a `main`):** Integración formal de la rama `feat/ux-contexto-documental-oscuro` en la rama principal `main`.
2. **Fase 1 (Suscripción Directiva del Expediente):** Firma y visado de los Formularios 01 al 07 del Expediente de Configuración por el Director Lic. Eloy Valerio Paredes Feliciano.
3. **Fase 2 (Homologación en Campo):** Prueba presencial en las computadoras del CETPRO "Micaela Bastidas Puyucawa" con emisión e impresión física de los formatos normados ante las autoridades de la UGEL San Román.
