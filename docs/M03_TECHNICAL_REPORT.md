# Informe Técnico del Módulo M03 — Estudiantes

**Fecha de Cierre**: 2026-09-11  
**Estado del Módulo**: `M03 COMPLETADO — APTO PARA M04`  
**Entorno de Ejecución**: HTML5 + CSS3 Nativo + JavaScript ES6+ + IndexedDB `CETPRO_DB` v1 (100% Offline)  

---

## 1. Archivos Creados y Modificados

### Repositorios y Servicios (`app/js/repositories/` & `app/js/services/`)
- `app/js/repositories/student-repository.js`: Repositorio para la entidad Estudiantes con función `normalizeSearchString` para búsquedas insensibles a tildes y mayúsculas manteniendo inalterado el almacenamiento original.
- `app/js/services/student-service.js`: Servicio de negocio con generación de ID técnico `EST-YYYYMMDD-XXXXX`, validación de fechas de nacimiento no futuras, control de conflictos documentales (`ImportConflictError`), borrado lógico y auditoría inmutable.

### Interfaz de Usuario (`app/js/ui/`)
- `app/js/ui/students-view.js`: Vista interactiva del padrón de estudiantes (`#/estudiantes`) con tabla de escritotio, tarjetas responsive en móviles, modal de alta/edición, expediente completo del estudiante y sanitización HTML nativa (`escapeHtml`) contra ataques XSS.
- `app/js/ui/layout.js`: Conexión de la vista de estudiantes con el enrutador cliente.

### Documentación y Pruebas (`docs/` & `tests/`)
- `docs/M03_TECHNICAL_REPORT.md`: Informe técnico completo de la entrega M03.
- `tests/m03_tests.js`: Suite de pruebas técnicas automatizadas M03 (20/20 aprobadas).

---

## 2. Políticas de Dominio e Identidad Implementadas

1. **Política de Identidad e ID Técnico (`EST-...`)**:
   - La clave primaria de cada estudiante es un identificador técnico estable (`EST-YYYYMMDD-XXXXX`).
   - El documento civil (DNI, CE, Pasaporte) **no es la clave primaria**; puede ser corregido o modificado administrativamente sin alterar la identidad interna del registro ni sus relaciones futuras.
2. **Tratamiento Estricto de Documentos de Identidad**:
   - `numeroDocumento` se almacena obligatoriamente como tipo **texto (`string`)**, preservando ceros iniciales (ej: `'01704242'`, `'02420748'`).
   - Queda prohibida la conversión implícita a número o la eliminación automática de ceros a la izquierda.
3. **Búsqueda Normalizada e Inmutabilidad de Origen**:
   - La búsqueda en `StudentRepository` normaliza las cadenas a minúsculas y sin tildes NFD (ej: buscar `"guzman"` encuentra al estudiante `"Guzmán"`).
   - **Regla Inviolable**: La normalización aplica únicamente en memoria durante la consulta; el valor almacenado en IndexedDB conserva su ortografía y acentuación original.
4. **Prevención de Duplicados y Fusión Prohibida**:
   - Intento de alta con tipo + número de documento idéntico genera un conflicto controlado (`ImportConflictError`) mostrando el registro existente para revisión.
   - **PROHIBIDO FUSIONAR AUTOMÁTICAMENTE**: Dos personas con nombres o datos similares se tratan como `PERSONA A ≠ PERSONA B` hasta revisión humana explícita.
5. **Borrado Lógico (Soft Delete)**:
   - Los estudiantes desactivados cambian su estado a `INACTIVO`. Ningún registro se elimina físicamente del Object Store.
6. **Seguridad de Datos y Protección XSS**:
   - Toda renderización de datos de usuario utiliza la función de sanitización `escapeHtml()` convirtiendo caracteres peligrosos (`<`, `>`, `&`, `"`, `'`) en entidades HTML.

---

## 3. Conteos Reales en `CETPRO_DB` Productiva

| Entidad / Store | Conteos Reales | Estado / Observación |
|---|---|---|
| **INSTITUCIONES** | **1** | CETPRO Público "MICAELA BASTIDAS PUYUCAWA" |
| **PROGRAMAS** | **7** | 7 Programas oficiales de `CARRERAS.jpeg` |
| **MÓDULOS** | **14** | 14 Módulos Curriculares |
| **PERIODOS** | **0** | Base productiva limpia |
| **ESTUDIANTES** | **0** | **0 estudiantes**. (Las 20 pruebas ejecutaron en `CETPRO_TEST_DB` aislada) |
| **MATRÍCULAS** | **0** | **0 matrículas**. |
| **UNIDADES** | **0** | **0 unidades**. Regla B-002 intacta |
| **AUDITORÍA** | **1+** | Bitácora inmutable de eventos |

---

## 4. Matriz de Pruebas Ejecutadas (20 de 20 Aprobadas)

Se ejecutó la suite automatizada [m03_tests.js](file:///c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/tests/m03_tests.js):

| ID Prueba | Descripción | Resultado | Evidencia |
|---|---|---|---|
| **T-M03-01** | Crear estudiante válido en entorno aislado | **APROBADA** | `StudentService.createStudent` OK |
| **T-M03-02** | El estudiante recibe ID técnico estable `EST-...` | **APROBADA** | ID `EST-YYYYMMDD-XXXXX` OK |
| **T-M03-03** | `numeroDocumento` se conserva obligatoriamente como texto (`string`) | **APROBADA** | Tipo `string` verificado OK |
| **T-M03-04** | Documento con cero inicial conserva el cero (ej: `"01704242"`) | **APROBADA** | Cero inicial preservado OK |
| **T-M03-05** | Buscar por documento encuentra al estudiante | **APROBADA** | Búsqueda por documento OK |
| **T-M03-06** | Buscar por apellido o nombres encuentra al estudiante | **APROBADA** | Búsqueda por nombres/apellidos OK |
| **T-M03-07** | Búsqueda sin tilde `"guzman"` encuentra `"Guzmán"` sin alterar origen | **APROBADA** | Búsqueda normalizada inmutable OK |
| **T-M03-08** | Documento duplicado genera conflicto controlado (`ImportConflictError`) | **APROBADA** | `ImportConflictError` preventivo OK |
| **T-M03-09** | Nombres similares no se fusionan automáticamente (`PERSONA A ≠ PERSONA B`) | **APROBADA** | Fusión automática prohibida OK |
| **T-M03-10** | Editar estudiante conserva el `idEstudiante` (`EST-...`) | **APROBADA** | ID técnico inalterado en edición |
| **T-M03-11** | La edición genera auditoría con `estadoAnterior` y `estadoNuevo` | **APROBADA** | Bitácora con ambos estados OK |
| **T-M03-12** | Desactivar estudiante realiza borrado lógico (`estado = INACTIVO`) | **APROBADA** | Soft delete en `INACTIVO` OK |
| **T-M03-13** | `AuditService` continúa siendo append-only | **APROBADA** | `AuditError` al intentar mod/del OK |
| **T-M03-14** | Fecha de nacimiento futura es rechazada obligatoriamente | **APROBADA** | `ValidationError` por fecha futura OK |
| **T-M03-15** | Entrada XSS (`<script>alert(1)</script>`) se sanitiza a texto plano | **APROBADA** | `escapeHtml` prevenido OK |
| **T-M03-16** | Listado de estudiantes en vista escritorio (Tabla) | **APROBADA** | Tabla responsive escritorio OK |
| **T-M03-17** | Ficha/formulario en vista móvil (Tarjetas) | **APROBADA** | Tarjetas móviles OK |
| **T-M03-18** | Cero conexiones externas a Internet o CDNs | **APROBADA** | 100% Offline OK |
| **T-M03-19** | Funciona con Internet desconectado | **APROBADA** | Cero dependencias externas |
| **T-M03-20** | `CETPRO_DB` productiva continúa limpia (**0 estudiantes**, **0 matrículas**) | **APROBADA** | Base productiva con 0 estudiantes |

- **Total Pruebas Ejecutadas**: 20
- **Pruebas Aprobadas**: 20 (100%)
- **Pruebas Fallidas**: 0
- **Pruebas No Ejecutadas**: 0

---

## 5. Decisiones Técnicas Tomadas en M03

1. **D-016**: Adopción de la función `escapeHtml()` en todos los componentes de renderizado de la UI para garantizar protección contra vectores de ataque XSS.
2. **D-017**: Ejecución de la suite de pruebas de estudiantes (`m03_tests.js`) en la base de datos aislada `CETPRO_TEST_DB` para mantener en 0 los estudiantes de `CETPRO_DB` productiva.
3. **D-018**: Normalización NFD exclusivamente durante el filtrado de consultas en `StudentRepository`, asegurando que los registros almacenados en IndexedDB preserven exactamente los acentos y mayúsculas ingresados.
