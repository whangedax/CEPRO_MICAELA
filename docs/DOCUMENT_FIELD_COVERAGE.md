# DOCUMENT-CONTRACT-01 — Cobertura universal de campos

> **Adenda PDF 2026-09-15 — DOCUMENT-MASTER-AUDIT-01:** esta página conserva evidencia histórica **XLSX/contrato**, no inventario geométrico definitivo del PDF. La auditoría física independiente de los 21 PDF y sus 24 páginas está en `DOCUMENT_MASTER_AUDIT.md`; diccionario, contexto, dependencias y plan en los cuatro documentos asociados. Contradicciones comprobadas: PDF01 canónico tiene **1 página y 30 filas** (el renderer histórico de 60 no describe la fuente); PDF03 tiene zona inferior comprimida/numeración 15 repetida y capacidad `REVIEW_REQUIRED`; PDF05–10 **no** tienen DNI visible aunque el XLSX sí; PDF11 tiene 47 filas y PDF12–17 40; PDF17 UD7 existe sin As-7; PDF19 tiene 20+20 filas con columnas distintas; PDF20 tiene **8** filas de detalle en p.2. Los rótulos fijos `2026-I` de PDF02/03 no constituyen periodo productivo. **Ninguna de estas observaciones cambia el contrato/renderers actuales ni desbloquea B-002/B-004/B-007.**

Fecha: 2026-09-15. Las 21 fuentes XLSX se leyeron **sin modificarlas**; SHA-256 21/21 coincide con `TemplateRegistry` y `sources/templates/CATALOGO_PLANTILLAS.md`. El inventario de rótulos es reproducible con `scripts/audit_document_source_labels.py` y conserva archivo, hoja y celda. La lectura de una etiqueta prueba que existe un espacio/columna, **no** que la institución haya confirmado su valor ni su regla de emisión.

## Contrato y preflight

`app/js/services/document-field-contract.js` es la única declaración de `key`, `label`, `source`, obligaciones de preview/emisión, `status`, `blocker`, `emptyPolicy=BLANK` y `formatter`. Sus fuentes están separadas en `institution.*`, `student.*`, `enrollment.*`, `program.*`, `module.*`, `period.*`, `curriculum.*`, `academicRecord.*`, `efsrt.*` y `closure.*`. `template.*` se reserva para texto fijo incrustado y jamás aporta un dato académico dinámico.

`DocumentValidationService.validateDocument(templateId, context)` devuelve `canPreview`, `canOfficiallyIssue`, `resolvedFields`, `resolvedFieldSet`, `bindingFields`, `mappedAvailableFields`, `unmappedAvailableFields`, `missingFields`, `blockedFields`, `availableFields`, `warnings` y `documentFields` (compatibilidad). `CONFIRMED` exige valor; un dato confirmado pero ausente pasa a `MISSING`. `UNCONFIRMED` sigue en blanco hasta una confirmación explícita en `context.confirmedSources`, metadato que puede venir de `CETPRO_DB.institucion` sin inferirse por texto presente. `BLOCKED` sigue en blanco incluso si el contexto trae valor. `FIXED_IN_TEMPLATE` no se inyecta. Ningún contrato desbloquea emisión oficial. `DocumentBindingService` usa el mismo manifiesto JSON importado por el preflight y el renderer. El PDF recibe únicamente `resolvedFieldSet`: no consulta servicios ni re-resuelve valores.

## TMPL-02: clasificación completa de espacios actuales

| Campo visible / dato | Fuente única | Estado actual | Bloqueo | Valor de preview |
|---|---|---|---|---|
| Nombre CETPRO | `institution.nombre` | CONFIRMED | — | Valor real |
| Tipo de Gestión | `institution.tipoGestion` | CONFIRMED | — | Valor real |
| Resolución Directorial | `institution.resolucion` | CONFIRMED | — | Valor real, ambas resoluciones consolidadas |
| Programa de estudios | `program.nombre` | CONFIRMED | — | Valor real |
| Número de Documento | `student.numeroDocumento` | CONFIRMED | — | Valor textual real |
| Apellidos y nombres | `student.apellidosNombres` | CONFIRMED | — | Valor real |
| DRE | `institution.dre` | UNCONFIRMED por defecto; CONFIRMED con fuente marcada | — | Valor oficial o `""` |
| Código Modular | `institution.codigoModular` | UNCONFIRMED por defecto; CONFIRMED con fuente marcada | — | Valor oficial o `""` |
| Departamento | `institution.departamento` | UNCONFIRMED por defecto; CONFIRMED con fuente marcada | — | Valor oficial o `""` |
| Provincia | `institution.provincia` | UNCONFIRMED por defecto; CONFIRMED con fuente marcada | — | Valor oficial o `""` |
| Distrito | `institution.distrito` | UNCONFIRMED por defecto; CONFIRMED con fuente marcada | — | Valor oficial o `""` |
| Módulo Formativo | `module.nombre` | BLOCKED | B-004 | `""` |
| Periodo Lectivo / Académico | `period.nombre` | BLOCKED | B-007 | `""` |
| Unidades Didácticas, incl. subsanación | `curriculum.units` | BLOCKED | B-002 | `""` |
| Créditos | `curriculum.credits` | BLOCKED | B-002 | `""` |
| Horas | `curriculum.hours` | BLOCKED | B-002 | `""` |
| Unidades de Subsanación | `curriculum.subsanacionUnits` | BLOCKED | B-002 | `""` |
| Periodo de Clase | `period.clase` esperado, no confirmado | UNCONFIRMED | — | `""` |
| Nivel Formativo: rótulo | PDF/XLSX fijo | FIXED_IN_TEMPLATE | — | Ya impreso; no inyectar |
| Nivel Formativo: valor | `program.nivelFormativo` **esperado, no confirmado** | UNCONFIRMED | — | `""` |
| Tipo de Plan de estudios: rótulo | PDF/XLSX fijo | FIXED_IN_TEMPLATE | — | Ya impreso; no inyectar |
| Tipo de Plan de estudios: valor | `program.tipoPlan` **esperado, no confirmado** | UNCONFIRMED | — | `""` |
| `AÑO 2026 - I` | PDF fijo | FIXED_IN_TEMPLATE | B-007 para emisión | Permanece en canónico; no equivale a periodo registrado |

El usuario validó físicamente CONFIG-INSTITUTION-01 en Edge: al registrar los cinco pendientes, el preflight pasó de 6 a 11 disponibles. DOCUMENT-BINDING-01 conecta ahora sus cinco cajas físicas PDF; este enlace todavía requiere validación física Edge. La fuente XLSX muestra los rótulos `A9`/`A10` para Nivel/Tipo de Plan, pero no verifica valores. `docs/TMPL02_PHYSICAL_AUDIT.md` los había marcado como confirmados de `programas.nivel` y `programas.planTipo`; esa afirmación no está sustentada por el modelo/programas productivos actuales y queda reclasificada como pendiente **sin alterar el informe histórico ni el PDF**. Lo mismo aplica al texto fijo `AÑO 2026 - I` hasta que se confirme B-007.

## Cobertura preliminar de las 21 fuentes

Abreviaturas de estado: C = CONFIRMED si existe valor; U = UNCONFIRMED/sin fuente validada; B2/B3/B4/B5/B6/B7 = BLOCKED por la regla indicada; F = FIXED_IN_TEMPLATE. `ContextType=UNDETERMINED` significa que no existe contrato productivo de selección todavía. Las rutas `source` son **fuentes esperadas por la semántica del rótulo**, no joins implementados para estas 19 plantillas.

| ID | Nombre / hoja | ContextType | Campos detectados y fuente esperada (celda de evidencia) | Estado/bloqueo | Implementación |
|---|---|---|---|---|---|
| TMPL-01 | Nómina de Matrícula / Nómina | GROUP | CETPRO `institution.nombre` (L5); código `institution.codigoModular` (L6); programa `program.nombre` (B10); módulo `module.nombre` (B11); alumno `student.apellidosNombres` (E13); unidades/créditos `curriculum.*` (N13/P13). También resoluciones, provincia, distrito, dirección y fechas en B7/I7/B8/J8/J9/B12/G12. | C/U/B4/B2/B7; GROUP productivo pendiente | PDF técnico existente; producción bloqueada |
| TMPL-02 | Ficha de Matrícula / FICHA DE MATRICULA | ENROLLMENT | CETPRO (A3), DRE (D3), código (A4), gestión (D4), ubicación (A5/D5/A6), resolución (D6), programa (A7), módulo (A8), nivel/plan (A9/A10), documento/nombre (D10/A11), UD/crédito/hora (A12/B14/D14/E14). | Se detalla arriba; B2/B4/B7 | PDF productivo de vista previa; emisión bloqueada |
| TMPL-03 | Registro de Matrícula Modular / REGISTRO DE MATRICULA MODULAR | UNDETERMINED | Código/CETPRO `institution.*` (C5/D5), programa `program.nombre` (E5), resolución `institution.resolucionPrograma` (G5), módulo `module.nombre` (H5), documento/apellidos/nombres/nacimiento `student.*` (J5–M5/O5). | C/U/B4; resolución U; leyenda 2026-I F/B7 | Solo registro/preview técnico previo; sin integración productiva |
| TMPL-04 | Portada de Registro / Portada - Regis. Eva. | UNDETERMINED | Programa `program.nombre` (B19), módulo `module.nombre` (B24), DRE `institution.dre` (B29), gestión `institution.tipoGestion` (B33). | C/U/B4 | No implementada |
| TMPL-05 | Asistencia UD1 / As-1 | UNDETERMINED | Programa/periodo/módulo/UD `program/period/module/curriculum` (E2–E5), DNI/nombre `student.*` (C7/E7), asistencia/inasistencia `academicRecord.*` (AX7–AZ7). | C/B7/B4/B2/B3 | No implementada |
| TMPL-06 | Asistencia UD2 / As-2 | UNDETERMINED | Mismos campos y coordenadas E2–E5, C7/E7, AX7–AZ7 de la fuente UD2. | C/B7/B4/B2/B3 | No implementada |
| TMPL-07 | Asistencia UD3 / As-3 | UNDETERMINED | Mismos campos y coordenadas E2–E5, C7/E7, AX7–AZ7 de la fuente UD3. | C/B7/B4/B2/B3 | No implementada |
| TMPL-08 | Asistencia UD4 / As-4 | UNDETERMINED | Mismos campos y coordenadas E2–E5, C7/E7, AX7–AZ7 de la fuente UD4. | C/B7/B4/B2/B3 | No implementada |
| TMPL-09 | Asistencia UD5 / As-5 | UNDETERMINED | Mismos campos y coordenadas E2–E5, C7/E7, AX7–AZ7 de la fuente UD5. | C/B7/B4/B2/B3 | No implementada |
| TMPL-10 | Asistencia UD6 / As-6 | UNDETERMINED | Mismos campos y coordenadas E2–E5, C7/E7, AX7–AZ7 de la fuente UD6. | C/B7/B4/B2/B3 | No implementada; no existe As-7 |
| TMPL-11 | Evaluación IL/UD1 / IL | UNDETERMINED | Programa/periodo/módulo/UD (B2–B5), capacidad/indicadores `curriculum.*` (B6–B11), nombre `student.apellidosNombres` (B13), evaluación `academicRecord.evaluations` esperada. | C/B7/B4/B2 | No implementada |
| TMPL-12 | Evaluación UD2 / UD2 | UNDETERMINED | Mismos rótulos B2–B13; fuentes `program/period/module/curriculum/student/academicRecord`. | C/B7/B4/B2 | No implementada |
| TMPL-13 | Evaluación UD3 / UD3 | UNDETERMINED | Mismos rótulos B2–B13; fuentes `program/period/module/curriculum/student/academicRecord`. | C/B7/B4/B2 | No implementada |
| TMPL-14 | Evaluación UD4 / UD4 | UNDETERMINED | Mismos rótulos B2–B13; fuentes `program/period/module/curriculum/student/academicRecord`. | C/B7/B4/B2 | No implementada |
| TMPL-15 | Evaluación UD5 / UD5 | UNDETERMINED | Mismos rótulos B2–B13; fuentes `program/period/module/curriculum/student/academicRecord`. | C/B7/B4/B2 | No implementada |
| TMPL-16 | Evaluación UD6 / UD6 | UNDETERMINED | Mismos rótulos B2–B13; fuentes `program/period/module/curriculum/student/academicRecord`. | C/B7/B4/B2 | No implementada |
| TMPL-17 | Evaluación UD7 / UD7 | UNDETERMINED | Mismos rótulos B2–B13; fuentes `program/period/module/curriculum/student/academicRecord`. | C/B7/B4/B2 | No implementada |
| TMPL-18 | Consolidado EFSRT / EFSRT | UNDETERMINED | CETPRO `institution.nombre` (A4), módulo `module.nombre` (A5), horas/experiencia/empresa `efsrt.*` (F5/E6/I6/D8), nombre `student.apellidosNombres` (C8). | C/B4/B5 | No implementada |
| TMPL-19 | Acta de Evaluación Modular / ACTA | UNDETERMINED | CETPRO/gestión/código/resoluciones/DRE/ubicación/dirección `institution.*` (A6–A13), programa/módulo/periodo (Y6/Y9/V7), UD/créditos/horas `curriculum.*` (K6/K14), resultado `academicRecord.outcome` (W7–X7), documento/nombre `student.*` (B36/C14). | C/U/B2/B3/B4/B7 | No implementada |
| TMPL-20 | Certificado Modular / CERTIFICADO | UNDETERMINED | Módulo/programa `module/program` (B16/B18), UD/créditos/horas/capacidades `curriculum.*` (C34/E34/F34/G34), código de registro y aprobación `closure.*` (B4/B16). | C/B2/B4/B6 | No implementada; emisión B6 |
| TMPL-21 | Título Auxiliar Técnico / TITULO | UNDETERMINED | Resultado/registro `closure.*` (B16/D37), número de orden (M2; fuente todavía sin contrato de numeración). | B6; numeración U | No implementada; emisión B6 |

Los rótulos “número de orden”, resoluciones de programa/módulo, secciones, resultados y datos de firma requieren reglas institucionales adicionales. La matriz no asigna automáticamente un ID, correlativo, periodo, módulo ni aprobación.

## Matriz global campo → plantillas → fuente → estado

`buildFieldCoverage()` genera la relación exacta desde **una** declaración central. Ejemplos principales:

| Campo | Plantillas usuarias | Fuente | Estado productivo actual |
|---|---|---|---|
| Nombre CETPRO | 01, 02, 03, 18, 19 | `institution.nombre` | C |
| Tipo de Gestión | 01, 02, 04, 19 | `institution.tipoGestion` | C |
| Resoluciones institucionales | 01, 02, 03, 19 | `institution.resolucion*` | C en 02 para `resolucion`; variantes U |
| Código Modular | 01, 02, 03, 19 | `institution.codigoModular` | U |
| DRE | 02, 04, 19 | `institution.dre` | U |
| Provincia / Distrito | 01, 02, 19 | `institution.provincia/distrito` | U |
| Programa | 01–17, 19–20 | `program.nombre` | C cuando hay join validado |
| Módulo | 01, 02, 03–20 | `module.nombre` | B-004 |
| Periodo | 02, 05–17, 19 | `period.nombre` | B-007 |
| Número de Documento | 02, 03, 05–10, 19 | `student.numeroDocumento` | C cuando hay join validado |
| Apellidos y nombres | 01, 02, 05–19 | `student.apellidosNombres` | C cuando hay join validado |
| Unidades | 01, 02, 05–17, 19, 20 | `curriculum.units` | B-002 |
| Créditos / Horas | 01, 02, 19, 20 | `curriculum.credits/hours` | B-002 |
| Asistencia / evaluación / resultado | 05–17, 19 | `academicRecord.*` | B-002/B-003 |
| EFSRT | 18 | `efsrt.*` | B-005 |
| Cierre / numeración | 20, 21 | `closure.*` | B-006 / U |

El código exporta la cobertura exacta sin esta simplificación narrativa. Confirmar un campo institucional futuro debe actualizar su fuente operacional una sola vez; las plantillas que lo declaran recibirán el valor desde el mismo contexto, sujeto a confirmación de procedencia y bloqueo de emisión.

## Configuración operacional y procedencia

`CETPRO_DB.institucion` conserva mediante `#/configuracion` DRE, Código Modular, Departamento, Provincia, Distrito, las dos resoluciones de autorización separadas, dirección y teléfonos. Los cinco campos originalmente pendientes siguen vacíos hasta carga y confirmación explícitas; `confirmedSources` sólo marca los ingresados desde fuente oficial. El usuario validó físicamente el guardado de CONFIG-INSTITUTION-01 en Edge; DOCUMENT-BINDING-01 todavía espera su validación física. Faltan confirmar fuentes/contratos para resoluciones de conversión, programa y módulo y otros campos de plantillas futuras. B-002, B-004 y B-007 permanecen abiertas. No se habilitan Registro Académico, EFSRT, Cierre ni documentos oficiales.

## Matriz exhaustiva contrato → binding (21 plantillas)

`ContractStatus` es el estado **declarativo por defecto** del campo en `document-field-contract.js`, no una lectura de datos de Edge. Un campo `UNCONFIRMED` puede resolverse `CONFIRMED` cuando `confirmedSources` y un valor oficial existen; el usuario informó que los cinco pendientes de TMPL-02 pasaron a `CONFIRMED` en su preflight de Edge. `BindingStatus=MAPPED` significa caja PDF conectada y implementada; `UNMAPPED`, caja no enlazada aunque pueda existir físicamente; `NOT_IMPLEMENTED`, plantilla sin binding productivo; `FIXED_IN_TEMPLATE`, rótulo impreso por la fuente y no inyectable. TMPL-01 permanece sin conexión productiva.

| Plantilla | Campo contractual | ContractStatus declarativo | BindingStatus |
|---|---|---|---|
| TMPL-01 | `institution.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.tipoGestion` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.codigoModular` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.resolucionCreacion` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.resolucionConversion` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.provincia` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.distrito` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.direccion` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-01 | `institution.resolucionModulo` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `period.fechaInicio` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-01 | `period.fechaFin` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-01 | `enrollment.seccion` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `student.fechaNacimiento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-01 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-01 | `curriculum.credits` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-02 | `institution.nombre` | CONFIRMED | MAPPED |
| TMPL-02 | `institution.dre` | UNCONFIRMED | MAPPED |
| TMPL-02 | `institution.codigoModular` | UNCONFIRMED | MAPPED |
| TMPL-02 | `institution.departamento` | UNCONFIRMED | MAPPED |
| TMPL-02 | `institution.provincia` | UNCONFIRMED | MAPPED |
| TMPL-02 | `institution.distrito` | UNCONFIRMED | MAPPED |
| TMPL-02 | `institution.tipoGestion` | CONFIRMED | MAPPED |
| TMPL-02 | `institution.resolucion` | CONFIRMED | MAPPED |
| TMPL-02 | `program.nombre` | CONFIRMED | MAPPED |
| TMPL-02 | `module.nombre` | BLOCKED | UNMAPPED |
| TMPL-02 | `period.nombre` | BLOCKED | UNMAPPED |
| TMPL-02 | `student.numeroDocumento` | CONFIRMED | MAPPED |
| TMPL-02 | `student.apellidosNombres` | CONFIRMED | MAPPED |
| TMPL-02 | `period.clase` | UNCONFIRMED | UNMAPPED |
| TMPL-02 | `curriculum.units` | BLOCKED | UNMAPPED |
| TMPL-02 | `curriculum.subsanacionUnits` | BLOCKED | UNMAPPED |
| TMPL-02 | `curriculum.credits` | BLOCKED | UNMAPPED |
| TMPL-02 | `curriculum.hours` | BLOCKED | UNMAPPED |
| TMPL-02 | `program.nivelFormativo` | UNCONFIRMED | UNMAPPED |
| TMPL-02 | `program.tipoPlan` | UNCONFIRMED | UNMAPPED |
| TMPL-02 | `template.nivelFormativoLabel` | FIXED_IN_TEMPLATE | FIXED_IN_TEMPLATE |
| TMPL-02 | `template.tipoPlanLabel` | FIXED_IN_TEMPLATE | FIXED_IN_TEMPLATE |
| TMPL-02 | `template.fixedPeriodLegend` | FIXED_IN_TEMPLATE | FIXED_IN_TEMPLATE |
| TMPL-03 | `institution.codigoModular` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `institution.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `institution.resolucionPrograma` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-03 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `student.apellidoPaterno` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `student.apellidoMaterno` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `student.nombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `student.fechaNacimiento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-03 | `template.fixedPeriodLegend` | FIXED_IN_TEMPLATE | FIXED_IN_TEMPLATE |
| TMPL-04 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-04 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-04 | `institution.dre` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-04 | `institution.tipoGestion` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-05 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-05 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-05 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-05 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-05 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-05 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-05 | `academicRecord.attendance` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-05 | `academicRecord.absencePercent` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-06 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-06 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-06 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-06 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-06 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-06 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-06 | `academicRecord.attendance` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-06 | `academicRecord.absencePercent` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-07 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-07 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-07 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-07 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-07 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-07 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-07 | `academicRecord.attendance` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-07 | `academicRecord.absencePercent` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-08 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-08 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-08 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-08 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-08 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-08 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-08 | `academicRecord.attendance` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-08 | `academicRecord.absencePercent` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-09 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-09 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-09 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-09 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-09 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-09 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-09 | `academicRecord.attendance` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-09 | `academicRecord.absencePercent` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-10 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-10 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-10 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-10 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-10 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-10 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-10 | `academicRecord.attendance` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-10 | `academicRecord.absencePercent` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-11 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-11 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-11 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-11 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-11 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-11 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-11 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-11 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-12 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-12 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-12 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-12 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-12 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-12 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-12 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-12 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-13 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-13 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-13 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-13 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-13 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-13 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-13 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-13 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-14 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-14 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-14 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-14 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-14 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-14 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-14 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-14 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-15 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-15 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-15 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-15 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-15 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-15 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-15 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-15 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-16 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-16 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-16 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-16 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-16 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-16 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-16 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-16 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-17 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-17 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-17 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-17 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-17 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-17 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-17 | `curriculum.indicators` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-17 | `academicRecord.evaluations` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-18 | `institution.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-18 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-18 | `efsrt.hours` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-18 | `efsrt.experiences` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-18 | `efsrt.company` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-18 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.tipoGestion` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.codigoModular` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.resolucionCreacion` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.resolucionConversion` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.dre` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.provincia` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.distrito` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `institution.direccion` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-19 | `period.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-19 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-19 | `curriculum.credits` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-19 | `curriculum.hours` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-19 | `academicRecord.outcome` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-19 | `student.numeroDocumento` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-19 | `student.apellidosNombres` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-20 | `program.nombre` | CONFIRMED | NOT_IMPLEMENTED |
| TMPL-20 | `module.nombre` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `curriculum.units` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `curriculum.credits` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `curriculum.hours` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `curriculum.capabilities` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `closure.result` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `closure.registrationCode` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-20 | `closure.orderNumber` | UNCONFIRMED | NOT_IMPLEMENTED |
| TMPL-21 | `closure.result` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-21 | `closure.registrationCode` | BLOCKED | NOT_IMPLEMENTED |
| TMPL-21 | `closure.orderNumber` | UNCONFIRMED | NOT_IMPLEMENTED |

Esta tabla se reproduce con `node scripts/build_document_binding_coverage.js`. TMPL-02 tiene 11 cajas `MAPPED`; TMPL-03–21 siguen `NOT_IMPLEMENTED` para datos variables. El preflight devuelve `mappedAvailableFields` y `unmappedAvailableFields` sin presentar esos términos técnicos a Secretaría.
