# Plan de aceptación física Edge — candidata v2

1. Mantener la aplicación productiva en 8080 sin cambios.
2. Ejecutar `scripts\start-v2-candidate.cmd` desde el proyecto.
3. Abrir Microsoft Edge en `http://127.0.0.1:8081/`.
4. Confirmar encabezado `CANDIDATA V2 · AISLADA` y estado `CETPRO_V2_CANDIDATE · schema 2 · 18 stores`.
5. En Inicio confirmar 269/295/12/7/14/0/0.
6. Recorrer Estudiantes, Matrículas, Programas, Grupos, Registro, EFSRT, Cierre, Documentos, Incidencias, Respaldo y Configuración.
7. Confirmar 8 grupos REVIEW_REQUIRED visibles, 4 ACTIVO y ninguna asignación preseleccionada.
8. En Matrículas verificar que la etiqueta visible acompaña a un `groupId` técnico.
9. En Documentos validar un contexto ENROLLMENT; TMPL-01 debe seguir bloqueada.
10. Exportar backup v2 y verificar mensaje de 18 stores/checksum. No restaurar sobre producción.
11. En Configuración comprobar que el perfil institucional conserva todos sus campos; cualquier guardado afecta solo la candidata.
12. Abrir simultáneamente `http://127.0.0.1:8080/` y confirmar que continúa v1.
13. Cerrar Edge/launcher. No cambiar `CONFIG.DB.VERSION` ni ejecutar migración productiva.

**Adenda V2-FUNCTIONAL-PARITY-01:** la UI candidata ahora es el shell maduro compartido. En `#/documentos` elegir TMPL-02, buscar una matrícula propia, seleccionar y verificar preflight → visor PDF Blob → descarga → impresión sin emisión oficial; elegir TMPL-01 y comprobar botón deshabilitado. En Estudiantes verificar padrón/filtros/expediente; en Matrículas 295 y ficha; en Configuración labels humanos y crear periodo bloqueado; en Respaldo solo exportar y comprobar archivo descargado, NO restaurar. Se requieren confirmación visual y readback de schema2/18/269/295/295/12/7/14/0/0 y que 8080 continúe v1. Cualquier divergencia detiene el gate; no asignar módulos ni activar v2.

Aceptación pendiente: esta tarea valida headless y prepara el launcher; la inspección visual/física en Edge corresponde al usuario autorizado.
