# Informe Técnico de M08 — EFSRT (Experiencias Formativas en Situaciones Reales de Trabajo)

## 1. Resumen Ejecutivo
El módulo M08 implementa la arquitectura, servicios, validaciones e interfaz de usuario para la gestión de Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT), Entidad 14 del dominio del Sistema Académico CETPRO. El módulo ha sido desarrollado y verificado íntegramente en el entorno de prueba aislado `CETPRO_M08_TEST_DB`, manteniendo la base productiva `CETPRO_DB` con `EFSRT = 0` y bloqueada mediante el control de prerrequisitos de `AcademicReadinessService`.

---

## 2. Contrato y Arquitectura
La arquitectura sigue la separación estricta en 4 capas:
1. **Interfaz (UI):** `EfsrtView` (`app/js/ui/efsrt-view.js`)
2. **Servicios de Negocio:** `EfsrtService` (`app/js/services/efsrt-service.js`) y `AcademicReadinessService` (`app/js/services/academic-readiness-service.js`)
3. **Acceso a Datos (Repositorio):** `EfsrtRepository` (`app/js/repositories/efsrt-repository.js`) hereda de `BaseRepository`
4. **Persistencia Local:** Object store `efsrt` en IndexedDB

---

## 3. Campos Contractuales y Extensiones Técnicas
- **Campos del Contrato de Datos (Entidad 14):**
  - `id`: Prefijo `EFSRT-` + UUID v4 u opaco.
  - `matriculaId`: Referencia a la matrícula del estudiante.
  - `moduloId`: Referencia al módulo curricular configurado.
  - `empresa`: Nombre de la empresa u organización.
  - `horasRealizadas`: Número no negativo.
  - `fechaInicio`: Fecha ISO (`YYYY-MM-DD`).
  - `fechaFin`: Fecha ISO opcional (`fechaFin >= fechaInicio`).
  - `nota`: Nota vigesimal opcional (0 a 20).
  - `estado`: Estado operativo (`REGISTRADO`, `ANULADO`).

- **Extensiones Técnicas del Sistema:**
  - `observacion`: Observaciones o detalles técnicos.
  - `estadoLogico`: Estado de control lógico (`ACTIVO`, `ANULADO`).
  - `creadoEn`: Timestamp ISO de creación.
  - `actualizadoEn`: Timestamp ISO de última actualización.

---

## 4. Bloqueo B-005 (Mantenido Abierto)
Se preservan como decisiones no inferidas (bloqueo B-005):
- No se definen horas mínimas/máximas oficiales de EFSRT.
- No se emiten dictámenes de APTO / NO APTO ni aprobaciones automáticas.
- No se aplican convalidaciones laborales sin sustento reglamentario.
- No se exige cantidad oficial obligatoria de experiencias por matrícula.

---

## 5. Trazabilidad y Auditoría
- Las operaciones de creación (`registerEfsrt`), edición explícita (`updateEfsrt`) y anulación lógica (`cancelEfsrt`) generan registros inmutables en la bitácora de auditoría (`auditoria`) con `REGISTRO_EFSRT`, `EDICION_EFSRT` y `ANULACION_EFSRT`.
- `AuditService` se invoca mediante su API singleton `AuditService.record(...)`.

---

## 6. Pruebas y Cobertura
- Matriz de 30 pruebas unitarias e integrales en `tests/m08_tests.js` aprobada al 100%.
- Integración completa en el script dinámico de verificación `node scripts/verify_project.js`.
