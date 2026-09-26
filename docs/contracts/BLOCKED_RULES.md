# Registro de Reglas Institucionales Bloqueadas (M00 / M05.3)

## 1. Declaración de Bloqueos Institucionales

De acuerdo a las reglas del proyecto, **está estrictamente prohibido inventar datos o reglas académicas**. Todo aspecto funcional que carezca de especificación oficial probada en las fuentes se registra como **BLOQUEADO** hasta que la institución o la UGEL entregue la normativa correspondiente.

---

## 2. Inventario de Reglas Bloqueadas

### B-001: Ausencia de Plantilla `ASISTENCIA_UD7` (As-7)
- **Origen del Bloqueo**: El paquete oficial contiene 21 plantillas recibidas. Las plantillas de asistencia abarcan únicamente desde `05_ASISTENCIA_UD1.xlsx` hasta `10_ASISTENCIA_UD6.xlsx` (As-1 a As-6). Las plantillas de evaluación abarcan desde `11_EVALUACION_IL_UD1.xlsx` hasta `17_EVALUACION_UD7.xlsx` (UD1 a UD7).
- **Regla Inviolable**: **No existe una plantilla `As-7` o `ASISTENCIA_UD7` en la fuente original y QUEDA PROHIBIDO CREARLA O INVENTARLA por suposición**.
- **Efecto Operativo**: Si un programa académico posee una 7ª Unidad Didáctica (UD7), la generación del formato/plantilla documental de asistencia para UD7 queda en estado **BLOQUEADO** hasta recibir la plantilla oficial. **Nota de Desacoplamiento (M06.2):** Esta restricción es exclusivamente de nivel de plantillas/documentos; el MOTOR DE ASISTENCIA (`AttendanceService`) está completamente desacoplado y es capaz de registrar y consultar asistencia para UD7 o cualquier otra unidad técnica oficial o de prueba sin exigir la plantilla `As-7`.

### B-002: Catálogo Curricular Oficial Completo (Unidades Didácticas) — MANTIENE BLOQUEO ABIERTO
- **Origen del Bloqueo**: `CARRERAS.jpeg` proporciona una referencia gráfica provisional de 7 programas y 14 módulos, pero no incluye el desglose oficial de Capacidades, Indicadores de Logro, Unidades Didácticas por módulo, Créditos ni Horas oficializadas por Plan de Estudios.
- **Regla Inviolable**: Se prohíbe inventar códigos de capacidad o indicadores ficticios para rellenar la base de datos productiva. El store `unidades` permanece en 0 en la base productiva `CETPRO_DB`.
- **Efecto Operativo**: La carga de planes de estudio detallados se posterga hasta contar con fuente oficial entregada por jefatura. `AcademicReadinessService` bloquea asistencia y evaluación hasta que las unidades sean registradas.

### B-003: Reglas de Evaluación, Redondeo, Recuperación y Asistencia — MANTIENE BLOQUEO ABIERTO
- **Origen del Bloqueo**: No se dispone de la directiva institucional vigente sobre:
  - Nota mínima aprobatoria (ej: 13, 11 o cualitativa).
  - Criterios de redondeo en notas finales y uso de decimales.
  - Fórmula oficial de promedio modular (ponderado vs aritmético) y ponderación de indicadores.
  - Proceso, plazo y mecanismos para evaluación de recuperación, subsanación o exámenes sustitutorios.
  - Límite o estructura formal de intentos/evidencias por indicador.
  - Porcentaje máximo permitido de inasistencias y reglas de inhabilitación.
  - Declaración de resultado académico final (Aprobado / Desaprobado / Retirado).
- **Confirmación Contractual**: La escala numérica de almacenamiento **0 a 20** SÍ está **CONFIRMADA** en `DATA_CONTRACTS.md` (Entidad 13: `nota (0-20)`).
- **Regla Inviolable**: El sistema no aplicará lógica de inhabilitación, promedios ni redondeo inventados.
- **Efecto Operativo**: El módulo M07 (Evaluación) implementa la captura, persistencia, edición explícita auditada y consulta de valores puramente numéricos (0–20) sin calcular ni declarar resultados académicos finales no oficializados.

### B-004: Asignación de Módulo I / Módulo II por Grupo — MANTIENE BLOQUEO ABIERTO
- **Origen del Bloqueo**: Las listas de estudiantes en `sources/raw/BD.zip` corresponden a grupos/turnos por especialidad, pero no identifican unívocamente la asignación a Módulo I o Módulo II en los 12 archivos.
- **Regla Inviolable**: Queda prohibido inferir o asignar automáticamente el Módulo I o II por sospecha o concordancia de nombre. Las 295 matrículas mantienen `moduloId = null`.
- **Efecto Operativo**: La asignación de módulo requiere confirmación administrativa explícita por Secretaría desde la interfaz `#/matriculas`.

### B-005: Normativa e Integración de EFSRT — MANTIENE BLOQUEO ABIERTO
- **Origen del Bloqueo**: Falta el reglamento institucional de Experiencias Formativas en Situación Real de Trabajo (EFSRT) con requisitos de convalidación, acumulación y horas mínimas exigidas por módulo.
- **Regla Inviolable**: No se marcará EFSRT como aprobado/APTO automáticamente sin registro oficial de sustento, ni se restringirá arbitrariamente la cantidad de experiencias ni horas por suposición.
- **Efecto Operativo**: El módulo M08 implementa la gestión técnica de trazabilidad de registros EFSRT en base aislada `CETPRO_M08_TEST_DB` sin aplicar reglas de convalidación, horas mínimas ni dictámenes de titulación inventados.

### B-006: Proceso de Emisión de Certificados y Títulos (Auxiliar Técnico)
- **Origen del Bloqueo**: Falta el procedimiento formal de foliado, numeración correlativa institucional y validación de requisitos de egreso para las plantillas 20 y 21.
- **Regla Inviolable**: La emisión documental final requerirá validación de prerrequisitos sin obviar autorizaciones faltantes.

### B-007: Periodo Académico Oficial Pendiente — MANTIENE BLOQUEO ABIERTO
- **Origen del Bloqueo**: La jefatura del CETPRO no ha entregado aún la resolución institucional de apertura del periodo lectivo oficial (fechas de inicio/fin y denominación formal).
- **Regla Inviolable**: Queda estrictamente prohibido crear periodos sintéticos o inferidos automáticamente (ej. `2026-I`). El store `periodos` permanece en 0 en la base productiva `CETPRO_DB`.
- **Efecto Operativo**: `AcademicReadinessService` bloquea asistencia y evaluación mientras `periodoId` permanezca nulo en las matrículas.
