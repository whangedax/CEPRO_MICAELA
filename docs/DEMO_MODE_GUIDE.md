# Guía rápida — Modo Demostración

El Modo Demostración permite mostrar el flujo académico completo con datos simulados. Trabaja únicamente sobre `CETPRO_V2_DEMO`, no emite documentos oficiales y no modifica `CETPRO_V2_CANDIDATE` ni `CETPRO_DB`.

## Ingreso y recorrido sugerido

1. Abra `http://127.0.0.1:8081/#/demo` o pulse **INICIAR MODO DEMOSTRACIÓN**.
2. Compruebe la franja permanente **MODO DEMOSTRACIÓN · DATOS SIMULADOS · NO OFICIAL**.
3. En **Inicio**, presente los conteos del dataset `DEMO_DATASET_V1`: 40 estudiantes, 65 matrículas, 2 grupos, 1 periodo, 2 módulos asignados y 12 unidades.
4. Abra **Nóminas** con el Grupo Demo B. Sus 25 matrículas caben en TMPL-01. Genere la vista previa y muestre la marca de agua.
5. Abra el Grupo Demo A. Sus 40 matrículas provocan `CAPACITY_EXCEEDED`; use el reporte administrativo completo, sin truncar ni agregar páginas a la plantilla institucional.
6. En **Registros**, genere el registro administrativo PDF/CSV. TMPL-03 continúa en revisión geométrica.
7. En **Documentos**, seleccione TMPL-02, busque una matrícula DEMO y genere la ficha. La vista previa es demostrativa y la emisión oficial permanece bloqueada.
8. En **Registro Académico**, cambie una marca de asistencia, guarde y compruebe la recarga y los conteos. No se calcula porcentaje oficial porque B-003 continúa abierta. El reporte administrativo es la alternativa mientras la geometría sesión×estudiante de TMPL-05 no esté certificada.
9. En **Evaluación demo**, muestre grupos, unidades e indicadores. Esta vista no registra notas ni desbloquea evaluación productiva.
10. En **Respaldo**, exporte el backup DEMO. Debe indicar `environment=DEMO` y `official=false`; no puede restaurarse sobre un entorno REAL.

## Reinicio y salida

- **REINICIAR DATOS DEMO** restaura exactamente `DEMO_DATASET_V1` y elimina los cambios hechos durante la demostración.
- **SALIR DEL MODO DEMOSTRACIÓN** regresa a la candidata real sin transferir datos.
- Si necesita borrar el entorno de demostración, use la acción de eliminación disponible; se recreará de forma determinista al ingresar otra vez.

Nunca use datos personales reales en este modo. No migre producción y no interprete ningún PDF DEMO como documento oficial.
