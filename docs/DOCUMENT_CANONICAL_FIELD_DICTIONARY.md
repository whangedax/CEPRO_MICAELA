# DOCUMENT-MASTER-AUDIT-01 — diccionario canónico propuesto

Fecha: 2026-09-15. Diseño documental, **no** contrato productivo ni permiso de emisión. `canonicalKey` describe un significado, no un valor confirmado. Una persona puede tener varias matrículas: toda clave `student.*` se resuelve desde el estudiante de la **matrícula seleccionada**, nunca desde una búsqueda aislada por nombre/DNI. `CETPRO_DB` es la base local del perfil de navegador; la existencia de una tabla no implica conexión documental.

Estados: `READY_NOW` = dato productivo observado y ya consumible en el flujo limitado TMPL-02; `SOURCE_EXISTS_BUT_NOT_CONNECTED` = entidad/campo existe, pero este PDF no lo consume; `NEEDS_OFFICIAL_SOURCE` = falta valor/catálogo institucional avalado; `NEEDS_MODULE` = se necesita modelo/flujo funcional; `BLOCKED_B002`, `BLOCKED_B004`, `BLOCKED_B007` = regla explícita; `DERIVATION_RULE_UNCONFIRMED` = no definir fórmula; `FIXED_IN_TEMPLATE` = no inyectar. La columna fuente nombra dueño esperado, **no** una ruta de join implementada.

| canonicalKey / grupo de claves | Fuente autoritativa esperada | Estado / cautela |
|---|---|---|
| `institution.name`, `institution.managementType`, `institution.resolutions` | `CETPRO_DB.institucion` | READY_NOW solo donde el contrato vigente verifica estos valores; variantes individuales de resolución aún necesitan fuente |
| `institution.dre`, `institution.ugel`, `institution.modularCode`, `institution.department`, `institution.province`, `institution.district`, `institution.address`, `institution.locality` | `CETPRO_DB.institucion` | SOURCE_EXISTS_BUT_NOT_CONNECTED o NEEDS_OFFICIAL_SOURCE según valor y confirmación de la fuente; no inferir DRE/UGEL de otra ubicación |
| `institution.creationResolution`, `institution.conversionResolution`, `institution.programAuthorization`, `institution.moduleAuthorization`, `institution.agreement`, `institution.logo` | `CETPRO_DB.institucion` + constancia administrativa/archivo oficial | NEEDS_OFFICIAL_SOURCE; `institution.resolutions` consolidado no sustituye automáticamente cada número |
| `student.documentType`, `student.documentNumber`, `student.paternalSurname`, `student.maternalSurname`, `student.givenNames`, `student.fullName`, `student.sex`, `student.birthDate` | `CETPRO_DB.estudiantes` | READY_NOW en TMPL-02 para documento/nombre; otras plantillas SOURCE_EXISTS_BUT_NOT_CONNECTED; sexo requiere equivalencia *por PDF* (H/M frente F/M), no conversión global inventada |
| `student.photo` | repositorio de imagen verificada con consentimiento/uso institucional | NEEDS_OFFICIAL_SOURCE; un cuadro preimpreso no prueba que exista foto |
| `enrollment.id`, `enrollment.code`, `enrollment.groupCode`, `enrollment.status`, `enrollment.enrolledAt`, `enrollment.condition`, `enrollment.section`, `enrollment.shift`, `enrollment.unitCount`, `enrollment.creditTotal` | `CETPRO_DB.matriculas` + `matricula_unidades` + currículo | SOURCE_EXISTS_BUT_NOT_CONNECTED; `code`, `condition`, sección/turno requieren semántica oficial, no usar `MAT-IMP-BD-*` como código impreso; conteos/créditos = DERIVATION_RULE_UNCONFIRMED |
| `program.name`, `program.trainingLevel`, `program.planType`, `program.cycle`, `program.authorization` | `CETPRO_DB.programas` y catálogo oficial | READY_NOW solo `program.name` en TMPL-02; restantes NEEDS_OFFICIAL_SOURCE / NEEDS_MODULE |
| `module.name`, `module.code`, `module.cycle`, `module.duration`, `module.startDate`, `module.endDate`, `module.authorization` | `CETPRO_DB.modulos` + asignación de matrícula/grupo + currículo | BLOCKED_B004 para vínculo real; duración/fechas/autorización necesitan fuente oficial, no derivar de nombre de archivo |
| `period.name`, `period.class`, `period.startDate`, `period.endDate` | `CETPRO_DB.periodos` | BLOCKED_B007; 0 periodos productivos documentados. `2026-I` preimpreso no es registro |
| `curriculum.unit.code`, `curriculum.unit.name`, `curriculum.unit.order`, `curriculum.unit.credits`, `curriculum.unit.hours`, `curriculum.unit.competence`, `curriculum.unit.capacity`, `curriculum.indicator.text`, `curriculum.evaluationWeight`, `curriculum.subsanacionUnit` | `CETPRO_DB.unidades` + catálogo curricular/indicadores oficiales | BLOCKED_B002; no inventar unidades, IA/IL, horas o créditos |
| `attendance.sessionDate`, `attendance.mark`, `attendance.presentCount`, `attendance.absentCount`, `attendance.absencePercent` | `CETPRO_DB.asistencia` + sesiones y norma de cómputo | SOURCE_EXISTS_BUT_NOT_CONNECTED para marcación cruda; totales/% = DERIVATION_RULE_UNCONFIRMED |
| `evaluation.indicatorScore`, `evaluation.indicatorRecovery`, `evaluation.indicatorAchievement`, `evaluation.unitResult`, `evaluation.approvedUnitCount`, `evaluation.failedUnitCount`, `evaluation.withdrawnCount`, `evaluation.observation` | `CETPRO_DB.evaluacion` + currículo y norma de calificación/cierre | registro crudo SOURCE_EXISTS_BUT_NOT_CONNECTED; agregaciones/resultados = DERIVATION_RULE_UNCONFIRMED; sin nota oficial inferida |
| `efsrt.companyName`, `efsrt.companyAddress`, `efsrt.hours`, `efsrt.startDate`, `efsrt.endDate`, `efsrt.criterionScore`, `efsrt.finalGrade`, `efsrt.status` | `CETPRO_DB.efsrt` + entidad receptora/criterios oficiales | SOURCE_EXISTS_BUT_NOT_CONNECTED para registro crudo; empresa/dirección/criterios = NEEDS_OFFICIAL_SOURCE; resultado = DERIVATION_RULE_UNCONFIRMED |
| `group.maleCount`, `group.femaleCount`, `group.studentCount`, `group.gratuitousCount`, `group.payingCount`, `group.scholarshipCount`, `group.conditionTotal` | conjunto de `CETPRO_DB.matriculas` seleccionadas + sexo de `estudiantes` + regla de condición | DERIVATION_RULE_UNCONFIRMED; definir denominador/deduplicación administrativa, no contar celdas ocupadas |
| `closure.approvalStatus`, `closure.moduleResult`, `closure.certificateEligibility`, `closure.titleEligibility`, `closure.approvedCount`, `closure.failedCount` | módulo de cierre M09 + matrícula/registro + reglas oficiales | NEEDS_MODULE / DERIVATION_RULE_UNCONFIRMED; no equivale a mostrar notas |
| `document.issueDate`, `document.registerCode`, `document.orderNumber`, `document.issuerName`, `document.teacherName`, `document.directorSignature`, `document.teacherSignature`, `document.coordinatorSignature`, `document.studentSignature` | `CETPRO_DB.documentos`, registro/correlativo administrativo, autoridades/firmantes | NEEDS_MODULE / NEEDS_OFFICIAL_SOURCE; firma impresa o línea punteada **no** es firma verificada; no generar correlativo ni sello automáticamente |
| `document.officialTitleText`, `document.legalBasis`, `document.logo` | acto/norma/archivo institucional confirmado | NEEDS_OFFICIAL_SOURCE; el texto genérico preimpreso no certifica título obtenido |

`FIXED_IN_TEMPLATE` se reserva a rótulos, títulos, leyendas, casillas y textos que el PDF ya contiene; **no** es `canonicalKey` variable. Para datos sin rótulo/semántica demostrable se usa `REVIEW_REQUIRED`, sin asignar dueño por parecido visual. No usar prefijos por plantilla (`tmpl02StudentName`) para una misma entidad.

## Claves compartidas de alto impacto

| Clave | PDF que la requieren físicamente | Advertencia de binding |
|---|---|---|
| `student.fullName` | 01,02,05–21 | 03 usa **tres claves separadas** (`paternalSurname`, `maternalSurname`, `givenNames`); 19 tiene dos páginas con columnas diferentes; no asumir caja idéntica |
| `student.documentNumber` | 02,03,19 | **No** aparece como casilla de DNI en 05–10 PDF, pese al XLSX previo |
| `program.name` | 01–04,05–17,19,20 | Cada PDF tiene ubicación/longitud distinta |
| `module.name` | 01–02,03–04,05–18,19–20 | B-004 en vínculo académico real |
| `period.name` | 01–02,05–17,19 | B-007; leyendas 2026-I preimpresas no la suplen |
| `curriculum.unit.name` | 02,05–17,19,20 | B-002; 02 admite ocho filas principales y una subsanación |
| `institution.name` | 01–03,18–19; 20–21 contienen CETPRO genérico | No reinterpretar el texto `CETPRO PÚBLICO/PRIVADO` como nombre real |

Esta matriz es semántica. El estado productivo por plantilla se desglosa en `DOCUMENT_CONTEXT_MATRIX.md`; la cobertura histórica por XLSX permanece separada en `DOCUMENT_FIELD_COVERAGE.md`.

## Matriz global completa: 86 claves observadas → PDF

Rangos como `05–10` incluyen **cada** PDF del intervalo. La matriz deriva exclusivamente de los elementos del inventario físico de `DOCUMENT_MASTER_AUDIT.md`; una clave puede repetirse en dos páginas del mismo PDF sin duplicar su pertenencia.

| CanonicalKey | Plantillas |
|---|---|
| `attendance.absencePercent` | 05–10 |
| `attendance.absentCount` | 05–10 |
| `attendance.mark` | 05–10 |
| `attendance.presentCount` | 05–10 |
| `attendance.sessionDate` | 05–10 |
| `closure.approvedCount` | 19 |
| `closure.failedCount` | 19 |
| `curriculum.indicator.text` | 11–17 |
| `curriculum.subsanacionUnit` | 02 |
| `curriculum.unit.capacity` | 11–17,19,20 |
| `curriculum.unit.competence` | 20 |
| `curriculum.unit.credits` | 02,19,20 |
| `curriculum.unit.hours` | 02,19,20 |
| `curriculum.unit.name` | 02,05–17,19,20 |
| `document.coordinatorSignature` | 01 |
| `document.directorSignature` | 02,19–21 |
| `document.issueDate` | 01 |
| `document.officialTitleText` | 21 |
| `document.registerCode` | 20,21 |
| `document.studentSignature` | 02 |
| `document.teacherName` | 04,18 |
| `document.teacherSignature` | 05–11,19 |
| `efsrt.companyAddress` | 18 |
| `efsrt.companyName` | 18 |
| `efsrt.criterionScore` | 18 |
| `efsrt.endDate` | 18 |
| `efsrt.finalGrade` | 18 |
| `efsrt.hours` | 18 |
| `efsrt.startDate` | 18 |
| `enrollment.code` | 01,18,19 |
| `enrollment.condition` | 01 |
| `enrollment.creditTotal` | 01 |
| `enrollment.section` | 01,19 |
| `enrollment.shift` | 01,04,19 |
| `enrollment.unitCount` | 01 |
| `evaluation.approvedUnitCount` | 19 |
| `evaluation.failedUnitCount` | 19 |
| `evaluation.indicatorAchievement` | 11–17 |
| `evaluation.indicatorRecovery` | 11–17 |
| `evaluation.indicatorScore` | 11–17 |
| `evaluation.observation` | 19 |
| `evaluation.unitResult` | 11–17,19,20 |
| `evaluation.withdrawnCount` | 19 |
| `group.conditionTotal` | 01 |
| `group.femaleCount` | 01 |
| `group.gratuitousCount` | 01 |
| `group.maleCount` | 01 |
| `group.payingCount` | 01 |
| `group.scholarshipCount` | 01 |
| `group.studentCount` | 01 |
| `institution.address` | 01,19 |
| `institution.agreement` | 01 |
| `institution.creationResolution` | 01,19 |
| `institution.department` | 02,19 |
| `institution.district` | 01,02,19 |
| `institution.dre` | 01,02,04,19 |
| `institution.locality` | 01,19 |
| `institution.logo` | 20,21 |
| `institution.managementType` | 01,02,04,19 |
| `institution.modularCode` | 01–03,19 |
| `institution.name` | 01–03,18,19 |
| `institution.province` | 01,02,19 |
| `institution.resolutions` | 02 |
| `institution.ugel` | 01,03,04,19 |
| `module.authorization` | 01,19 |
| `module.duration` | 04 |
| `module.name` | 01–20 |
| `module.startDate` | 04 |
| `period.class` | 02 |
| `period.endDate` | 01 |
| `period.name` | 02,05–17,19 |
| `period.startDate` | 01 |
| `program.authorization` | 03 |
| `program.cycle` | 01,03,04,19,20 |
| `program.name` | 01–17,19,20 |
| `program.planType` | 02 |
| `program.trainingLevel` | 02 |
| `student.birthDate` | 01,03 |
| `student.documentNumber` | 02,03,19 |
| `student.documentType` | 03 |
| `student.fullName` | 01,02,05–21 |
| `student.givenNames` | 03 |
| `student.maternalSurname` | 03 |
| `student.paternalSurname` | 03 |
| `student.photo` | 20 |
| `student.sex` | 01,03 |
