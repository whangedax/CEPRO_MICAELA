# DOCUMENT-MASTER-AUDIT-01 — auditoría física y semántica de los 21 PDF

Fecha: 2026-09-15. Alcance **solo lectura de fuentes y documentación**. Cada PDF se abrió como PDF, se extrajeron texto/vectores, se calculó SHA-256 y se renderizaron/inspeccionaron visualmente **sus 24 páginas físicas** a 72 dpi. Script de inspección reproducible: `node scripts/audit_document_master_sources.js` (`--id=NN` para el texto de una fuente). Ruta base: `sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/`. Ninguno tiene AcroForm; son formularios **planos** con rótulos impresos y espacios visuales, no campos interactivos. Los originales no se alteraron.

## Inventario canónico

Dimensiones en puntos PDF (redondeadas); A4 ≈ 595×842 o 842×595, A3 ≈ 842×1191 o 1191×842. `V/T/F` = variable, tabla, firma física (línea/espacio, **no** firma capturada); todos tienen texto fijo. Capacidad es **fila física**, no autorización para completar datos ni paginar.

| ID | Archivo | Función / contexto principal | SHA-256 | Pág.; tamaño/orientación | Cap.; V/T/F |
|---|---|---|---|---|---|
| 01 | `01_NOMINA_DE_MATRICULA.pdf` | Nómina / GROUP | `938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2` | 1; 595×842 vertical | 30; S/S/S |
| 02 | `02_FICHA_DE_MATRICULA.pdf` | Ficha / ENROLLMENT | `63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914` | 1; 842×595 horizontal | 8 UD + 1 subsanación; S/S/S |
| 03 | `03_REGISTRO_DE_MATRICULA_MODULAR.pdf` | Registro / GROUP | `96989f5ada138388826079a5741b70598fc43b61b2bed084b92f70c17fcd813a` | 1; 842×1191 vertical | **REVIEW_REQUIRED**; S/S/N |
| 04 | `04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf` | Portada / GROUP+MODULE | `1661ba65e85219c6fcaffaa6966328da80725758a2f6dc3a0ee2e3374df6042f` | 1; 595×842 vertical | —; S/N/N |
| 05 | `05_ASISTENCIA_UD1.pdf` | Asistencia UD1 / ATTENDANCE+GROUP | `e3e120d1cab57fce6b0e27a85b082e262c13c12e56d25ef9807b6f45ca6952ef` | 1; 1191×842 horizontal | 40; S/S/S |
| 06 | `06_ASISTENCIA_UD2.pdf` | Asistencia UD2 / ATTENDANCE+GROUP | `88c2055535a18ea66d98645e0dca471d99666e1c1e9190b56ad704aae242a67c` | 1; 1191×842 horizontal | 40; S/S/S |
| 07 | `07_ASISTENCIA_UD3.pdf` | Asistencia UD3 / ATTENDANCE+GROUP | `2e6559d9321834f6cd0d7863eb4fed9e8450edda3f1f73ee90bbfba19b1ec5a9` | 1; 1191×842 horizontal | 40; S/S/S |
| 08 | `08_ASISTENCIA_UD4.pdf` | Asistencia UD4 / ATTENDANCE+GROUP | `1747658aa32febf91936e75304981439b0ea63fd20b910ca3a3a94917ec1098a` | 1; 1191×842 horizontal | 40; S/S/S |
| 09 | `09_ASISTENCIA_UD5.pdf` | Asistencia UD5 / ATTENDANCE+GROUP | `d13c650d159ce035c5a71771257c267daab1d43475301d336e070750f0b9d518` | 1; 1191×842 horizontal | 40; S/S/S |
| 10 | `10_ASISTENCIA_UD6.pdf` | Asistencia UD6 / ATTENDANCE+GROUP | `7fc1d8d414e7c321d63901c53dfd693dade7b2a0d47a1fbf8b18514a30a8ce14` | 1; 1191×842 horizontal | 40; S/S/S |
| 11 | `11_EVALUACION_IL_UD1.pdf` | Evaluación IL/UD1 / EVALUATION+GROUP | `74c6b099278301b03f1f712164d95585611ae127e795aff30a0defd8ec8a9d9a` | 1; 842×1191 vertical | 47; S/S/S |
| 12 | `12_EVALUACION_UD2.pdf` | Evaluación UD2 / EVALUATION+GROUP | `b71d1979114a6deea0145e17bad67ac87aa2f7c0ce6cd3a512283993db9cb846` | 1; 842×1191 vertical | 40; S/S/N |
| 13 | `13_EVALUACION_UD3.pdf` | Evaluación UD3 / EVALUATION+GROUP | `c7f31aebc42d6599bc4f181f2f380caf59a6c5b635eb6cfcd204514c21d81409` | 1; 842×1191 vertical | 40; S/S/N |
| 14 | `14_EVALUACION_UD4.pdf` | Evaluación UD4 / EVALUATION+GROUP | `185d9f893340fca879670af6c0dbd2ec5ac2a13e31f1b7bd5b05f98a1389e1ff` | 1; 842×1191 vertical | 40; S/S/N |
| 15 | `15_EVALUACION_UD5.pdf` | Evaluación UD5 / EVALUATION+GROUP | `4207bd2f1a4490fd8d8fa9a70feb30189da77a0f230300faeb84ab60bfc7ce02` | 1; 842×1191 vertical | 40; S/S/N |
| 16 | `16_EVALUACION_UD6.pdf` | Evaluación UD6 / EVALUATION+GROUP | `797ef74ec470546eb9b6117b907b51268fd40a33269193b3746edd385e6c5847` | 1; 842×1191 vertical | 40; S/S/N |
| 17 | `17_EVALUACION_UD7.pdf` | Evaluación UD7 / EVALUATION+GROUP | `e398b64eb744d10f1ec48c699a068cb47ba8d23f915cdf73d4c137ee6d5c128e` | 1; 842×1191 vertical | 40; S/S/N |
| 18 | `18_CONSOLIDADO_EFSRT.pdf` | Consolidado / EFSRT+GROUP | `676ed06768bd7a063f72c915511b1b2787faae02ad1ed0b7b14f1e14c4c5ed08` | 1; 842×1191 vertical | 40; S/S/N |
| 19 | `19_ACTA_DE_EVALUACION_MODULAR.pdf` | Acta / CLOSURE+GROUP | `c22f947478f2328eea51e71bb89e3ed5c57f06d92a48c15f02f4cab64dff24cf` | 2; 1191×842 ambas horizontal | 20+20=40; S/S/S |
| 20 | `20_CERTIFICADO_MODULAR.pdf` | Certificado / CERTIFICATION+ENROLLMENT | `79bda0e77e9cbbce2e68a7c6271f7f7248588d9d70ce1910c3b43ba33b4a49ec` | 2; 842×595 ambas horizontal | 8 detalle en p.2; S/S/S |
| 21 | `21_TITULO_AUXILIAR_TECNICO.pdf` | Título / TITLE+STUDENT+CLOSURE | `6dbf9aa7b92866cc94c2fe1f7391816d2bcaa7331bbeaeeb1faba0a51fd3abaf` | 2; 842×595 ambas horizontal | —; S/N/S |

## Convención del inventario de campos

Cada elemento separado por `;` es **un campo lógico físico** (`fieldId = TMPL-NN/canonicalKey`, con sufijo de página o sección si se repite). El texto entre paréntesis es `labelVisible` o descripción del casillero cuando no hay rótulo. `section` y `page` se indican al comienzo de cada línea. Tipos: T texto, D fecha, N número, C categoría/casilla, I imagen, S firma. `R1`, `R5`, `R8`, `R20`, `R30`, `R40`, `R47` significan `isRepeating=true` y `maxOccurrences` respectivo; `R?` significa máximo `REVIEW_REQUIRED`; sin `R` implica falso y máximo 1. `S` lleva `isSignature=true`. **Todos los elementos aquí son `isVariable=true`, `isFixedText=false`**; el rótulo visible es texto fijo separado. Importancia visual `P` = primaria (nombre/identidad/título), `A` = alta (cabecera/resultados), `N` = normal (tabla), `R` = requiere revisión por ambigüedad. Si una fila contiene varias columnas, cada clave/elemento cuenta como campo lógico **una vez por plantilla**, no como 40/47 instancias independientes. Los espacios sin semántica inequívoca son `REVIEW_REQUIRED` y nunca reciben valor por inferencia. Las claves y fuentes se explican en `DOCUMENT_CANONICAL_FIELD_DICTIONARY.md`; esta notación es una declaración **de auditoría**, no un binding.

**Recuento reproducible de campos lógicos variables observados: 300** (no 300 celdas de estudiante). Desglose: 01=35, 02=22, 03=14, 04=10, 05–10=11×6=66, 11=12, 12–17=11×6=66, 18=12, 19=40 (dos páginas), 20=16, 21=7. Total **86 `canonicalKeys` únicos** en este inventario; `REVIEW_REQUIRED` no cuenta como clave. La multiplicidad exacta de columnas de sesión/subindicadores y la capacidad de 03 siguen pendientes: este recuento es de **tipos de espacio/campo por PDF**, no del total de casillas de grilla ni de campos rellenables certificados.

### 01 — Nómina (p.1)

- Cabecera: `institution.dre` (Región/DRE,T,A); `institution.ugel` (UGEL,T,A); `institution.name` (CETPRO,T,A); `institution.managementType` (Público/Privado,C,A); `institution.agreement` (Convenio,T,N); `institution.modularCode` (Código modular,T,A); `institution.creationResolution` (Resolución creación/conversión,T,N); `institution.province` (Provincia,T,N); `institution.district` (Distrito,T,N); `institution.locality` (Lugar,T,N); `institution.address` (Dirección,T,N).
- Contexto académico: `program.name` (Programa,T,A); `module.name` (Módulo,T,A); `module.authorization` (Resolución módulo,T,N); `program.cycle` (Ciclo,T,N); `period.startDate` (Inicio,D,N); `period.endDate` (Término,D,N); `enrollment.shift` (Turno,T,N); `enrollment.section` (Sección,T,N).
- Tabla R30: `enrollment.code` (Código de matrícula,T,R30,N); `student.fullName` (Apellidos y nombres,T,R30,P); `student.sex` (H/M,C,R30,N); `student.birthDate` (Fecha nacimiento,D,R30,N); `enrollment.condition` (G/P/B,C,R30,N); `enrollment.unitCount` (N.º UD cursadas,N,R30,R: semántica pendiente); `enrollment.creditTotal` (Créditos totales,N,R30,R: agregación pendiente).
- Totales/pie: `group.maleCount` (Hombres,N,A); `group.femaleCount` (Mujeres,N,A); `group.studentCount` (Total estudiantes,N,A); `group.gratuitousCount` (Gratuitos,N,N); `group.payingCount` (Pagantes,N,N); `group.scholarshipCount` (Becados,N,N); `group.conditionTotal` (Total condición,N,N); `document.issueDate` (Lugar/fecha,D,N); `document.coordinatorSignature` (Coordinador,S,N). Los 7 totales son **DERIVATION_RULE_UNCONFIRMED**, incluido qué filas cuentan. No generar página 2 del PDF canónico.

### 02 — Ficha (p.1)

- Institución: `institution.name` (CETPRO,T,A); `institution.dre` (DRE,T,N); `institution.modularCode` (Código modular,T,N); `institution.managementType` (Tipo de gestión,T,N); `institution.department` (Departamento,T,N); `institution.province` (Provincia,T,N); `institution.district` (Distrito,T,N); `institution.resolutions` (Resolución directorial,T,N).
- Matrícula/persona: `program.name` (Programa de estudios,T,A); `module.name` (Módulo formativo,T,A); `program.trainingLevel` (Nivel formativo,T,N); `program.planType` (Tipo de plan,T,N); `student.documentNumber` (Número de documento,T,P); `student.fullName` (Apellidos y nombres,T,P); `period.name` (Periodo lectivo,T,A); `period.class` (Periodo de clase,T,R: no confirmado).
- Tabla principal R8: `curriculum.unit.name` (Unidad didáctica,T,R8,N); `curriculum.unit.credits` (Créditos,N,R8,N); `curriculum.unit.hours` (Horas,N,R8,N). Subsanación R1: `curriculum.subsanacionUnit` (Unidad de subsanación,T,R1,N). Pie: `document.directorSignature` (Director,S,N); `document.studentSignature` (Estudiante,S,N). `AÑO 2026 - I` es texto **fijo**, conflicto B-007; no equivale a `period.name`.

### 03 — Registro modular (p.1)

- Cabecera: `institution.ugel` (UGEL,T,N); `institution.modularCode` (Código modular,T,N); `institution.name` (CETPRO,T,A); `program.name` (Programa,T,A); `program.cycle` (Ciclo,T,N); `program.authorization` (Resolución programa,T,N); `module.name` (Módulo,T,A).
- Tabla: `student.documentType` (Tipo documento,C,R?,N); `student.documentNumber` (Número documento,T,R?,P); `student.paternalSurname` (Apellido paterno,T,R?,N); `student.maternalSurname` (Apellido materno,T,R?,N); `student.givenNames` (Nombres,T,R?,P); `student.sex` (F/M,C,R?,N); `student.birthDate` (Fecha nacimiento,D,R?,N). `R?` = `isRepeating=true`, `maxOccurrences=REVIEW_REQUIRED`: números 1–15 y luego 15 repetido, bandas inferiores comprimidas; **no** homologar capacidad por el XLSX ni rellenar la zona ilegible. `2026-I` del título es fijo, conflicto B-007.

### 04 — Portada (p.1)

- `program.name` (Programa,T,A); `module.name` (Módulo,T,A); `institution.dre` (DRE,T,N); `institution.ugel` (UGEL,T,N); `institution.managementType` (Tipo de gestión,T,N); `program.cycle` (Ciclo,T,N); `module.duration` (Duración,T,N); `module.startDate` (Inicio,D,N); `enrollment.shift` (Turno,T,N); `document.teacherName` (Docente,T,A). Los pares de líneas punteadas de duración/inicio/turno no demuestran dos fuentes distintas: segundo componente `REVIEW_REQUIRED`. Encabezado “CETPRO” genérico es fijo, no nombre institucional.

### 05–10 — seis hojas de asistencia, p.1 de cada PDF

- Por cada ID **05, 06, 07, 08, 09, 10** se detectó el mismo conjunto físico (seis auditorías independientes): `program.name` (Programa,T,A); `period.name` (Periodo académico,T,A); `module.name` (Módulo,T,A); `curriculum.unit.name` (UD correspondiente,T,A); tabla R40: `student.fullName` (Apellidos y nombres,T,R40,P); `attendance.sessionDate` (Fecha por columna,D,R?,N); `attendance.mark` (casilla por sesión,C,R?,N); `attendance.presentCount` (Asistencias,N,R40,N); `attendance.absentCount` (Inasistencias,N,R40,N); `attendance.absencePercent` (% inasistencia,N,R40,A); pie `document.teacherSignature` (Docente,S,N). Las fechas/marcas repiten por columnas y estudiante: `maxOccurrences` por sesiones es `REVIEW_REQUIRED` hasta contar y confirmar uso de cada columna; **no hay casilla de DNI en los PDF 05–10**, aunque el XLSX previo sí la menciona. No existe As-7 canónico (B-001). Totales/% sin fórmula oficial.

### 11 — Evaluación IL/UD1, p.1

- Cabecera: `program.name` (Programa,T,A); `period.name` (Periodo,T,A); `module.name` (Módulo,T,A); `curriculum.unit.name` (UD1,T,A); `curriculum.unit.capacity` (Capacidad,T,A); `curriculum.indicator.text` (5 indicadores,T,R5,A).
- Tabla R47: `student.fullName` (Apellidos y nombres,T,R47,P); `evaluation.indicatorScore` (IA1/IA2/IA3 por cada indicador,N,R? ,N); `evaluation.indicatorAchievement` (IL/R por indicador,C,R?,N); `evaluation.indicatorRecovery` (R/recuperación,C,R?,N); `evaluation.unitResult` (Logro/Nivel de logro,T,R47,A). El PDF combina 5 grupos de indicador y subcolumnas: `R?` indica 47 alumnos × subcolumnas, no una sola nota; correspondencia IA/IL/R y fórmula **REVIEW_REQUIRED**. Pie `document.teacherSignature` (Docente,S,N).

### 12–17 — seis hojas de evaluación UD2–UD7, p.1 de cada PDF

- Para cada ID **12, 13, 14, 15, 16, 17**: `program.name` (Programa,T,A); `period.name` (Periodo,T,A); `module.name` (Módulo,T,A); `curriculum.unit.name` (UD correspondiente,T,A); `curriculum.unit.capacity` (Capacidad,T,A); `curriculum.indicator.text` (5 indicadores,T,R5,A); tabla R40 `student.fullName` (Apellidos y nombres,T,R40,P); `evaluation.indicatorScore` (IA1/IA2/IA3 por indicador,N,R?,N); `evaluation.indicatorAchievement` (IL/R,C,R?,N); `evaluation.indicatorRecovery` (R,C,R?,N); `evaluation.unitResult` (Logro,T,R40,A). La multiplicidad de subcolumnas/regla de cada indicador es `REVIEW_REQUIRED` como en 11. No se constató pie de firma física de docente en estas seis páginas. **Existe UD7 de evaluación, no As-7**: no unir existencia de ambos PDF por su número.

### 18 — Consolidado EFSRT, p.1

- Cabecera: `institution.name` (CETPRO,T,A); `module.name` (Módulo,T,A); `document.teacherName` (Docente,T,N); `efsrt.hours` (Horas,N,A); `efsrt.startDate` (Inicio,D,N); `efsrt.endDate` (Término,D,N).
- Tabla R40: `student.fullName` (Apellidos y nombres,T,R40,P); `enrollment.code` (Código,T,R40,R: verificar significado); `efsrt.companyName` (Empresa/institución,T,R40,N); `efsrt.companyAddress` (Dirección,T,R40,N); `efsrt.criterionScore` (nueve criterios con ponderaciones impresas,N,R40×9,N); `efsrt.finalGrade` (Nota final,N,R40,A). Los nueve criterios son columnas físicas, pero **su escala/ponderación y agregado siguen pendientes**. No firma visible.

### 19 — Acta modular, dos páginas

- P.1 cabecera: `institution.name` (CETPRO,T,A); `institution.managementType` (Gestión,C,N); `institution.modularCode` (Código modular,T,N); `institution.creationResolution` (Resolución autorización/conversión,T,N); `institution.dre` (DRE,T,N); `institution.ugel` (UGEL,T,N); `institution.department` (Región,T,N); `institution.province` (Provincia,T,N); `institution.district` (Distrito,T,N); `institution.locality` (Local,T,N); `institution.address` (Dirección,T,N); `program.name` (Programa,T,A); `program.cycle` (Ciclo,T,N); `module.name` (Módulo,T,A); `module.authorization` (Autorización módulo,T,N); `enrollment.section` (Sección,T,N); `enrollment.shift` (Turno,T,N); `period.name` (Periodo,T,A).
- P.1 tabla R20: `enrollment.code` (Código,T,R20,N); `student.fullName` (Apellidos y nombres,T,R20,P); `curriculum.unit.credits` (Créditos por UD,N,R?,N); `curriculum.unit.hours` (Horas/EFSRT,N,R?,N); `evaluation.unitResult` (Resultado UD,C,R?,A); `evaluation.approvedUnitCount` (Aprobadas,N,R20,A); `evaluation.failedUnitCount` (Desaprobadas,N,R20,A); `evaluation.observation` (Observación,T,R20,N).
- P.2 tabla R20 (filas 21–40): `student.documentNumber` (Documento,T,R20,P); `student.fullName` (Apellidos y nombres,T,R20,P); `curriculum.unit.credits` (Créditos UD,N,R?,N); `evaluation.unitResult` (Resultado UD,C,R?,A); `evaluation.approvedUnitCount` (Aprobadas,N,R20,A); `evaluation.failedUnitCount` (Desaprobadas,N,R20,A); `evaluation.observation` (Observación,T,R20,N). Cabecera/resumen p.2: `curriculum.unit.name` (UD/T,R?,N); `curriculum.unit.capacity` (Capacidades,T,R?,N); `closure.approvedCount` (Aprobados,N,A); `closure.failedCount` (Desaprobados,N,A); `evaluation.withdrawnCount` (Retirados,N,A); `document.directorSignature` (Director,S,N); `document.teacherSignature` (Docente,S,N). La p.2 **no** es copia exacta de p.1: cambia identificador del alumno y añade resumen. No asignar notas/resultados por deducción.

### 20 — Certificado, dos páginas

- P.1: `institution.logo` (espacio de logo,I,R); `student.photo` (fotografía,I,R); `document.registerCode` (Código de registro,T,A); `student.fullName` (Nombre del titular,T,P); `module.name` (Módulo,T,A); `program.name` (Programa,T,A); `REVIEW_REQUIRED` (líneas sin rótulo inequívoco,T,R); `document.directorSignature` (Director,S,N).
- P.2: `program.cycle` (Ciclo,T,N); `REVIEW_REQUIRED` (Modalidad,T,R: no equiparar con tipo de plan); tabla R8 `curriculum.unit.competence` (Unidad de competencia,T,R8,N); `curriculum.unit.name` (Unidad didáctica,T,R8,N); `curriculum.unit.credits` (Créditos,N,R8,N); `curriculum.unit.hours` (Horas,N,R8,N); `curriculum.unit.capacity` (Capacidad,T,R8,N); `evaluation.unitResult` (Calificación,T,R8,A). Ocho filas de detalle en vectores PDF; no agregar una novena. `CETPRO PÚBLICO/PRIVADO` es rótulo genérico fijo, no dato `institution.name`. Elegibilidad, código y emisión requieren B-006 además de B-002/B-004.

### 21 — Título auxiliar técnico, dos páginas

- P.1: `REVIEW_REQUIRED` (dos cuadros superiores sin rótulo verificable,I,R); `student.fullName` (“Por cuanto”,T,P); `document.officialTitleText` (“le otorga título de”,T,P); `document.directorSignature` (Director,S,N).
- P.2: `institution.logo` (marca/espacio institucional,I,R); `document.registerCode` (Código de registro,T,A); `document.directorSignature` (Director,S,N). Texto República/Ministerio/CETPRO y leyenda legal visibles = **fijos**; no suponen expedición, autoridad firmante real ni aprobación. El número de orden del XLSX no quedó acreditado como casillero variable inequívoco del PDF y permanece `REVIEW_REQUIRED`.

## Tablas, exceso, faltantes y reglas

| PDF | Fila origen / cardinalidad | Exceso / faltantes documentados, no implementados |
|---|---|---|
| 01 | matrículas filtradas por grupo contextual; 30 | >30: detener/avisar; nunca sintetizar p.2 canónica. <30: casillas sin dato, no alumno ficticio |
| 02 | unidades de la matrícula/currículo, 8+1 subsanación | >8 o >1: preflight de capacidad pendiente; <capacidad: espacios vacíos |
| 03 | personas por matrícula/grupo; capacidad ilegible | bloquear política de llenado hasta verificar matriz de filas y numeración; no asumir capacidad XLSX |
| 05–10 | 40 estudiantes por hoja UD + sesiones/fechas por columnas | >40: preflight; calendario exacto de columnas pendiente; celdas no usadas vacías |
| 11 | 47 estudiantes × 5 indicadores | >47: preflight; faltantes en blanco; notas nunca calculadas sin reglas |
| 12–17 | 40 estudiantes × 5 indicadores | >40: preflight; faltantes en blanco |
| 18 | 40 estudiantes × 9 criterios | >40: preflight; criterios y empresa sin fuente oficial = en blanco/bloqueo |
| 19 | 20+20 estudiantes + resumen UD | >40: preflight; no página 3; resultados/estadísticas sin norma = bloqueo |
| 20 | 8 unidades en p.2 | >8: preflight; no segunda hoja de detalle adicional |

Clave GROUP propuesta: combinación **registrada** de institución, programa, módulo, periodo, grupoCode, turno/sección y UD si corresponde. Filtros y orden deben ser explícitos en matrícula/administración; no agrupar por nombre de archivo, texto preimpreso o nombre del alumno. El orden es estable/auditable y debe confirmarse (código de matrícula vs alfabético aún `REVIEW_REQUIRED`). La persona jamás define grupo por sí sola. Los conteos de hombres/mujeres, G/P/B, asistencia, aprobados/desaprobados, nota final y cierre están `DERIVATION_RULE_UNCONFIRMED`; requieren norma, denominador, tratamiento de ausentes/retiros/subsanación y comprobación institucional.

## Tres estados distintos y política visual (solo diseño)

`ContractStatus` = declaración semántica (`CONFIRMED`, `UNCONFIRMED`, `BLOCKED`, `FIXED_IN_TEMPLATE`, `REVIEW_REQUIRED`); `SourceReadiness` = existencia/confirmación del dato; `BindingStatus` = `MAPPED`/`PARTIAL`/`NOT_IMPLEMENTED` **por PDF y casillero**. Ejemplo `student.fullName`: fuente real en estudiantes y contrato confirmado para 02, binding 02 MAPPED; 15 NOT_IMPLEMENTED. Tener dato no prueba que el PDF funcione. 02 sigue siendo preview, no emisión oficial; 01/03 tienen pruebas técnicas históricas, no binding productivo auditado completo. 04–21 NOT_IMPLEMENTED salvo que exista evidencia específica posterior.

**Lectura de estado por cada elemento del inventario:** `ContractStatus` y `SourceReadiness` se toman de su fila de clave/fuente en `DOCUMENT_CANONICAL_FIELD_DICTIONARY.md` (las rutas oficiales no comprobadas = UNCONFIRMED/NEEDS_OFFICIAL_SOURCE; claves B-002/B-004/B-007 = BLOCKED aunque la tabla técnica exista; derivados = UNCONFIRMED/DERIVATION_RULE_UNCONFIRMED; `REVIEW_REQUIRED` = REVIEW_REQUIRED/NEEDS_OFFICIAL_SOURCE). `BindingStatus` se indexa por PDF/clave, **no** por disponibilidad del dato: en 02 solo `institution.name`, `institution.managementType`, `institution.resolutions`, `program.name`, `student.documentNumber`, `student.fullName`, `institution.dre`, `institution.modularCode`, `institution.department`, `institution.province` e `institution.district` están `MAPPED` en el preview actual; los demás espacios de 02 son `NOT_IMPLEMENTED` o bloqueados. Para 01/03 la salida técnica histórica **no certifica** cada caja canónica: `NOT_CERTIFIED_PRODUCTIVE`. Para 04–21, todos los elementos son `NOT_IMPLEMENTED`. Este índice puede aplicarse a los 300 elementos sin convertir el estado de fuente en estado de binding. `FIXED_IN_TEMPLATE` solo corresponde a rótulos/leyendas ya impresos y tiene `BindingStatus=NOT_APPLICABLE`.

Perfiles visuales propuestos: `NORMAL_VALUE` (legibilidad base), `INSTITUTION_NAME` (cabecera), `PRIMARY_PERSON_NAME` (peso mayor y ajuste automático sin truncamiento/elipsis/compresión horizontal), `PRIMARY_DOCUMENT_NUMBER` (cadena exacta, nunca formato numérico), `PROGRAM_NAME`, `MODULE_NAME`, `TABLE_VALUE`, `DATE_VALUE`, `SIGNATURE_VALUE`, `LONG_TEXT`, `RESULT_VALUE`. Cada binding futuro declarará `styleProfile`; tamaño/peso mínimo/AutoFit se validan **contra la caja real de cada PDF**, sin alterar ahora geometrías ni imponer un tamaño único. Una firma no se renderiza como texto genérico sin identidad/autoridad confirmada. Campos bloqueados permanecen en blanco en preview y no se emiten oficialmente.

## Riesgos que obligan revisión

1. PDF03: distinción 1–15 seguida de “15” repetido y bandas inferiores comprimidas (vectores aproximadamente 2.194 puntos entre filas superiores y 0.548 inferiores). Capacidad/legibilidad `REVIEW_REQUIRED`.
2. PDF01 solo tiene **una** página/30 filas canónicas. La paginación histórica 60 es de renderer técnico, no atributo del original.
3. PDF02 y PDF03 imprimen `2026-I`: fija, no prueba de periodo (B-007).
4. Sexo H/M en 01 frente F/M en 03 y modelo productivo; mapear por documento tras confirmar semántica.
5. PDF05–10 sin DNI, evaluación UD7 sin As-7. No usar el XLSX como geometra del PDF.
6. PDF19 p.1/p.2 no comparten todas las columnas; PDF20 tiene 8 filas físicas, no una capacidad derivada del XLSX.
7. PDF20–21 tienen foto/logo/cuadros/leyendas genéricas; no son imagen, firma ni certificado verificados.
8. `CETPRO_DB` no contiene hoy las relaciones/periodos/unidades/actos necesarios según el estado del proyecto; no inferir un módulo o curso desde grupos de origen.

Decisiones de implementación y dependencias están en los otros cuatro documentos de esta auditoría. **No** se creó plantilla, renderer, dato académico, regla de emisión ni binding productivo.
