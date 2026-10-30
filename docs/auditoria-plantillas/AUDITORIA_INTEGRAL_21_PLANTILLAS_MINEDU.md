# AUDITORÍA INTEGRAL DE LAS 21 PLANTILLAS OFICIALES MINEDU
## CEPRO_MICAELA 2.0 — MAPA DE RELLENADO, TRAZABILIDAD Y PREFLIGHT DOCUMENTAL

**Fecha de Auditoría:** 30 de Octubre de 2026  
**Entidad Rectora:** Ministerio de Educación del Perú (MINEDU) / DRE Puno / UGEL San Román  
**Institución:** CETPRO "Micaela Bastidas Puyucawa" (San Miguel, San Román, Puno)  
**Marco Legal:** Ley N° 30512, D.S. N° 010-2017-MINEDU, R.V.M. N° 188-2020-MINEDU  
**Estado del Sistema:** Release 2.0 Homologado con persistencia SQLite WAL y Motor PDF de Alta Fidelidad  

---

## 1. RESUMEN EJECUTIVO Y ARQUITECTURA DE EMISIÓN DOCUMENTAL

La plataforma **CEPRO_MICAELA 2.0** cuenta con un motor documental de precisión milimétrica capaz de emitir los **veintiún (21) formatos oficiales normados por el MINEDU**, respetando estrictamente los formatos PDF físicos originales de la DRE Puno / UGEL San Román.

### 1.1 Principios de la Emisión Oficial
1. **Lienzo Oficial Inviolable:** Todos los documentos se imprimen sobre la plantilla PDF oficial en fondo blanco (`#FFFFFF`), manteniendo márgenes, sellos de agua institucionales y líneas tabulares de la UGEL.
2. **Validación Preflight Determinista:** Ningún documento puede tramitarse o emitirse con carácter oficial si presenta parámetros vacíos (`status: MISSING`). Si faltan datos, el motor estampa preventivamente la marca física `BORRADOR - NO OFICIAL` para impedir la presentación de actas incompletas.
3. **Cero Cálculos Manuales:** Los promedios vigesimales, porcentajes de inasistencia, sumatorias de créditos, totales por condición de matrícula (G/P/B) y folios se calculan automáticamente por el backend, erradicando errores aritméticos humanos.
4. **Segregación Estricta de Roles (RBAC):** Cada dato tiene un único responsable institucional facultado para llenarlo o modificarlo (`DIRECTOR`, `SECRETARIA`, `DOCENTE`).

---

## 2. MATRIZ GENERAL DE LAS 21 PLANTILLAS OFICIALES MINEDU

| Código | Denominación Oficial MINEDU | Contexto | Formato / Págs. | Capacidad Fís. | Rol que lo Tramita | Rol que lo Firma |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **TMPL-01** | Nómina de Matrícula Oficial | Aula / Grupo | A4 Vertical (1 pág.) | 30 estudiantes | Secretaría | Director / Secretaría |
| **TMPL-02** | Ficha Individual de Matrícula | Estudiante | A4 Vertical (1 pág.) | 8 UDs + 1 subsanación | Secretaría | Estudiante / Secretaría |
| **TMPL-03** | Registro Modular de Matrícula | Aula / Grupo | A4 Horizontal (1 pág.) | 20 estudiantes | Secretaría | Secretaría General |
| **TMPL-04** | Portada de Carpeta Docente | Módulo / Aula | A4 Vertical (1 pág.) | 1 carátula | Docente | Docente Titular |
| **TMPL-05** | Registro de Asistencia — UD 1 | Unidad (UD1) | A3 Horizontal (1 pág.) | 40 est. / 44 sesiones | Docente | Docente de Especialidad |
| **TMPL-06** | Registro de Asistencia — UD 2 | Unidad (UD2) | A3 Horizontal (1 pág.) | 40 est. / 35 sesiones | Docente | Docente de Especialidad |
| **TMPL-07** | Registro de Asistencia — UD 3 | Unidad (UD3) | A3 Horizontal (1 pág.) | 40 est. / 38 sesiones | Docente | Docente de Especialidad |
| **TMPL-08** | Registro de Asistencia — UD 4 | Unidad (UD4) | A3 Horizontal (1 pág.) | 40 est. / 44 sesiones | Docente | Docente de Especialidad |
| **TMPL-09** | Registro de Asistencia — UD 5 | Unidad (UD5) | A3 Horizontal (1 pág.) | 40 est. / 44 sesiones | Docente | Docente de Especialidad |
| **TMPL-10** | Registro de Asistencia — UD 6 | Unidad (UD6) | A3 Horizontal (1 pág.) | 40 est. / 40 sesiones | Docente | Docente de Especialidad |
| **TMPL-11** | Registro de Evaluación — UD 1 | Unidad (UD1) | A3 Horizontal (1 pág.) | 47 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-12** | Registro de Evaluación — UD 2 | Unidad (UD2) | A3 Horizontal (1 pág.) | 40 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-13** | Registro de Evaluación — UD 3 | Unidad (UD3) | A3 Horizontal (1 pág.) | 40 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-14** | Registro de Evaluación — UD 4 | Unidad (UD4) | A3 Horizontal (1 pág.) | 40 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-15** | Registro de Evaluación — UD 5 | Unidad (UD5) | A3 Horizontal (1 pág.) | 40 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-16** | Registro de Evaluación — UD 6 | Unidad (UD6) | A3 Horizontal (1 pág.) | 40 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-17** | Registro de Evaluación — UD 7 | Unidad (UD7) | A3 Horizontal (1 pág.) | 40 est. / 5 Indicadores | Docente | Docente de Especialidad |
| **TMPL-18** | Consolidado de Prácticas EFSRT | Aula / EFSRT | A4 Vertical (1 pág.) | 40 est. / 9 criterios | Supervisor EFSRT | Supervisor / Director |
| **TMPL-19** | Acta Oficial de Evaluación Modular | Módulo / Cierre | A3 Vertical (2 págs.) | 40 est. (20 p/pág.) | Secretaría | Director / Docente |
| **TMPL-20** | Certificado Modular Oficial | Estudiante | A4 Vertical (2 págs.) | 8 UDs curriculares | Secretaría | Director / DRE Puno |
| **TMPL-21** | Título Oficial de Auxiliar Técnico | Egresado | A4 Vertical (2 págs.) | Formato de Título | Secretaría | Director General |

> **Nota Técnica sobre UD7:** Peluquería y Barbería M2 cuenta formalmente con 7 Unidades Didácticas. En evaluación se utiliza **TMPL-17**, y en asistencia se utiliza la variante extendida **TMPL-05_EXT (UD7)**, garantizando que ninguna unidad curricular sea mutilada.

---

## 3. AUDITORÍA DETALLADA: ANATOMÍA Y GUÍA DE LLENADO DE CADA PLANTILLA

A continuación se detalla campo por campo qué contiene cada documento, qué regla lo rige y **exactamente en qué pantalla y formulario de la plataforma debe rellenarse**.

---

### FORMATO 01: NÓMINA DE MATRÍCULA OFICIAL (`TMPL-01`)
*Documento legal público que acredita la relación de estudiantes matriculados en el aula al inicio del periodo lectivo.*

#### A. Anatomía del Documento
1. **Cabecera Institucional:** Nombre del CETPRO, Código Modular, DRE Puno, UGEL San Román, Región, Departamento, Provincia, Distrito, Dirección, Resoluciones de Autorización y Conversión.
2. **Datos del Módulo:** Denominación del Programa, Nombre del Módulo, Ciclo, Turno, Sección, Fecha de Inicio, Fecha de Fin, Periodo de Clase.
3. **Cuerpo Tabular (Estudiantes):**
   - N° correlativo (01 al 30).
   - Código de Matrícula (`MAT-2026-XXX`).
   - Apellidos y Nombres completos del estudiante.
   - Sexo (M / F) y Fecha de Nacimiento (DD/MM/AAAA).
   - Condición de matrícula: `G` (Gratuita), `P` (Pagante), `B` (Beca).
   - Total de Unidades Didácticas matriculadas y Total de Créditos.
4. **Resumen Estadístico y Firmas:**
   - Cuadro resumen de matrícula por sexo y gratuidad.
   - Fecha de emisión y firmas de Secretaría General y Dirección.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Datos del CETPRO y Resoluciones** | `#/configuracion-academica` | Pestaña 1: Institución y calendario | `DIRECTOR` | `document_settings` (`scope: institution`) |
| **Programa y Módulo** | `#/configuracion-academica` | Pestaña 3: Programas y planes | `DIRECTOR` | `curriculum` / `modules` |
| **Ciclo, Turno, Sección, Fechas** | `#/grupos` | Formulario de Aula / Grupo | `SECRETARIA` / `DIRECTOR` | `groups` |
| **Ficha del Estudiante (DNI, Nombres, Sexo, Nac.)** | `#/estudiantes` | Formulario "Nuevo Estudiante" | `SECRETARIA` | `students` |
| **Código y Condición (G/P/B)** | `#/matriculas` | Modal "Matricular Alumno" | `SECRETARIA` | `enrollments` / `document_settings` |
| **Totales y Resumen Estadístico** | *Ninguna* | **AUTOCALCULADO POR EL BACKEND** | *Sistema* | Cálculo dinámico en `offline-pdf.cjs` |

---

### FORMATO 02: FICHA INDIVIDUAL DE MATRÍCULA (`TMPL-02`)
*Expediente académico individual de ingreso del estudiante al módulo formativo.*

#### A. Anatomía del Documento
1. **Encabezado:** DRE Puno, UGEL San Román, Código Modular, CETPRO Micaela Bastidas, Tipo de Gestión (Pública).
2. **Identificación del Estudiante:** Apellidos y nombres, DNI, Fecha de nacimiento, Domicilio, Teléfono de contacto.
3. **Detalle Curricular Matriculado:**
   - Tabla de unidades didácticas del módulo (hasta 8 UDs).
   - Horas pedagógicas y créditos oficiales de cada unidad.
   - Condición de matrícula del alumno.
   - Espacio para unidad de subsanación si el estudiante arrastra recuperación anterior.
4. **Compromiso y Firmas:** Firma del Estudiante matriculado y sello de Secretaría.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Ficha Personal y DNI** | `#/estudiantes` | Editar Ficha de Estudiante | `SECRETARIA` | `students` |
| **Unidades, Horas y Créditos** | `#/configuracion-academica` | Pestaña 3: Currículo (Unidades) | `DIRECTOR` | `curriculum.unitsJson` |
| **Unidad de Subsanación (si aplica)** | `#/configuracion-documental` | Ámbito `enrollment` | `SECRETARIA` | `document_settings` (`subsanacionUnit`) |

---

### FORMATO 03: REGISTRO MODULAR DE MATRÍCULA (`TMPL-03`)
*Padrón de control modular por aula que consolida la nómina de inscritos.*

#### A. Anatomía del Documento
- Cabecera: DRE, UGEL, CETPRO, Código Modular, Resolución del Programa, Ciclo y Nombre del Módulo.
- Matriz de Alumnos (20 filas): Número de orden, Tipo y Número de Documento (DNI/CE), Apellido Paterno, Apellido Materno, Nombres completos, Sexo, Fecha de Nacimiento.

#### B. ¿Dónde se rellena en el Sistema?
- **Padrón de Estudiantes:** Pantalla `#/estudiantes`. Secretaría debe asegurar que los campos **Apellido Paterno**, **Apellido Materno** y **Nombres** estén registrados sin abreviaturas.
- **Resolución del Programa:** Pantalla `#/configuracion-documental`, ámbito `program`, campo `resolucionPrograma`.

---

### FORMATO 04: PORTADA DE CARPETA DOCENTE (`TMPL-04`)
*Carátula reglamentaria de la carpeta pedagógica, registro de asistencia y evaluación del docente.*

#### A. Anatomía del Documento
1. **Membrete Oficial:** Ministerio de Educación — DRE Puno — UGEL San Román.
2. **Denominación Institucional:** CETPRO "Micaela Bastidas Puyucawa".
3. **Identificación Pedagógica:**
   - Programa de Estudios (ej. *Computación e Informática* o *Peluquería y Barbería*).
   - Módulo Formativo (ej. *Ofimática y Gestión de Documentos Digitales*).
   - Ciclo, Turno (Mañana/Tarde/Noche) y Sección (A/B).
   - Total de Horas del Módulo (ej. 528 h) y Total de Créditos (ej. 22 cr).
   - Fecha de Inicio y Fecha de Término de las clases.
   - Nombre completo del Docente Responsable de la especialidad.
   - Año lectivo (2026).

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Docente Asignado al Aula** | `#/grupos` | Asignación de Docente en Grupo | `SECRETARIA` / `DIRECTOR` | `groups.teacherName` / `assignments` |
| **Horas y Créditos del Módulo** | `#/configuracion-academica` | Pestaña 3: Programas y planes | `DIRECTOR` | `curriculum.hours` / `credits` |
| **Fechas de Inicio y Término** | `#/configuracion-academica` | Pestaña 2: Periodos (2026-I / 2026-II) | `DIRECTOR` | `academic_period` |

---

### FORMATOS 05 AL 10 (Y UD7): REGISTROS DE ASISTENCIA DIARIA (`TMPL-05` A `TMPL-10`)
*Control cronológico y diario de asistencia de los estudiantes en cada unidad didáctica.*

#### A. Anatomía del Documento (A3 Horizontal)
1. **Encabezado:** Programa, Módulo, Nombre exacto de la Unidad Didáctica, Ciclo, Turno, Sección, Docente.
2. **Cuerpo Calendario (Días de Clase):**
   - Calendario generado de lunes a viernes en el rango exacto de la unidad (resuelto por `AcademicCalendarEngine`, omitiendo feriados institucionales como el 2 y 10 de noviembre).
   - Bloques mensuales divididos con encabezados de mes (ej. MARZO, ABRIL, MAYO).
   - Iniciales de los días (Lu, Ma, Mi, Ju, Vi) y números de día.
3. **Cuadro de Marcas por Estudiante (hasta 40 alumnos):**
   - `.` o `P`: Asistencia normal (Presente).
   - `T`: Tardanza justificada.
   - `F`: Inasistencia injustificada (Falta).
   - `J`: Inasistencia justificada con documentación.
4. **Cuadro Resumen y Porcentajes (Derecha):**
   - Total Asistencias ($P + T$).
   - Total Inasistencias ($F + J$).
   - Porcentaje de Inasistencia: $\frac{\text{Inasistencias}}{\text{Total Sesiones}} \times 100$. (Si supera el 30%, el sistema alerta situación de desaprobación por inasistencia DPI).
5. **Pie de Página:** Firma del Docente de la Especialidad.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Fechas de la Unidad Didáctica** | `#/configuracion-documental` | Ámbito `unitCurriculum` (Fechas de UD) | `DIRECTOR` / `DOCENTE` | `document_settings` (`unitCurriculum`) |
| **Marcas de Asistencia Diaria** | `#/asistencia` | Matriz interactiva de asistencia | `DOCENTE` | `attendance` (`records.db`) |
| **Reglas de Inasistencia (P, T, F, J)** | `#/configuracion-documental` | Ámbito `module` (`presenceStates`, etc.) | `DIRECTOR` | `document_settings` (`module`) |
| **Totales y Porcentajes** | *Ninguna* | **AUTOCALCULADO POR EL BACKEND** | *Sistema* | Función de balance en `offline-pdf.cjs` |

---

### FORMATOS 11 AL 17: REGISTROS DE EVALUACIÓN DE CAPACIDADES (`TMPL-11` A `TMPL-17`)
*Matriz vigesimal de evaluación por competencias y criterios pedagógicos de cada unidad didáctica.*

#### A. Anatomía del Documento (A3 Horizontal)
1. **Cabecera Pedagógica:**
   - Nombre de la Unidad Didáctica (ej. *Microsoft Excel Avanzado*).
   - **Capacidad Terminal de la Unidad:** Redacción formal de la capacidad formativa evaluada.
   - **5 Indicadores de Logro:** Redacción exacta de los criterios de evaluación (IL 01, IL 02, IL 03, IL 04, IL 05).
2. **Matriz de Calificaciones Vigesimales (0 a 20):**
   - Por cada Indicador de Logro (IL 01 al IL 05):
     * Tres columnas de instrumentos de evaluación formativa: **IA1**, **IA2**, **IA3**.
     * Columna del promedio del Indicador de Logro.
   - Columna de Evaluación de Recuperación (**R**).
   - Columna del **Logro de la Unidad Didáctica (`RESULTADO_UD`)**.
3. **Pie y Estadísticas:**
   - Total evaluados, aprobados ($\ge 13$), desaprobados ($< 13$) y retirados.
   - Firma del Docente de la Especialidad.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Nombre, Capacidad y 5 Indicadores (IL1..IL5)** | `#/configuracion-documental` | Ámbito `unit` ("Preparar unidad") | `DOCENTE` | `document_settings` (`scope: unit`) |
| **Calificaciones IA1, IA2, IA3 y Recuperación** | `#/evaluacion` | Matriz de Registro de Evaluaciones | `DOCENTE` | `grades` (`records.db`) |
| **Promedios de Indicador y Resultado UD** | *Ninguna* | **AUTOCALCULADO POR EL BACKEND** | *Sistema* | Algoritmo vigesimal oficial |

---

### FORMATO 18: CONSOLIDADO DE PRÁCTICAS PRE-PROFESIONALES EFSRT (`TMPL-18`)
*Rúbrica de evaluación de Experiencias Formativas en Situaciones Reales de Trabajo (192 horas).*

#### A. Anatomía del Documento (A4 Vertical)
1. **Encabezado:** CETPRO Micaela Bastidas, Programa, Módulo, Horas EFSRT (192 h), Fechas de inicio y término de prácticas, Docente supervisor.
2. **Tabla de Estudiantes:**
   - Código de matrícula y nombres completos del estudiante.
   - **Razón Social de la Empresa o Institución:** Nombre donde realizó las prácticas.
   - **Dirección de la Empresa:** Ubicación física del centro de prácticas.
   - **Rúbrica de 9 Criterios Oficiales (Calificación hasta 20 puntos):**
     * Criterio 1: Puntualidad y asistencia (máximo 3 pts).
     * Criterio 2: Responsabilidad y cumplimiento (máximo 2 pts).
     * Criterio 3: Trabajo en equipo (máximo 2 pts).
     * Criterio 4: Habilidad y destreza técnica (máximo 3 pts).
     * Criterio 5: Calidad del trabajo ejecutado (máximo 3 pts).
     * Criterio 6: Aplicación de normas de seguridad (máximo 3 pts).
     * Criterio 7: Iniciativa y creatividad (máximo 1 pto).
     * Criterio 8: Relaciones interpersonales (máximo 2 pts).
     * Criterio 9: Conservación de equipos y herramientas (máximo 1 pto).
   - **Calificación Final EFSRT:** Suma vigesimal (0 a 20 pts).
3. **Firmas:** Supervisor de EFSRT y Dirección del CETPRO.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Fechas y Horas de EFSRT** | `#/configuracion-academica` | Pestaña 3: Planes curriculares (EFSRT) | `DIRECTOR` | `curriculum` (`efsrtHours`, fechas) |
| **Empresa, Dirección y 9 Criterios** | `#/configuracion-documental` | Ámbito `practice` (EFSRT) | `DOCENTE` / `DIRECTOR` | `document_settings` (`scope: practice`) |
| **Calificación Final EFSRT** | `#/configuracion-documental` | Ámbito `practice` (`efsrtFinalGrade`) | `DOCENTE` / `DIRECTOR` | `document_settings` (`practice`) |

---

### FORMATO 19: ACTA OFICIAL DE EVALUACIÓN MODULAR (`TMPL-19`)
*Documento público supremo de evaluación y acreditación ante la UGEL San Román.*

#### A. Anatomía del Documento (A3 Vertical, 2 Páginas)
1. **Página 1 — Nómina y Calificaciones Consolidadas:**
   - Cabecera oficial: DRE Puno, UGEL San Román, Código Modular, Resoluciones RD, Ciclo, Turno, Sección.
   - Listado de 40 estudiantes (20 por página si es multipágina).
   - Documento de Identidad (DNI) y Nombres completos.
   - **Calificación de cada Unidad Didáctica (UD1, UD2, UD3, UD4, UD5, UD6, UD7).**
   - **Calificación de Prácticas EFSRT.**
   - **Promedio Modular:** Promedio ponderado por créditos.
   - **Resultado:** Aprobado / Desaprobado.
2. **Página 2 — Resumen Estadístico y Firmas Legales:**
   - Cuadro consolidado de egreso: Matriculados, Evaluados, Aprobados, Desaprobados, Retirados.
   - Cuadro de porcentajes de rendimiento académico.
   - Firmas y sellos oficiales: Docente de Especialidad, Secretaría Académica y Director General.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Notas de las UDs** | `#/evaluacion` | Generadas desde `RESULTADO_UD` | `DOCENTE` | `grades` |
| **Nota de EFSRT** | `#/configuracion-documental` | Ámbito `practice` (`efsrtFinalGrade`) | `DOCENTE` / `DIRECTOR` | `document_settings` |
| **Cierre Modular y Observaciones** | `#/configuracion-documental` | Ámbito `closure` (`observations`) | `DIRECTOR` | `document_settings` (`closure`) |
| **Promedios Ponderados y Cuadro Resumen** | *Ninguna* | **AUTOCALCULADO POR EL BACKEND** | *Sistema* | Cómputo ponderado automático |

---

### FORMATO 20: CERTIFICADO MODULAR OFICIAL (`TMPL-20`)
*Certificado oficial de valor laboral expedido al culminar satisfactoriamente el módulo.*

#### A. Anatomía del Documento (A4 Vertical, 2 Páginas)
1. **Página 1 (Anverso):**
   - Texto ceremonial oficial del MINEDU que certifica que el estudiante ha cursado y aprobado el Módulo Formativo.
   - Nombres y apellidos completos del estudiante y número de DNI.
   - Programa de estudios, ciclo y duración en horas y créditos.
   - Fecha oficial de emisión.
2. **Página 2 (Reverso — Certificado de Estudios):**
   - Tabla detallada de todas las unidades didácticas del módulo.
   - Capacidades específicas desarrolladas en cada unidad.
   - Horas y créditos de cada unidad.
   - Calificación final vigesimal en número y letras.
   - **Datos de Inscripción Institucional:**
     * Libro de Registro N°.
     * Folio N°.
     * Número correlativo de Registro.
     * Fecha de Registro en el CETPRO.
     * Código de registro institucional.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Libro, Folio, Número y Fecha de Registro** | `#/configuracion-documental` | Ámbito `registry` (Por matrícula) | `DIRECTOR` | `document_settings` (`scope: registry`) |
| **Fecha de Expedición** | `#/configuracion-documental` | Ámbito `enrollment` (`emissionDate`) | `SECRETARIA` / `DIRECTOR` | `document_settings` (`enrollment`) |
| **Texto de Capacidad por Unidad** | `#/configuracion-documental` | Ámbito `unit` (`capacity`) | `DOCENTE` | `document_settings` (`unit`) |
| **Notas Vigesimales en Letras y Números** | *Ninguna* | **AUTOCALCULADO POR EL BACKEND** | *Sistema* | Conversión numérica a texto |

---

### FORMATO 21: TÍTULO OFICIAL DE AUXILIAR TÉCNICO (`TMPL-21`)
*Diploma oficial de titulación a nombre de la Nación emitido por el CETPRO.*

#### A. Anatomía del Documento (A4 Vertical, 2 Páginas)
- Nombres completos del graduado (con validación de identidad RENIEC).
- **Denominación Oficial del Título:** Texto exacto autorizado por el MINEDU (ej. *AUXILIAR TÉCNICO EN COMPUTACIÓN E INFORMÁTICA* o *AUXILIAR TÉCNICO EN PELUQUERÍA Y BARBERÍA*).
- Fecha de expedición del título.
- Código de Registro del Título y Asiento Registral en el libro oficial de la institución / UGEL.
- Firma y posfirma del Director General del CETPRO.

#### B. ¿Dónde se rellena en el Sistema?
| Sección / Dato | Pantalla en UI | Pestaña / Formulario | Rol Responsable | Persistencia SQLite |
| :--- | :--- | :--- | :--- | :--- |
| **Denominación Oficial del Título** | `#/configuracion-documental` | Ámbito `program` (`officialTitleText`) | `DIRECTOR` | `document_settings` (`program`) |
| **Código de Registro y Asiento** | `#/configuracion-documental` | Ámbito `registry` (`registryAsiento`, `registerCode`) | `DIRECTOR` | `document_settings` (`registry`) |
| **Fecha de Emisión del Título** | `#/configuracion-documental` | Ámbito `enrollment` (`emissionDate`) | `DIRECTOR` | `document_settings` (`enrollment`) |

---

## 4. GUÍA PRÁCTICA DE RELLENADO POR ROL INSTITUCIONAL

Para evitar que los documentos muestren advertencias preflight o la marca física `BORRADOR - NO OFICIAL`, cada usuario institucional debe seguir esta secuencia operativa:

```
[1. DIRECTOR] ──> Configura Año Lectivo, Institución, Resoluciones y Currículo (#/configuracion-academica)
      │
[2. SECRETARÍA] ──> Registra Padrón de Alumnos (#/estudiantes) y realiza Matrícula G/P/B (#/matriculas)
      │
[3. SECRETARÍA / DIR] ──> Asigna Aulas, Turnos, Secciones y Docentes Titulares (#/grupos)
      │
[4. DOCENTE] ──> Redacta Capacidades y los 5 Indicadores IL1..IL5 (#/configuracion-documental)
      │
[5. DOCENTE] ──> Registra Asistencia (#/asistencia) y Notas Vigesimales (#/evaluacion)
      │
[6. DOCENTE] ──> Verifica Preflight al 100% y genera Entrega Oficial (#/entregas-revision)
      │
[7. SECRETARÍA & DIR] ──> Inspeccionan PDF Custodial, aprueban entrega y asientan Libros/Folios
```

---

## 5. REGLAS TÉCNICAS DE PREFLIGHT Y MARCAS DE AGUA

1. **Estado `BORRADOR - NO OFICIAL`:**
   - **Causa:** El documento tiene uno o más campos obligatorios no registrados (`preflight.complete === false`).
   - **Solución:** Entrar a la pantalla indicada en el panel de preflight (ej. *Configuración Documental*, *Registro de Evaluaciones*, o *Estudiantes*) y guardar el valor pendiente.
2. **Estado `DEMOSTRACIÓN - SIN VALIDEZ OFICIAL`:**
   - **Causa:** El switch de modo demostración (`demoMode`) está activo en la sesión.
   - **Solución:** Desactivar el modo demo para que el sistema utilice exclusivamente la base de datos real del año lectivo.
3. **Estado `COMPLETO / OFICIAL`:**
   - Se activa cuando el 100% de los requisitos del contrato han sido verificados. El PDF se emite completamente limpio, sin marcas de agua, listo para impresión en papel bond oficial y visación ante la UGEL San Román.
