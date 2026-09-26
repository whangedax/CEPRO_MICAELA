# Convergencia a una sola interfaz funcional

La candidata no carga `candidate-app.js`. `app-v2/index.html` presenta el mismo shell/producto de 12 rutas; `candidate-entry.js` fija un target allowlisted `V2_CANDIDATE/CETPRO_V2_CANDIDATE/2`, valida/prepara su IndexedDB aislada y carga dinámicamente el mismo `app/js/app.js`. El entrypoint v1 no fija runtime y conserva el default `CETPRO_DB/1` (17 stores). Ningún bootstrap genérico migra v1→v2: el upgrade aislado ocurre antes de abrir el producto compartido; si se intenta abrir una DB v1 con runtime v2 sin preflight, `database.js` aborta `onupgradeneeded`.

Las vistas maduras y los servicios de producto permanecen compartidos. `ActiveStorageService` selecciona backup v1/v2 según el build explícito; `GroupAssignmentService` consulta `grupos_academicos` en candidata; `DocumentDataService` hace join de `matricula.grupoId`, programa, estudiante, módulo/periodo confirmados y perfil institucional. En producción v1 se preserva el camino previo. `sourceGroupCode/grupoCode` es rótulo/procedencia de BD.zip, no clave global de identidad académica v2.

`candidate-app.js`, `candidate.css` y algunos servicios experimentales v2 quedan como deuda de laboratorio no importada por la entrada candidata actual. La consolidación futura puede retirarlos una vez cerrados los gates; mientras tanto no se deben activar como segunda UI. Los consumidores de asistencia/evaluación y asignación necesitan adaptación completa a `groupId` y pruebas atómicas antes de writes académicos v2. No existe instrucción ni permiso para activar producción.

Riesgo de despliegue: compartir código no equivale a sincronizar datos; 8080 y 8081 usan orígenes/DB independientes. La migración productiva requiere tarea, backup externo verificado, ventana exclusiva, preflight, readback y aprobación Edge independientes.

Node.js sirve únicamente al launcher HTTP de desarrollo/ensayo (8080/8081). El runtime de navegador es HTML/CSS/JS/IndexedDB con pdf-lib vendorizado y no requiere Node ni Internet como dependencia de distribución final; el empaquetado final se decidirá en un gate separado.
