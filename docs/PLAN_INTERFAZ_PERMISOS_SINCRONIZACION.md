# Plan de mejora de interfaz, acceso y sincronización offline

Fecha: 5 de octubre de 2026. Alcance: planificación; no modifica el funcionamiento actual.

## 1. Hallazgos de la revisión inicial

- `app/js/services/auth-service.js`: el inicio de sesión recibe un rol y un nombre, sin verificar usuario ni contraseña. El rol por defecto de `getCurrentRole()` es DIRECTOR. Debe sustituirse por denegación de acceso sin sesión válida.
- `app/js/ui/login-view.js`: permite elegir el rol, la carrera y el grupo. El nombre es opcional; no identifica una cuenta individual.
- `app/js/services/teacher-context-service.js`: los grupos seleccionables vienen del catálogo, sin una relación autorizada entre usuario y grupo. Filtrar por carrera no garantiza pertenencia al docente.
- `app/js/services/sync-package-service.js`: ya existe intercambio de matrículas y avances mediante archivos `.cetpro`. La importación de padrón escribe estudiantes y matrículas y no toca directamente las notas; sin embargo, hace `put` de registros completos y no controla su revisión.
- La importación de avances guarda bloques de asistencia y evaluación por grupo/UD. Debe evitarse que un paquete antiguo reemplace información reciente o que dos equipos se sobrescriban.
- `app/js/services/etapa2-data-service.js` usa localStorage para registros de etapa 2, mientras el esquema IndexedDB también contiene asistencia y evaluación. Hace falta inventariar ambas fuentes y migrarlas sin pérdidas.
- Hay diferencias de formato: la exportación de evaluaciones comprueba `ev.evaluations`, mientras el servicio de etapa 2 persiste `evaluationsByEnrollment`. También existen claves con y sin prefijo `GAC-V1-`. Deben resolverse antes de reutilizar el intercambio.
- El supuesto respaldo previo a importar matrícula guarda fecha y grupo en sessionStorage, no una copia recuperable de los datos.
- `scripts/server.js` atiende en `127.0.0.1`: actualmente no constituye un servidor de sincronización para otras computadoras.
- Existen pruebas de roles, aula, notas, asistencia y documentos. Algunas pruebas permiten al docente cambiar de carrera/grupo libremente: deben actualizarse al nuevo modelo de asignación.

Estos hallazgos provienen de lectura de código; no equivalen a una auditoría completa ni a pruebas ejecutadas.

## 2. Modelo de autoridad propuesto

El permiso efectivo será: cuenta activa + acción permitida + asignación académica + estado del registro. Toda acción se deniega por defecto. El rol no se elige al entrar: pertenece a la cuenta.

| Funcionalidad | Secretaría | Docente | Director |
| --- | --- | --- | --- |
| Estudiantes y matrículas | Crear y actualizar datos administrativos | Consultar padrón de sus asignaciones | Consultar y supervisar |
| Grupos y organización | Gestionar matrícula dentro de la estructura vigente | Consultar grupos asignados | Autorizar estructura y asignaciones |
| Notas y asistencia | Consultar resultados consolidados; importar avances autorizados | Registrar y corregir dentro de sus asignaciones abiertas | Supervisar y autorizar reapertura/correcciones |
| Cierre académico | Preparar documentación consolidada | Entregar y cerrar su registro docente | Aprobar cierre y reapertura |
| Documentos | Matrícula, nóminas y documentos administrativos habilitados | Registros de notas, asistencia y carpeta de sus asignaciones | Documentos institucionales y aprobación de emisión |
| Cuentas y permisos | Cambiar contraseña propia | Cambiar contraseña propia | Administrar cuentas, asignaciones y recuperación |
| Sincronización | Emitir padrón y consolidar avances | Recibir padrón y enviar sus avances | Supervisar consolidación y resolver conflictos autorizados |
| Restauración total | Sin permiso | Sin permiso | Recuperación controlada y registrada |

La dirección no editará notas diariamente mediante privilegios generales. Una corrección excepcional requerirá motivo y conservará valor anterior, responsable y aprobación.

La matriz documental final debe cubrir todas las plantillas TMPL-01 a TMPL-21 y distinguir consultar, preparar borrador, generar, aprobar y emitir. Los documentos oficiales que dependan de cierre o aprobación no podrán emitirse por tener solamente permiso de lectura.

## 3. Cuentas y login

- Pantalla con logo, usuario, contraseña, mostrar/ocultar contraseña y botón Ingresar; compatible con teclado y etiquetas accesibles.
- Una cuenta por persona, usuario único, estado activo/inactivo y rol asignado por dirección. Sin cuentas genéricas compartidas ni contraseñas universales de producción.
- Contraseñas almacenadas mediante derivación segura con sal individual; nunca en texto plano ni dentro de paquetes de padrón/avances. Seleccionar parámetros e implementación durante el diseño técnico.
- Alta inicial de dirección en una instalación institucional autorizada, cambio de contraseña inicial y procedimiento de recuperación local verificado.
- Quitar el cambio de rol libre, la elevación por almacenamiento del navegador y el acceso implícito como director. Expiración/cierre de sesión y protección de intentos repetidos.
- Asignaciones con `usuarioId/docenteId`, `periodoId`, `programaId`, `moduloId`, `grupoId` y `unidadId`, vigencia y revisión. Un docente puede tener varias asignaciones; solo esas aparecen en sus selectores.
- Validar permisos en navegación, consultas, servicios de escritura, generación/exportación e importación. Ocultar botones será una ayuda visual adicional.
- Para aislamiento real, la autorización institucional debe verificarse en un servicio local protegido. La aplicación actual en navegador y sus archivos locales no deben considerarse una barrera suficiente frente a manipulación del equipo.
- Registrar equipos autorizados. La provisión de identidad offline será un flujo específico, separado de los datos académicos; establecer protección de credenciales y claves en el equipo y una política de renovación/revocación.
- Las revocaciones realizadas en otro equipo aislado se conocerán al siguiente intercambio. Definir caducidad de autorizaciones y frecuencia mínima de actualización, sin prometer revocación instantánea sin comunicación.

## 4. Interfaz por rol

- Menú breve y consistente con las tareas de cada cuenta. Mostrar nombre de la persona, rol, periodo y grupo activo cuando corresponda.
- Secretaría: panel con nueva matrícula, búsqueda de estudiante, padrón, documentos administrativos y sincronización.
- Docente: Mis grupos, Asistencia, Notas, Mis documentos y Sincronización. Inicio con sus aulas y pendientes.
- Director: resumen institucional, resultados, documentos por aprobar, cuentas/asignaciones y estado de sincronización.
- Mejorar contraste, tipografía, espaciado, tablas, encabezados fijos, búsqueda, filtros autorizados, estados vacíos y errores claros. Verificar resoluciones de las computadoras de destino.
- Mostrar estados separados: cambios guardados en este equipo, cambios pendientes de enviar y recepción confirmada por la institución.
- Formularios de matrícula con validación, prevención de duplicados y edición administrativa que conserve las referencias académicas.

### Registro de notas

- Tabla por grupo, unidad e indicador; estudiantes y encabezados visibles al desplazarse.
- Entrada rápida con Tab/Enter, validación de la escala configurada y distinción entre cero y nota pendiente.
- Cálculos derivados de la configuración académica vigente; no inventar ponderaciones ni reglas de aprobación.
- Guardado local confirmado solo después de persistir. Si falla, mantener el valor en pantalla como pendiente y ofrecer reintento.
- Matrículas nuevas agregan filas sin reconstruir ni vaciar calificaciones existentes.
- Historial de correcciones y cierre con bloqueo de edición; reapertura autorizada.

### Registro de asistencia

- Vista diaria por fecha/sesión y vista mensual de resumen, ambas desde la misma fuente de datos.
- Estados configurados con texto y colores accesibles; conservar justificación y observaciones.
- Acción masiva de presentes con vista previa/confirmación y posibilidad de corregir antes del cierre.
- Matrículas posteriores no generan faltas automáticamente en fechas previas a su ingreso.
- Registrar quién cambió una marca y cuándo. Prevenir duplicados por matrícula y sesión.

## 5. Sincronización sin internet

Propuesta: base institucional consolidada y copias locales limitadas a los datos autorizados. Todos ven información consistente cuando sincronizan; el docente conserva acceso únicamente a sus asignaciones, no a una copia visible de todos los grupos.

### Transporte

1. Primera entrega: intercambio por USB con paquetes `.cetpro`, disponible incluso en computadoras completamente aisladas.
2. Si existe red local: usar el mismo protocolo mediante un servicio institucional en LAN, sin necesidad de internet. Cada instalación conserva operación local y cola de pendientes cuando el servicio no está disponible.

No bastará con cambiar la dirección del servidor estático actual. La modalidad LAN necesita API autenticada, persistencia institucional, instalación como servicio, configuración de red y respaldo. Una computadora institucional coordina la consolidación; no se comparte ni reemplaza un archivo completo de base de datos mientras otros trabajan.

Sin red ni traslado físico de archivos no existe sincronización automática. Las pantallas deben indicar última recepción y datos pendientes, para evitar que una copia antigua parezca actualizada.

### Propiedad y contenido

- Secretaría origina los cambios administrativos del padrón y matrículas.
- El docente asignado origina notas y asistencia de sus unidades/grupos.
- Dirección origina cuentas, asignaciones, autorizaciones y cierres.
- El concentrador institucional verifica y consolida operaciones, y envía acuses de recepción. No obtiene por ello permiso para modificar cualquier campo sin autorización.
- Paquetes de padrón destinados al docente incluyen solo alumnos/matrículas/catálogos necesarios para sus asignaciones. Dirección y secretaría reciben el alcance institucional autorizado.
- Cada paquete incluye institución, identificador único, versión de protocolo, emisor y equipo, destino/alcance, revisiones y lista de operaciones. Firmarlo con claves provisionadas; cifrar el contenido sensible para su destinatario. Un checksum detecta corrupción accidental, pero no acredita al emisor.
- Cada cambio tiene identificador global, registro destino, acción, revisión base, nueva revisión, autor, dispositivo y contexto académico. La fecha sirve para auditoría, no decide por sí sola qué cambio gana.
- Llevar registro de operaciones/paquetes aplicados y acuses. Importar otra vez no duplica ni revierte los datos. Conservar pendientes hasta recibir confirmación; permitir exportar de nuevo si se extravía un USB.

### Importación segura

1. Leer y validar firma, institución, destinatario, versión, tamaño, estructura, autor y autorización del cambio.
2. Comprobar referencias y revisiones. Una nota no se aplica si falta su matrícula; queda pendiente hasta recibir el padrón correspondiente.
3. Presentar resumen de altas, actualizaciones, operaciones ya recibidas, pendientes y conflictos.
4. Crear copia real recuperable de los datos afectados y aplicar las operaciones válidas junto con auditoría y comprobantes dentro de una transacción.
5. Ante fallo, abortar la aplicación de ese conjunto y mostrar un resultado verificable; no registrar recepción exitosa de cambios sin persistir.
6. Emitir acuse para el remitente y permitir exportar los conflictos sin perder ninguna versión.

Para las escrituras locales se aprovecharán transacciones de IndexedDB: agrupan cambios de manera atómica. Referencia técnica: https://www.w3.org/TR/IndexedDB/ . Esto no sustituye un respaldo externo ni una estrategia de sincronización.

### Reglas de fusión

- Aplicar por registro/campo autorizado: una matrícula nunca incluye operaciones sobre notas o asistencia.
- Notas identificadas por matrícula, periodo, grupo, unidad e indicador; asistencia por matrícula y sesión.
- Si la revisión base coincide, aplicar. Si la operación ya fue recibida, omitir. Si depende de una revisión ausente, dejar pendiente. Si hay edición concurrente del mismo dato, conservar ambas propuestas y abrir conflicto.
- Cambios independientes pueden consolidarse sin sobrescribir otros registros. No usar la regla de que el último archivo o la fecha más reciente gana.
- Bajas, retiros y transferencias conservan historia. No borrar en cascada notas; una transferencia crea la nueva relación académica y mantiene los resultados vinculados a la anterior.
- Un conflicto en notas se revisa por el docente autorizado y dirección según el estado de cierre; secretaría no elige una calificación.

### Ejemplo de funcionamiento

1. El docente guarda una nota 16 y la asistencia de Ana en su computadora.
2. Secretaría matricula a Luis en el mismo grupo y exporta los cambios administrativos autorizados.
3. El docente importa: Luis aparece como estudiante nuevo y pendiente de evaluación. La nota 16 y las marcas de Ana conservan valor e historia.
4. El docente registra resultados de Luis y exporta sus avances.
5. El equipo institucional recibe esos cambios; dirección consulta los resultados consolidados.
6. Importar otra vez el paquete no agrega estudiantes ni notas duplicadas. Importar un archivo anterior no revierte cambios recientes.

## 6. Orden de ejecución y entregables

| Fase | Trabajo | Condición para avanzar |
| --- | --- | --- |
| 1. Diagnóstico y protección | Inventario de rutas, plantillas y fuentes de datos; respaldo completo de IndexedDB y localStorage; prueba de recuperación en una copia | Se recuperan matrículas, notas y asistencias sin diferencias |
| 2. Modelo de datos | Identificadores canónicos, cuentas, asignaciones, revisiones, operaciones, auditoría y migración desde fuentes actuales | Cantidades, referencias y valores coinciden; discrepancias quedan documentadas |
| 3. Login y permisos | Cuentas individuales, autoridad local, validación central de acciones y alcance, quitar selección libre de roles/grupos | Un docente no consulta, modifica ni exporta datos ajenos por ruta, ID o llamada directa |
| 4. Sincronización USB | Paquetes autorizados por alcance, versiones, firma, cifrado, acuses, fusión, respaldo y conflictos | El caso matrícula nueva + notas existentes funciona entre tres instalaciones aisladas |
| 5. Interfaz y captura | Panel por rol, notas y asistencia, guardado verificable y estados de sincronización | Usuarios completan las tareas principales con navegación por teclado y sin pérdida de cambios |
| 6. Documentos | Matriz TMPL-01..21, validación en generación/exportación, aprobación/emisión y datos del contexto autorizado | Cada cuenta genera únicamente documentos de su función y alcance |
| 7. Piloto e instalación | Instalador/actualización que preserve datos, tres equipos, manuales por rol y recuperación | Flujo institucional completo sin internet; actualización no modifica datos guardados |
| 8. Red local, si está disponible | Servicio de consolidación en LAN con el protocolo ya probado | Caída de red no impide registrar y la reconexión consolida sin duplicados |

La primera implementación debe centrarse en datos, identidad y permisos. El rediseño visual completo se integra sobre esa base para que los menús representen permisos reales. No se promete un calendario hasta completar el inventario de versiones y datos existentes.

## 7. Pruebas de aceptación obligatorias

- Usuario o contraseña incorrectos: acceso denegado. Sin sesión no se obtiene rol DIRECTOR.
- Docente A: acceso a sus asignaciones; intento de leer, modificar, generar documento o exportar del grupo B rechazado, incluso manipulando IDs.
- Secretaría: matrícula habilitada; edición directa de notas/asistencia y gestión de cuentas denegadas.
- Dirección: supervisión institucional y reapertura autorizada con auditoría.
- Matrícula nueva recibida mientras hay notas/asistencia locales pendientes: ambas se conservan y pueden enviarse después.
- Paquetes duplicados, antiguos, alterados, de otra institución o emisor no autorizado: no corrompen ni amplían acceso.
- Paquetes fuera de orden y avances recibidos antes del padrón: quedan pendientes y se resuelven al recibir las dependencias.
- Edición de la misma nota desde dos equipos: conflicto visible con ambos valores, sin reemplazo silencioso.
- Retiro, transferencia o desactivación de usuario: conserva historia y aplica autorizaciones recibidas según vigencia.
- Error de almacenamiento, cierre de aplicación e interrupción de importación: no se anuncian guardados inexistentes ni dejan una aplicación parcial del conjunto transaccional.
- Documentos muestran estudiantes, notas y asistencias del periodo/grupo correcto y respetan aprobación/cierre.
- Tres instalaciones con perfiles separados (secretaría, docente, director), sin internet, realizan intercambio completo y reciben acuses.
- Instalación nueva y actualización mantienen ubicaciones y versiones de datos controladas; respaldo probado restaura todo el estado necesario.

## 8. Datos operativos por precisar al iniciar la implementación

- Disponibilidad de red local; número de computadoras y de docentes; uso de varias computadoras por una misma persona.
- Relación real de docentes, grupos y unidades asignadas por periodo.
- Matriz institucional de preparación, firma, aprobación y emisión de cada documento.
- Escalas de calificación, estados de asistencia y reglas vigentes de cierre/corrección.
- Responsable del equipo institucional, frecuencia de intercambio y custodia de respaldos/USB.

Mientras se confirman estos datos, la propuesta base es USB, cuentas individuales, dirección como administradora de asignaciones, secretaría como origen administrativo y cada docente como origen de sus registros pedagógicos.
