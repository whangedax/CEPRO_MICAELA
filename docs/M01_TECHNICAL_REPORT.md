# Informe Técnico del Módulo M01 — Núcleo Local

**Fecha de Cierre**: 2026-09-11  
**Estado del Módulo**: `M01 COMPLETADO — APTO PARA M02`  
**Entorno de Ejecución**: HTML5 + CSS3 Nativo + JavaScript ES6+ (Sin Frameworks ni Dependencias Web)  

---

## 1. Archivos Creados e Implementados

### Estructura de la Aplicación (`app/`)
- `app/index.html`: Maquetación principal de la interfaz administrativa para secretaría CETPRO.
- `app/css/app.css`: Estilos globales, variables de tema y maquetación de contenedores.
- `app/css/components.css`: Estilos para barra de navegación lateral, botones, tarjetas, badges, notificaciones toast y tablas de información.
- `app/css/responsive.css`: Adaptación responsive móvil mediante menú drawer y ajuste de grillas.
- `app/css/print.css`: Estilos nativos de impresión para ocultar la interfaz administrativa.
- `app/js/config.js`: Configuración global, versión de la aplicación, constantes de base de datos y diccionario de las 9 rutas.
- `app/js/app.js`: Bootstrap de la aplicación, inicializador de servicios, manejadores globales de errores y enrutador.
- `app/js/router.js`: Enrutador cliente por Hash (`#`) con redirección y recuperación automática hacia `#/inicio`.

### Persistencia y Repositorios (`app/js/db/` & `app/js/repositories/`)
- `app/js/db/schema.js`: Definición centralizada de `CETPRO_DB` v1 con los 17 object stores e índices.
- `app/js/db/database.js`: Administrador de conexión a IndexedDB gestionando el ciclo de vida completo (`onupgradeneeded`, `onsuccess`, `onerror`, `onblocked`, `onversionchange`).
- `app/js/repositories/base-repository.js`: Repositorio base genérico reutilizable para operaciones CRUD y transacciones IndexedDB.

### Servicios (`app/js/services/`)
- `app/js/services/error-service.js`: Taxonomía de errores estandarizada (`ValidationError`, `AuditError`, `ConcurrencyError`, `IntegrityError`, `ImportConflictError`, `OperationalError`, `BlockedRuleError`) y formateador de mensajes amigables.
- `app/js/services/audit-service.js`: Servicio de auditoría inmutable en modo `append-only` sobre el store `auditoria`.
- `app/js/services/storage-service.js`: Gestor del estado de la base local, transacciones de prueba aisladas y exportación de respaldos JSON.

### Interfaz de Usuario (`app/js/ui/`)
- `app/js/ui/layout.js`: Renderizado de las 9 secciones administrativas (Inicio, Estudiantes, Matrículas, Programas, Registro, Documentos, Incidencias, Respaldo, Configuración) e indicador de estado de IndexedDB.
- `app/js/ui/notifications.js`: Sistema nativo de notificaciones flotantes (Toast) para avisos informativos, de éxito, advertencia y error.

### Servidores y Pruebas (`scripts/` & `tests/`)
- `scripts/dev-server.js`: Servidor de desarrollo estático HTTP local en puerto 8080 utilizando módulos nativos de Node.js (`http`, `fs`, `path`).
- `tests/m01_tests.js`: Suite de pruebas técnicas automatizadas verificando requerimientos de la A a la L.

---

## 2. Arquitectura Implementada

Se ha implementado una arquitectura por capas estrictamente desacoplada:

```text
[ Interfaz de Usuario (UI) ]
         ↓ (Eventos / Renderizado)
[ Enrutador / Layout / Notifications ]
         ↓ (Casos de Uso)
[ Servicios (AuditService, ErrorService, StorageService) ]
         ↓ (Abstracción Data)
[ Repositorio Base (BaseRepository) ]
         ↓ (Conexión / Transacciones)
[ Administrador IndexedDB (database.js + schema.js) ]
         ↓
[ IndexedDB Engine (Navegador) ]
```

- **Aislamiento Total de Persistencia**: La capa de UI **nunca** interactúa directamente con `indexedDB` ni ejecuta transacciones de base de datos.
- **Operación 100% Offline**: Cero peticiones `fetch` externas, fuentes o librerías por CDN. Todos los recursos residen en el repositorio local.

---

## 3. Stores e Índices Creados (`CETPRO_DB` v1)

Se crearon exactamente **17 Object Stores** y sus índices asociados en la versión 1 de la base de datos local:

| # | Store | KeyPath | Índices Creados |
|---|---|---|---|
| 1 | `estudiantes` | `id` | `numeroDocumento`, `apellidos` |
| 2 | `matriculas` | `id` | `estudianteId`, `periodoId`, `moduloId`, `grupoCode`, `estudiante_periodo` |
| 3 | `institucion` | `id` | (Ninguno) |
| 4 | `periodos` | `id` | `nombre` (único) |
| 5 | `programas` | `id` | `codigo` (único) |
| 6 | `modulos` | `id` | `programaId`, `codigo` |
| 7 | `unidades` | `id` | `moduloId` |
| 8 | `indicadores` | `id` | `unidadId` |
| 9 | `docentes` | `id` | `numeroDocumento` (único) |
| 10 | `configuracion` | `clave` | (Ninguno) |
| 11 | `matricula_unidades` | `id` | `matriculaId`, `unidadId` |
| 12 | `asistencia` | `id` | `matriculaId`, `unidadId`, `fecha` |
| 13 | `evaluacion` | `id` | `matriculaId`, `unidadId`, `indicadorId` |
| 14 | `efsrt` | `id` | `matriculaId`, `moduloId` |
| 15 | `documentos` | `id` | `tipoDocumento`, `referenciaId`, `fechaEmision` |
| 16 | `auditoria` | `id` | `timestamp`, `entidad`, `entidadId` |
| 17 | `staging_importaciones` | `id` | `loteId`, `estado`, `archivoOrigen` |

---

## 4. Matriz de Pruebas Ejecutadas y Resultados

Se ejecutó la matriz de pruebas automatizada `tests/m01_tests.js`:

| ID Prueba | Descripción | Resultado | Evidencia / Observación |
|---|---|---|---|
| **T-M01-A** | Estructura HTML5 y módulos JS nativos sin librerías externas | **APROBADA** | HTML5 semántico con importaciones `type="module"`. |
| **T-M01-B** | Definición e inicialización de `CETPRO_DB` v1 | **APROBADA** | Esquema v1 validado en `schema.js` y `database.js`. |
| **T-M01-C** | Existencia exacta de los 17 Object Stores | **APROBADA** | 17/17 stores verificados sin desvíos. |
| **T-M01-D** | Existencia de índices obligatorios por store | **APROBADA** | Índices creados correctamente durante upgrade. |
| **T-M01-E** | Transacciones centralizadas con rollback | **APROBADA** | `executeTransaction` gestiona `oncomplete` y `onerror`. |
| **T-M01-F** | Persistencia técnica de prueba en store aislado | **APROBADA** | Prueba ejecutada en DB/Store de prueba sin contaminar producción. |
| **T-M01-G** | Base productiva `CETPRO_DB` limpia de datos sintéticos | **APROBADA** | Cero alumnos ficticios insertados en `CETPRO_DB`. |
| **T-M01-H** | Bitácora de auditoría inmutable (`append-only`) | **APROBADA** | `AuditService` lanza `AuditError` al intentar `update` o `delete`. |
| **T-M01-I** | Recuperación de rutas inexistentes | **APROBADA** | Hash no registrado redirige automáticamente a `#/inicio`. |
| **T-M01-J** | Acceso a las 9 secciones administrativas | **APROBADA** | Vistas placeholder funcionales para las 9 rutas. |
| **T-M01-K** | Cero solicitudes hacia Internet / CDNs | **APROBADA** | Inspección de código confirma 100% operación offline. |
| **T-M01-L** | Adaptabilidad responsive escritorio/móvil | **APROBADA** | Reglas CSS `@media` y menú drawer para dispositivos móviles. |
| **T-M01-DEV-SERVER** | Servidor estático HTTP local en puerto 8080 | **APROBADA** | Servidor responde HTTP 200 OK con Content-Type `text/html`. |

- **Total de Pruebas Ejecutadas**: 13
- **Pruebas Aprobadas**: 13 (100%)
- **Pruebas Fallidas**: 0
- **Pruebas No Ejecutadas**: 0

---

## 5. Decisiones Técnicas Tomadas en M01

1. **D-010**: Implementación de Hash Routing (`#/seccion`) nativo en lugar de History API para asegurar compatibilidad con la apertura de archivos locales en navegadores sin servidor web.
2. **D-011**: Creación del servidor estático `scripts/dev-server.js` exclusivamente con módulos nativos de Node.js (`http`, `fs`, `path`) para desarrollo local.
3. **D-012**: Documentar la discrepancia entre 295 matrículas / 268 personas en `BD.zip` y 300 / 274 de las auditorías históricas en `ISSUES.md` para investigación previa a M04.

---

## 6. Bloqueos Restantes

- **B-001**: Plantilla `ASISTENCIA_UD7` (As-7) ausente en las fuentes originales (Bloqueada).
- **B-002**: Catálogo Curricular completo no oficializado por resolución (Bloqueado).
- **B-003**: Directiva de evaluación, redondeo, recuperación e inasistencias desaprobatorias pendiente de entrega institucional (Bloqueada).
- **B-004**: Confirmación administrativa de asignación Módulo I vs Módulo II por grupo (Bloqueada).
