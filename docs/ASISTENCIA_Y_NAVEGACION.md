# Asistencia y navegación

La cabecera usa dos menús: espacio de trabajo (docente) o ámbito de consulta (Dirección y Secretaría), y cuenta personal. El primero permite escoger carrera, módulo y unidad o abrir documentos generales. El segundo contiene cuenta, tema y cierre de sesión. La barra de contexto muestra nombres legibles, sin identificadores internos de aula.

La guía Preparar → Asistencia → Evaluación → Revisar formatos → Entregas permanece disponible en las pantallas de unidad docente. Inicio, asistencia, documentos y configuración usan la misma resolución curricular, incluyendo aulas antiguas con módulos equivalentes.

## Pasar lista

1. Elegir la unidad, fecha y sesión.
2. Abrir **Pasar lista**. La ventana se mantiene dentro de Asistencia.
3. Elegir Presente, Tardanza, Falta o Justificada por estudiante; la opción seleccionada queda resaltada. Pulsar la opción seleccionada deja el estado sin registrar. También se puede buscar por nombre o DNI, añadir una nota o marcar todos presentes después de confirmar.
4. Guardar cambios. El botón permanece visible mientras se desplaza la lista.

Cerrar con cambios pendientes requiere confirmación. Si se decide cerrar, los cambios permanecen en esta pantalla y pueden recuperarse al abrir la lista. Cambiar de aula, unidad o salir del sistema conserva el aviso de cambios pendientes. Una fecha anterior a la matrícula y un aula cerrada mantienen sus restricciones.

Dirección y Secretaría consultan la lista en el mismo modal. No pueden modificar marcas ni guardar calificaciones del docente.

Los avatares son recursos SVG locales: silueta masculina para H, femenina para M y neutral cuando falta el dato. Se usa el campo registrado; no se deduce a partir del nombre. En móvil, cada fila dispone de los cuatro botones sin desplazamiento horizontal.

La interfaz muestra datos y tareas institucionales. Las procedencias técnicas se conservan internamente, sin exponerse como ayudas operativas. Los datos ya ingresados, las horas, fechas, matrículas, notas y registros de asistencia no se reemplazan al cambiar la presentación.

## Pruebas

`npm run test:attendance-modal-ui`: menús, los tres avatares, botones, búsqueda, guardado, protección de cambios al cerrar, diseño móvil y permisos de los tres roles. Se utilizan bases temporales.

Además se comprueban navegación por unidades, EFSRT, documentos, configuración anual e integridad del llenado de los 21 formatos.
