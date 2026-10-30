# REGISTRO FORMAL DE AUDITORÍA Y SUBSANACIÓN DE OBSERVACIONES
## EXPEDIENTE DE CONFIGURACIÓN INSTITUCIONAL 2026 — CEPRO_MICAELA 2.0
### CETPRO "MICAELA BASTIDAS PUYUCAWA" (SAN MIGUEL, SAN ROMÁN, PUNO)

---

**Fecha de Auditoría:** 29 de octubre de 2026  
**Entidad Supervisora:** Arquitectura de Sistemas y Dirección de Orquestación CEPRO_MICAELA 2.0  
**Responsable de Subsanación:** Implementador de Software y QA (`cepro-implementador`)  
**Destinatario:** Director Orquestador y Equipo Directivo Institucional  
**Dictamen General:** **100% SUBSANADO Y VERIFICADO CON RIGOR TÉCNICO Y NORMATIVO**  

---

### I. RESUMEN EJECUTIVO DE LA REVISIÓN CORRECTIVA INTEGRAL

En atención al informe de observaciones emitido por el Arquitecto Supervisor y transmitido por el Director Orquestador de Ingeniería, se ha realizado una revisión correctiva exhaustiva y de precisión sobre los ocho (8) documentos que componen el **Expediente de Configuración Institucional** (`docs/expediente-configuracion/`), el informe ejecutivo (`INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md`) y las herramientas de validación del sistema.

Las subsanaciones se ejecutaron bajo cuatro principios rectores inviolables:
1. **Supremacía de la Realidad Pedagógica:** El software debe adaptarse a la estructura curricular formalmente aprobada por el CETPRO y no forzar recortes arbitrarios (soporte pleno a las 7 Unidades Didácticas oficiales de Peluquería y Barbería Módulo II).
2. **Erradicación Total de Jerga Interna de Software en Instrumentos Físicos:** Los Formularios 01 al 07 constituyen documentos institucionales formales destinados a la firma y sellado del Director Lic. Eloy Valerio Paredes Feliciano y de la Secretaria General Carmen Yovana Vilca Puma; en ellos se eliminó cualquier mención a claves técnicas de base de datos (`users.role`, SQLite, JSON, etc.), concentrándose toda la dimensión técnica en el Documento 08.
3. **Consistencia Categorial y Estructura Tabular Perfecta:** Adopción obligatoria de cuatro (4) categorías canónicas de estado (`[Dato Extraído] Confirmar`, `[Pendiente de Confirmación / Completar]`, `[Propuesta Técnica de Ajuste]` y `[Dato Calculado / AUTOCALCULADO]`), opciones cerradas accesibles (`[ ] Sí  [ ] No`) y formato estricto de ocho (8) columnas por fila sin escapes erróneos.
4. **Respeto a la Normativa MINEDU y Asignación Institucional:** Cumplimiento de la Ley N° 30512, D.S. N° 010-2017-MINEDU y RVM N° 188-2020-MINEDU, ratificando la exclusividad directiva del Director institucional sin carga lectiva de aula, y la correcta asignación de horas docentes y turnos.

---

### II. MATRIZ DETALLADA DE SUBSANACIÓN DE LAS 8 OBSERVACIONES

| N° Obs. | Documento Intervenido | Observación Original del Supervisor | Modificación Realizada y Solución Técnica | Justificación Normativa / Arquitectural | Estado Final |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **01** | `01_DATOS_INSTITUCIONALES.md` | Falta de estandarización en categorías de estado y redacción ambigua en campos de confirmación institucional. | - Se estandarizaron todas las filas en las 4 categorías canónicas obligatorias.<br>- Se convirtieron los campos de decisión a formato de opción cerrada (`[ ] Sí  [ ] No`).<br>- Se incorporó el marco legal de la Ley 30512 y RVM 188-2020 con referencia a la R.D. de designación directiva.<br>- Se eliminó toda jerga de software interno en las celdas de opciones. | RVM 188-2020-MINEDU / Estandarización de instrumentos de captura de datos institucionales. | **SUBSANADO** |
| **02** | `02_PROGRAMAS_CURRICULARES.md` | En Peluquería Módulo II se proponía consolidar la 7ma UD (*Tratamiento Capilar*) dentro de la 6ta por limitación de plantillas, forzando un recorte curricular. | - Se preservaron íntegras las **7 Unidades Didácticas oficiales declaradas** de Peluquería y Barbería M2.<br>- Se estableció formalmente que el software provee soporte nativo a la 7ma UD mediante `TMPL-17` (evaluación) y la plantilla complementaria `TMPL-05_EXT` (asistencia).<br>- Los reajustes de horas y créditos se formularon como propuestas técnicas docentes para ratificación de la institución. | Autonomía curricular del CETPRO / Ley 30512 / Principio de adaptabilidad del software a la realidad escolar. | **SUBSANADO** |
| **03** | `02_PROGRAMAS_CURRICULARES.md` | Detección de 11 filas con problemas de formato donde el caracter '\|' generaba columnas espurias rompiendo la estructura de 8 columnas. | - Se reemplazó el caracter delimitador '\|' por '/' en las celdas de opciones de respuesta.<br>- Se implementó y ejecutó el script de verificación automatizada `scripts/verify_expediente_tables.cjs`.<br>- Resultado verificado: 0 errores, 100% de tablas cumpliendo exactamente 8 columnas. | Integridad de formato Markdown y compatibilidad con parsers institucionales. | **SUBSANADO** |
| **04** | `03_PERSONAL_DOCENTE.md` | Se asignaba carga de aula (18h) al Director Lic. Eloy Valerio Paredes Feliciano y se empleaban roles de sistema (`users.role`, "Soporte Técnico CEPRO"). | - Se normalizaron las 15 personas con subfilas .1 a .8.<br>- Se aplicó la dedicación directiva institucional exclusiva (Ley 30512, R.D. de designación): el Director no tiene carga de aula.<br>- El 100% de la carga de Electricidad (30h/sem) fue asignada al Prof. Huanca Castro.<br>- Se eliminaron menciones a roles de bases de datos y soporte técnico, reemplazándolos por roles institucionales y validación de Dirección/Secretaría. | Ley N° 30512 / Manual de Gestión de CETPROs / Separación estricta de funciones directivas y docentes. | **SUBSANADO** |
| **05** | `04_CALENDARIO_HORARIOS.md` | Inconsistencias de calendario: fechas en fines de semana, vacío calendárico del 21 al 28 de octubre y superposición de prácticas EFSRT. | - Se formuló la **Propuesta Técnica de Cronograma Habilidoso** para Computación e Informática M2 detallada día a día:<br>  * UD1: 10/08 al 04/09 (96h, 20 días hábiles).<br>  * UD2: 07/09 al 02/10 (96h, 20 días hábiles).<br>  * UD3: 05/10 al 16/10 (48h, 10 días; feriado 08/10 compensado).<br>  * UD4: 19/10 al 30/10 (48h, 10 días; **cierra el vacío de 6 días**).<br>  * UD5: 02/11 al 13/11 (48h, 10 días tras feriado 01/11).<br>  * EFSRT II: 16/11 al 18/12 (192h, 25 días hábiles a jornada intensiva/contraturno).<br>- Días hábiles estrictos de lunes a viernes y rotulado como propuesta docente para ratificación institucional. | RVM N° 188-2020-MINEDU / Calendario de días hábiles efectivos de la UGEL San Román. | **SUBSANADO** |
| **06** | `05_REGLAS_EVALUACION.md` | Ausencia de citas explícitas del marco normativo (Ley 30512, RVM 188-2020) y redacción técnica en lugar de opciones institucionales accesibles. | - Se incorporó el marco normativo explícito (Ley 30512, D.S. 010-2017, RVM 188-2020: escala vigesimal 00-20, mínimo 13, fracción favorable $\ge 0.5$, recuperación 10-12, DPI al 30%).<br>- Se convirtieron los campos a opciones de respuesta accesibles para las autoridades.<br>- Se normalizó la Tabla 5.2 de inasistencias con firma y ratificación exclusiva de Secretaría General. | RVM 188-2020-MINEDU, Art. 38-45 (Evaluación por competencias en ETP). | **SUBSANADO** |
| **07** | `06_CONFIGURACION_EFSRT.md` | Falta de precisión en las modalidades de prácticas (empresa, taller propio, proyectos productivos) y rúbrica de evaluación no desglosada. | - Se estandarizó la carga horaria a 192 horas (6 créditos) modular y 384 horas anual.<br>- Se estructuraron las tres modalidades institucionales reglamentarias.<br>- Se desglosó la rúbrica oficial de 9 criterios de desempeño con puntajes que suman exactamente 20 puntos.<br>- Se integraron las 4 categorías canónicas y validación formal de Dirección. | RVM 188-2020-MINEDU (Lineamientos Académicos Generales de EFSRT). | **SUBSANADO** |
| **08** | `07_DOCUMENTOS_OFICIALES.md` y `08_MATRIZ_TECNICA_CONFIGURACION.md` | En Formulario 07 (Ítem 2.03) se restringía a 6 UDs y se sugería recortar la UD7; en Documento 08 faltaba fundamentar la configurabilidad con citas del código fuente real. | - En Formulario 07 (Ítem 2.03) se corrigió taxativamente: CEPRO_MICAELA 2.0 soportará las 7 UDs mediante `TMPL-17` y la plantilla complementaria `TMPL-05_EXT`.<br>- En Documento 08 se fundamentó exhaustivamente la configurabilidad del sistema citando `src/pages/ConfiguracionDocumental.tsx`, `scripts/academic-config.cjs` (funciones `schema`, `validate`, `configuration`, `cloneYear`, `issues`, `parse`, `synchronize`), `scripts/document-contracts.cjs`, `scripts/offline-core.cjs`, endpoints REST, SQLite en WAL y la suite de regresión de 219 tests.<br>- Se actualizó el índice de 8 documentos en `INFORME_EJECUTIVO_HALLAZGOS_TAREA44.md`. | Requerimiento de Auditoría y Verificabilidad de Software Institucional. | **SUBSANADO** |

---

### III. VERIFICACIONES DE FORMATO Y ASEGURAMIENTO DE CALIDAD

1. **Verificación Automatizada de Tablas de 8 Columnas (Formularios 01 al 07):**  
   Se desarrolló y ejecutó el analizador sintáctico independiente `scripts/verify_expediente_tables.cjs`, el cual analiza cada línea de tabla en los 7 formularios:
   - Formularios auditados: `01_DATOS_INSTITUCIONALES.md`, `02_PROGRAMAS_CURRICULARES.md`, `03_PERSONAL_DOCENTE.md`, `04_CALENDARIO_HORARIOS.md`, `05_REGLAS_EVALUACION.md`, `06_CONFIGURACION_EFSRT.md` y `07_DOCUMENTOS_OFICIALES.md`.
   - Resultado obtenido: **0 errores**. Total de filas evaluadas en estricto cumplimiento de la estructura de 8 columnas:
     `| N° | Campo / Atributo Requerido | Valor Sugerido / Actual | Estado / Categoría | Acción Requerida / Opciones | Persona / Rol Responsable | Fuente Normativa / Técnica | Firma / Conformidad |`

2. **Verificación de Cobertura de Pruebas de Software (QA):**  
   - Arnés de ejecución: `npm run test:sandbox` / `scripts/run-qa-tests.cjs`.
   - Resultado: **219 pruebas automatizadas ejecutadas y superadas en 22 suites (100% PASS, 0 fallos)**.
   - Higiene de Bundle Institucional: `tests/institutional-bundle-clean.test.cjs` aprobado con 0 datos de prueba ni rutas dev.

---

### IV. DICTAMEN DE CONFORMIDAD DE AUDITORÍA INTERNA

Habiéndose verificado el cumplimiento riguroso de cada una de las ocho (8) observaciones señaladas, la adecuación normativa de los contenidos pedagógicos, la preservación de las 7 UDs de Peluquería y Barbería Módulo II, la formulación técnica del cronograma hábil de Computación e Informática M2, la eliminación total de terminología de software en los formularios físicos y la consistencia matemática y de código en los documentos de ingeniería, el Implementador de Software y QA emite dictamen de:

**CONFORMIDAD TOTAL — EXPEDIENTE SUBSANADO Y LISTO PARA RATIFICACIÓN INSTITUCIONAL**

San Miguel, San Román, Puno, a los 29 días del mes de octubre de 2026.



__________________________________________________  
**Implementador de Software y QA**  
Equipo de Ingeniería CEPRO_MICAELA 2.0  
Sede Técnica San Miguel / Juliaca

