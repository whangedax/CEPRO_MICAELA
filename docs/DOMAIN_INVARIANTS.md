# Invariantes del dominio y documentos

Fecha: 2026-09-15. `MUST` significa validación previa a operación, no inferencia desde campos parecidos. En v1 los grupos son agregados provisionales por `grupoCode`; el auditor read-only detecta fallas sin repararlas.

| ID | Regla | Estado de protección actual |
|---|---|---|
| INV-001 | Matrícula → estudiante existente por `estudianteId` | Contexto ENROLLMENT + auditor |
| INV-002 | Matrícula → programa existente por `programaId` | Contexto ENROLLMENT + auditor |
| INV-003 | Grupo pertenece a exactamente un programa | Agrupador, write path + auditor |
| INV-004 | Grupo tiene máximo un módulo activo | Agrupador, write path + auditor |
| INV-005 | Módulo asignado pertenece al programa del grupo | Agrupador, write path, contexto + auditor |
| INV-006 | Grupo tiene máximo un periodo vigente para ese contexto | Agrupador, write path, contexto + auditor; identidad v1 insuficiente |
| INV-007 | Matrícula no hereda módulo de otro grupo | Requiere `grupoId` v2; v1 compara código/contexto |
| INV-008 | Estudiante no sustituye contexto de matrícula | DocumentDataService usa joins por IDs |
| INV-009 | Documento GROUP acepta solo grupo consistente | buildGroupContext bloquea mixtos y vínculos faltantes |
| INV-010 | Documento ENROLLMENT usa solo matrícula seleccionada | buildEnrollmentContext(id), selección documental |
| INV-011 | B-002 prohíbe inferir currículo | Unidades/créditos/horas vacíos hasta fuente oficial |
| INV-012 | B-004 prohíbe inferir módulo | `moduloId=null` no se preselecciona ni resuelve por similitud |
| INV-013 | B-007 prohíbe inferir periodo | `periodoId=null` no adopta leyenda fija `AÑO 2026 - I` del PDF |
| INV-014 | Cada dato `CONFIRMED+MAPPED` debe aparecer en PDF emitido/preview permitido | DOCUMENT-BINDING-01 verificado para cinco campos TMPL-02; ampliar a 21 |
| INV-015 | Preflight bloqueado ⇒ ninguna emisión oficial | DocumentService bloquea; store documentos permanece vacío |
| INV-016 | `sourceGroupCode` conserva trazabilidad histórica, no es identidad global | Política v2; sin migración |
| INV-017 | Una matrícula pertenece a un grupo académico inequívoco para su contexto | Requiere `grupoId` v2 |
| INV-018 | Cambio de grupo/módulo/periodo requiere snapshot vigente y auditoría atómica | UI coteja IDs/periodo/N/módulo; política futura grupoId |
| INV-019 | Referencias de unidad/indicador/registro académico existentes | Auditor read-only reporta huérfanos |
| INV-020 | Campo `UNCONFIRMED`, `BLOCKED` o sin mapping no se inventa ni imprime como hecho | Contrato universal/preflight; 03–21 binding pendiente |
| INV-021 | Fuente PDF/XLSX canónica y hash permanecen inmutables | Auditoría previa; ninguna modificación aquí |
| INV-022 | Preview no persiste `documentos`; oficial requiere permiso explícito | DocumentService; emisión bloqueada |

Para GROUP+MODULE, ATTENDANCE+GROUP, EVALUATION+GROUP, EFSRT+GROUP y CLOSURE+GROUP se aplican INV-003..013 antes de resolver registros hijos. Para CERTIFICATION+ENROLLMENT, INV-001/002/008/010; TITLE+EXPEDIENTE requiere expediente confirmado y asociación explícita (aún no implementada). Ninguna combinación autoriza llenar campos vacíos por parecido textual o una plantilla vecina. Las 21 fuentes son cobertura de contrato/auditoría, no 21 bindings productivos.

`ReferentialAuditService` lee en una sola transacción `readonly` los stores v1 y reporta matrícula sin estudiante/programa, módulo/periodo faltante, módulo de programa diferente, grupo mixto, unidad/indicador huérfano y registro académico sin matrícula/unidad/módulo/indicador. No borra, corrige ni registra auditoría; cualquier reporte requiere revisión humana de fuente y respaldo antes de corrección futura.

Para el schema v2 propuesto se incorporan INV-G01..INV-G18 de `MIGRATION_V1_V2_INVARIANTS.md`: pertenencia matrícula→grupo, programa coincidente, trazabilidad exacta, cero inferencias y equivalencia pre/post. Son invariantes probadas en laboratorio, no garantías de una instalación Edge todavía no migrada.
