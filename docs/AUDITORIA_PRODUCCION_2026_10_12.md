# Auditoría de preparación para producción

Fecha: 12 de octubre de 2026. Programa distribuible: 4.8.0.

## Dictamen

Los flujos técnicos probados están aprobados. La base institucional tiene integridad física y relaciones correctas, pero **su configuración y sus datos todavía no permiten aprobar el despliegue institucional completo**. No se borraron ni confirmaron por suposición matrículas, notas o asistencias.

## Pruebas ejecutadas

| Verificación | Resultado |
| --- | --- |
| Suite interna ampliada | 114 pruebas aprobadas, cero fallos, cero canceladas |
| Interfaz de Dirección, Secretaría y Docente | 12 recorridos aprobados, cero fallos |
| Nueva comprobación de producción de solo lectura | Aprobada: detecta pendientes y no escribe en la base |
| Arranque con puerto ocupado o inválido | Aprobado: termina con error y libera el bloqueo |
| Asignación provisional editable | Aprobada: carrera y turno separados, repetición sin cambios y registros académicos preservados |
| Paquete en instalaciones nuevas e independientes | Catálogos, cuentas propias, vinculación, permisos, intercambio y respaldo aprobados |
| Generación desde el paquete distribuible | 21 plantillas aprobadas y casillas dentro de sus límites |
| Revisión visual de las plantillas de ensayo | 24 páginas renderizadas e inspeccionadas |
| Documentos con copia consistente de datos reales | 479 PDF generados, cero errores, 25 aulas |
| Repetición tras asignar los cuatro docentes | 196 PDF de diez aulas generados, cero errores |
| Conservación de registros durante auditoría documental | Alumnos, matrículas, notas y asistencias preservados |

Se verifica el rechazo de rutas privadas, llamadas sin sesión y peticiones de origen ajeno. El paquete se coteja con su manifiesto SHA256 y no incorpora la base institucional, credenciales ni claves privadas. Se ensaya el intercambio Docente → Secretaría → Docente, incluido un nuevo alumno, preservando una nota cero y una tardanza, además de paquetes duplicados y clave incorrecta. Se restaura una copia completa y se rechaza un respaldo corrupto.

El primer arranque del paquete final se probó también desde Edge: configuración de una Dirección nueva y entrada al panel, sin errores de JavaScript. El ensayo usa el Node incluido en el paquete, en bases y perfiles de navegador separados de la instalación real. La suite ampliada agotó inicialmente su límite de cuatro minutos durante los renderizados simultáneos; se amplió a diez minutos y se completó correctamente, sin ocultar fallos de aserción.

Las pruebas internas cubren también conflictos, asignaciones fuera de contexto, importación JSON/CSV/XLSX/tablas, aislamiento por unidad, entregas ficticias/incompletas, fallos de espacio para respaldo, relaciones inválidas y separación de años. Los recorridos de interfaz verifican las guías de los roles, cuentas por contexto, carrusel de unidades, modal de asistencia, calificaciones y sincronización.

## Correcciones y controles añadidos

- El servicio termina de forma controlada si no puede abrir sus puertos: no queda una instalación parcialmente iniciada con bloqueo residual.
- `VERIFICAR_PRODUCCION_CETPRO.bat` inspecciona la base sin inicializarla ni modificarla. Revisa integridad, historial de simulaciones, planes pendientes, matrículas provisionales, cuentas de ensayo, docentes sin asignación y campos documentales incompletos.
- Se agrega un ensayo específico del paquete, incluidas sus dependencias y fuentes, y una auditoría de documentos sobre una copia consistente obtenida desde una conexión de solo lectura.
- Se entrega una guía de instalación, actualización conservando la base, vinculación de equipos, renovación de autorización, respaldos externos y gestión de años posteriores.

## Pendientes institucionales encontrados

| Pendiente | Cantidad y acción |
| --- | --- |
| Historial de simulación/limpieza de asistencia | 8 combinaciones de aula y unidad; contrastar registros originales y documentar su revisión |
| Planes con unidades propuestas | 3 módulos, 16 unidades; confirmar denominaciones y distribución con el plan institucional |
| Matrículas activas provisionales | 588; confirmar pertenencia o excluir solo del módulo incorrecto |
| Docentes activos sin aulas asignadas | Resuelto por autorización del usuario: cuatro asignaciones provisionales editables; cero docentes pendientes |
| Cuentas de prueba activas | 3; revisar, cambiar accesos o desactivar antes de operar oficialmente |
| Documentos con parámetros pendientes | 473 de 479 revisados; resolver los campos indicados en su vista previa |

La base contiene 271 estudiantes, 592 matrículas, 25 aulas, 4 registros de notas y 1.577 marcas de asistencia en el momento de la inspección. Los números de documentos indican combinaciones de plantilla y aula revisadas; las fichas individuales se ensayan con una matrícula por aula y no representan todos los certificados de todos los alumnos.

La emisión sigue bloqueada cuando faltan parámetros requeridos o se usa demostración. Las propuestas de calendario y de unidades continúan siendo editables. Aprobar las pruebas no convierte esas propuestas en datos oficiales.

## Asignaciones autorizadas durante la auditoría

Magda quedó asignada a las aulas 007 y 008 de Computación, presencial y virtual. Teófilo al grupo 010 de Corte, noche; René al 011, tarde; Liz al 009, mañana. Se incluyeron ambos módulos y sus unidades, incluida EFSRT. La distribución de Corte utiliza el turno del directorio y el de las aulas existentes; el turno de Computación permanece pendiente por diferencias entre fuentes.

Son asignaciones provisionales que Dirección puede corregir desde **Usuarios y asignaciones**. Se creó una copia previa, se registró auditoría y se comprobó la integridad después de aplicar. Alumnos, matrículas, notas y asistencias permanecieron exactamente iguales. Se verificó el login de los cuatro docentes, sus aulas y responsable documental, y el rechazo de otras carreras y de la administración de cuentas. Los equipos vinculados deben recibir la actualización institucional para incorporar estas asignaciones.

Se repitió la generación de 196 documentos en las diez aulas afectadas, sin errores ni cambios académicos. La comprobación final mantiene cero docentes sin asignación; siguen pendientes la validación histórica de asistencias, planes, matrículas, parámetros documentales y cuentas de prueba.

## Evidencia y cierre

Los resultados técnicos están en `tests/offline-artifacts/system-audit`, `production-package` y `production-documents`, carpetas privadas ignoradas por Git. Los detalles institucionales y campos pendientes están en `private-data/production-readiness.json`; no distribuirlos junto con el programa.

El paquete final validado es `exports/CETPRO_OFFLINE_2026-10-12-10-05-47`: versión 4.8.0, Node incluido y 1.822 archivos con huellas comprobadas. Su configuración institucional se recupera o vincula siguiendo la guía; no incluye la base real ni sus credenciales.

Seguir `PREPARACION_PRODUCCION.md` y guardar el acta de validación institucional junto al respaldo previo al despliegue. Una vez confirmados los datos, repetir la comprobación y revisar los PDF finales. La alerta por simulaciones anteriores se conserva como evidencia histórica y requiere el acta de contraste; no se elimina borrando el historial.

No se garantiza ausencia absoluta de errores en cualquier dato o equipo futuro. Se documentan los casos probados, los controles y las condiciones pendientes para operar y emitir documentos oficiales.
