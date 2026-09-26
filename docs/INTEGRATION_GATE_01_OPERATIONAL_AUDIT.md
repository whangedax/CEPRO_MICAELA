# INTEGRATION-GATE-01 — Auditoría de operatividad real

Fecha: 2026-09-14  
Alcance: lectura y operación controlada de los 11 módulos del menú principal, sin implementar plantillas nuevas ni completar fuentes académicas ausentes.

## Método y entorno

- Navegador Chromium aislado contra `http://127.0.0.1:8080/app/index.html`.
- Base efímera `CETPRO_DB` hidratada con la fuente real disponible: 1 institución, 7 programas, 14 módulos, 269 estudiantes, 295 matrículas y 295 filas de staging.
- Se recorrieron navegación, búsquedas, acciones disponibles, persistencia tras recarga y errores de consola.
- La prueba de CRUD agregó un estudiante exclusivamente dentro del perfil efímero (269 → 270); no modificó la base del usuario.
- La generación documental se verificó como read-only: `documentos = 0` antes y después.

## Clasificación por módulo

| Módulo | Clasificación | Evidencia operativa | Brecha / bloqueo |
|---|---|---|---|
| Inicio | PARTIAL | Ruta y diagnóstico IndexedDB cargan; 7 programas y 14 módulos reales visibles. | Muestra `0 Matrículas Registradas` aunque la base aislada contiene 295. |
| Estudiantes | REAL_DB_CONNECTED | Búsqueda, alta, edición y persistencia después de recarga verificadas. | Sin brecha crítica observada en este gate. |
| Matrículas | PARTIAL | Búsqueda y detalle leen registros reales; la configuración por grupo está disponible. | La asignación efectiva queda bloqueada por periodo oficial ausente y B-004/B-007. |
| Programas y Módulos | REAL_DB_CONNECTED | Se muestran 7 tarjetas del catálogo real; búsqueda positiva y estado vacío funcionan. | Catálogo de solo lectura por diseño. |
| Registro Académico | BLOCKED_BY_SOURCE | La ruta carga y evalúa prerrequisitos reales. | Operación productiva bloqueada por periodo, módulos y unidades oficiales ausentes; control de prueba identificado. |
| EFSRT | BLOCKED_BY_SOURCE | La ruta carga y muestra el bloqueo productivo real. | Depende de fuentes/reglas oficiales B-002/B-005/B-007; control de prueba identificado. |
| Cierre Académico | BLOCKED_BY_SOURCE | Diagnóstico read-only reconoce una matrícula real y declara cierre oficial bloqueado. | No puede habilitar cierre sin completar prerrequisitos y reglas oficiales. |
| Documentos | PARTIAL | TMPL-02 busca, selecciona, reconstruye contexto, genera Blob PDF y abre visor; TMPL-01 queda realmente deshabilitada. | TMPL-01 pendiente de conexión productiva por grupo. No se habilitó ninguna plantilla adicional. |
| Incidencias | REAL_DB_CONNECTED | Lee las 295 filas reales de staging y la búsqueda funciona. | La importación permanece controlada/bloqueada por diseño histórico. |
| Respaldo y Restauración | PARTIAL | Exportación JSON real comprobada. | La restauración no se ejecutó durante esta auditoría para evitar una mutación destructiva; permanece cubierta por pruebas aisladas previas. |
| Configuración | PARTIAL | Diagnóstico IndexedDB y formulario de periodo cargan. | El botón de guardado institucional falla: intenta leer `inst-telefono`, `inst-correo` e `inst-resolucion`, controles que no existen. Hallazgo I-047. |

## Hallazgos priorizados

1. **P0 — I-047:** reparar el guardado institucional de Configuración en una iteración administrativa dedicada.
2. **P1 — I-052:** reconciliar la métrica de matrículas del tablero con el conteo físico de `matriculas`.
3. **P1 — Fuentes oficiales:** completar periodo, módulo por grupo y unidades antes de habilitar Registro, EFSRT, Cierre o TMPL-01.
4. **P3 — I-050:** agregar o eliminar la solicitud de `favicon.ico` para retirar el 404 cosmético.

## Resultado documental del gate

El flujo común quedó en estados explícitos `IDLE → SEARCHING → RESULTS → SELECTED → GENERATING → READY`, con transición a `ERROR` visible ante fallos. Una búsqueda nueva o un cambio de plantilla invalida la matrícula anterior. `TMPL-02` conserva únicamente `selectedEnrollmentId` y reconstruye el contexto mediante `buildEnrollmentContext(id)` al generar. `TMPL-01` no parece activa ni contiene fixtures productivos.

