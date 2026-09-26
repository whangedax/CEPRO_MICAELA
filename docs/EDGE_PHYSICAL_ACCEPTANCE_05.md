# EDGE-PHYSICAL-ACCEPTANCE-05 — guía de aceptación física

Fecha de preparación: 2026-09-16  
Estado: `ACCEPTANCE_HARNESS_READY = YES` / `PHYSICAL_ACCEPTANCE = PENDING`

Esta guía prepara la revisión humana en Microsoft Edge. No aprueba producción, no migra `CETPRO_DB`, no asigna módulos, no crea periodos o currículo y no autoriza documentos oficiales.

## Antes de empezar

1. Cierre otras ventanas locales del CETPRO.
2. Haga doble clic en `scripts\start-edge-physical-acceptance.cmd`.
3. Mantenga abiertas las dos ventanas de consola durante la revisión.
4. Use únicamente estas direcciones:
   - Producción v1: `http://127.0.0.1:8080/`
   - Candidata v2: `http://127.0.0.1:8081/`
   - QA documental: `http://127.0.0.1:8081/tools/document-renderer-qa.html`
5. No use Restaurar. En 8081, durante esta aceptación, solo se permite exportar un respaldo.
6. Al terminar, cierre las dos ventanas de consola. No deje servidores locales abiertos.

La página QA debe mostrar siempre `QA TÉCNICA - DATOS SINTÉTICOS - NO OFICIAL`, `Base usada: NINGUNA`, `Persistencia: MEMORIA` y `Red externa: PROHIBIDA`. Sus descargas válidas contienen `TEST_ONLY`.

## Cómo marcar el resultado

En cada prueba escriba `PASS` o `FAIL` en la casilla. Si algo no coincide, marque `FAIL`, anote lo observado y detenga cualquier intención de activar v2. No coloque nombres o documentos reales en la herramienta QA.

## Checklist y plan de capturas

Se requieren como máximo estas diez capturas. Una captura puede mostrar dos ventanas de Edge lado a lado cuando se indique.

### 1. Inicio de la candidata v2

**PASO:** Abra `http://127.0.0.1:8081/`. Espere a que termine la carga y observe el inicio.  
**RESULTADO ESPERADO:** La aplicación identifica la candidata v2; no aparece ningún mensaje de migración productiva ni de emisión oficial.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** La pantalla completa de inicio con la dirección `127.0.0.1:8081` visible.

### 2. Estudiantes

**PASO:** En 8081 abra **Estudiantes** y realice una búsqueda normal sin editar ni crear registros.  
**RESULTADO ESPERADO:** La lista y la búsqueda funcionan; no se solicita una migración ni se mezclan controles técnicos de QA.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** La vista Estudiantes con un resultado visible. Oculte datos personales antes de compartir la captura fuera del equipo autorizado.

### 3. Matrículas con `groupId`

**PASO:** Abra **Matrículas** en 8081 y seleccione una matrícula solo para lectura.  
**RESULTADO ESPERADO:** La matrícula muestra su pertenencia mediante `groupId`; no se asigna módulo ni periodo.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** La matrícula y el `groupId`, sin exponer el número de documento si la captura saldrá del equipo autorizado.

### 4. Grupos y estados

**PASO:** Abra **Grupos**. Revise el total y los estados, sin usar ninguna acción de asignación.  
**RESULTADO ESPERADO:** Se muestran 12 grupos; cuatro `ACTIVO` y ocho `REVIEW_REQUIRED`. Los campos no confirmados permanecen vacíos y no preseleccionados.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** El resumen de 12 grupos y la distribución de estados.

### 5. Configuración

**PASO:** Abra **Configuración** en 8081 y observe el perfil sin pulsar Guardar.  
**RESULTADO ESPERADO:** La información institucional se muestra en la candidata, sin controles `TEST_ONLY` y sin cambios automáticos.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** La vista general de Configuración; oculte teléfonos u otros datos si la captura se compartirá externamente.

### 6. TMPL-02 con matrícula real en la candidata

**PASO:** Abra **Documentos** en 8081, elija TMPL-02, busque y seleccione una matrícula, revise el preflight y genere la vista previa. Compruebe visor, descarga e impresión sin emitir un documento oficial.  
**RESULTADO ESPERADO:** El recorrido sigue `matriculaId → preflight → PDF → visor → descarga → impresión`; los once campos confirmados aparecen, el texto cabe, no se solapa y el PDF tiene una página. TMPL-01 continúa bloqueada.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** El visor TMPL-02 con el resultado del preflight; proteja los datos personales de la matrícula.

### 7. QA de asistencia, evaluación y límites

**PASO:** Abra la URL QA. En TMPL-05 y TMPL-11 pruebe **Vista normal**, **Texto largo** y **Capacidad máxima**. Verifique nombres completos, negrita del nombre principal, filas alineadas, primera/última fila, páginas correctas y ausencia de texto desaparecido. Luego, en TMPL-05 pruebe **Overflow controlado** primero con `FIELD_OVERFLOW` y después con `CAPACITY_EXCEEDED`.  
**RESULTADO ESPERADO:** Los casos válidos generan PDF `TEST_ONLY`. Cada overflow muestra su código, indica que no se generó PDF y deshabilita visor/descarga. No aparece ningún botón de emisión oficial.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** Dos ventanas o pestañas QA lado a lado: una con un PDF válido de asistencia/evaluación y otra con uno de los errores controlados. Es una sola captura.

### 8. QA de acta, certificado y título

**PASO:** En QA revise TMPL-19, TMPL-20 y TMPL-21 en Vista normal y Texto largo. Recorra todas las páginas. Seleccione TMPL-03 una vez.  
**RESULTADO ESPERADO:** TMPL-19, TMPL-20 y TMPL-21 generan exactamente dos páginas cada una, sin páginas adicionales ni solapamientos. TMPL-03 muestra únicamente `REVIEW_REQUIRED` y no genera PDF.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** El visor de una de las tres plantillas en su segunda página y, al lado, TMPL-03 con `REVIEW_REQUIRED`. Es una sola captura.

### 9. Exportación de respaldo v2

**PASO:** En 8081 abra **Respaldo**. Confirme que la pantalla permite solamente exportar y pulse **Exportar respaldo** una vez. No restaure ningún archivo.  
**RESULTADO ESPERADO:** Se muestran `CETPRO_V2_CANDIDATE`, schema 2 y 18 stores. La exportación informa un checksum y no ofrece un flujo de restauración.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** La pantalla de respaldo con nombre de DB, schema, stores y checksum visibles; no capture el contenido del archivo.

### 10. Coexistencia 8080/8081

**PASO:** Coloque lado a lado `http://127.0.0.1:8080/` y `http://127.0.0.1:8081/`. Navegue una vista en cada ventana sin modificar datos. Abra `http://127.0.0.1:8080/tools/document-renderer-qa.html` y confirme que no existe; vuelva a la página anterior.  
**RESULTADO ESPERADO:** 8080 sigue siendo producción v1; 8081 sigue siendo la candidata v2. La herramienta QA existe solo en 8081 y no está enlazada en el menú normal.  
**PASS/FAIL:** __________  
**QUÉ CAPTURAR:** Ambas ventanas lado a lado con las direcciones 8080 y 8081 visibles.

## Comprobación offline y consola

Durante las pruebas anteriores, abra las herramientas de desarrollo de Edge con `F12`, pestaña **Red**, y active **Sin conexión** después de que ambas aplicaciones hayan cargado. Repita una navegación y un PDF QA ya disponible. Deben registrarse cero solicitudes externas. En **Consola**, el resultado aceptable es cero errores JavaScript propios de la aplicación y cero respuestas HTTP propias fallidas. El ruido inequívoco de extensiones puede anotarse aparte, sin contarlo como error de la aplicación.

**OFFLINE PASS/FAIL:** __________  
**CONSOLA PASS/FAIL:** __________  

## Resultado físico

Nombre de quien revisa: ____________________  
Fecha y hora: ____________________  
Resultado global: `PASS / FAIL`  
Observaciones: ________________________________________________________________

Solo el usuario puede cambiar `PHYSICAL_ACCEPTANCE` de `PENDING` a un resultado físico. Un PASS humano tampoco activa producción por sí mismo: B-002, B-004 y B-007 y los demás gates de liberación continúan vigentes.
