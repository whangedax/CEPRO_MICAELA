# DOCUMENT-MASTER-AUDIT-01 — grafo de dependencias

Este grafo es una **arquitectura objetivo**, no ejecución ni desbloqueo. Flecha `→` significa dato/prerrequisito requerido. Las ramas académicas crudas pueden existir en entornos aislados sin permitir emisión.

```text
INSTITUCIÓN oficial ─────────────────────────────┐
ESTUDIANTE ──→ MATRÍCULA seleccionada ───────────┤
PROGRAMA ────→ GRUPO registrado ──────────────────┤
                ├→ MÓDULO asignado [B-004] ───────┤
                ├→ PERIODO confirmado [B-007] ───┤
                └→ CURRÍCULO/UD [B-002] ──────────┤
                                                  │
                 ├→ ASISTENCIA + sesiones [norma] │
                 ├→ EVALUACIÓN + indicadores      │
                 └→ EFSRT + entidad/criterios     │
                                  ↓               │
                         CIERRE [norma oficial]   │
                                  ↓               │
                         ACTA [19]                │
                                  ↓               │
                         CERTIFICACIÓN [20]       │
                                  ↓               │
                         TÍTULO [21]              │
                                                  │
AUTORIDADES + REGISTRO DE EMISIÓN [B-006] ────────┘
```

La distribución no es lineal para todos los PDF: **02** puede mostrar estudiante/programa/institución antes de contar con currículo, pero queda parcial; **01/03/04** necesitan GROUP/module/period para ser completos; **05–17** requieren currículo además de sesiones/indicadores; **18** necesita módulo, datos EFSRT y nueve criterios; **19–21** requieren cierre y emisión. B-001 impide As-7 físico aunque 17 existe. Los bloqueos no se levantan con un renderer.

## Flujo documental único propuesto

```text
SelectedContext (matriculaId / groupKey / expedienteId)
  → DocumentDataService (lectura explícita, sin inventar joins)
  → CanonicalDocumentContext (student ≠ enrollment; provenance por campo)
  → DocumentFieldResolver (una canonicalKey, fuente/formatter)
  → ResolvedFieldSet (valor + estado + procedencia; vacío si bloqueado)
  → DocumentValidationService (ContractStatus + SourceReadiness + BindingStatus)
  → Preflight (capacidad, faltantes, norma, elegibilidad, emisión)
  → TemplateBindingManifest (campo → caja física + styleProfile)
  → PdfTemplateEngine (solo pintar; sin consultas a IndexedDB)
```

El PDF no contiene lógica académica; el renderer no consulta la DB ni deriva notas. `DocumentsView` selecciona contexto y expone preflight; nunca fabrica periodo, módulo, alumnos o fixtures en producción. Un manifiesto por PDF puede mapear una misma clave a varias cajas físicas, pero la resolución ocurre **una sola vez** antes de pintar. `FIXED_IN_TEMPLATE` permanece fuera de `ResolvedFieldSet` y un campo `REVIEW_REQUIRED` nunca se rellena automáticamente.

## Fuentes y cortes de construcción

| Corte | Puede trabajarse sin desbloquear | No puede declararse completo todavía |
|---|---|---|
| Maestros | identidad, nombre/programa real, institución confirmada, consulta de matrículas | resoluciones individuales, foto/logo/autoridades no confirmados |
| Contexto | selección de `matriculaId`, filtros de grupo, preflight de capacidad | asignación módulo B-004, periodo B-007, curricular B-002 |
| Registro crudo | modelos técnicos de asistencia/evaluación/EFSRT en DB aislada | resultados, porcentajes, logro, ponderación/cierre sin norma |
| Emisión | catálogo/preview sin escritura | acta/certificado/título oficial, correlativos, firmas y registro B-006 |

No confundir dependencia gráfica con autorización para crear datos faltantes o modificar el funcionamiento presente.
