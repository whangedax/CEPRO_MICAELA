# Contrato de entrega acumulativa
ENTREGA_Mxx.zip incluye:
- ESTADO_ACTUAL.md: versión, módulo, base aprobada y hash, candidato y hash, estado, dependencias, bloqueos, decisiones confirmadas, siguiente paso exacto. M00 no exige libro.
- LIBRO/: único candidato vigente y referencia inequívoca a la última base aprobada. No confundirlos.
- CONTRATOS/: esquema, operaciones, documento, fórmulas y decisiones versionadas.
- VBA_INSTALADO/: .bas/.cls y .frm con .frx cuando corresponda, iguales al código instalado; fuentes no instaladas en VBA_PENDIENTE/.
- FUENTES/: originales necesarios, procedencia y SHA-256; bases y plantillas recibidas, sin modificaciones.
- MAPAS_PLANTILLAS/: un mapa por documento inspeccionado y un inventario de pendientes.
- PRUEBAS/: CSV de casos, entorno/build Excel, resultados reales, capturas/PDF y copias sintéticas separadas.
- CONTROL/: estado por módulo, incidencias, decisiones, trazabilidad y tablero HTML actualizado.
- CAMBIOS.md, SIGUIENTE_PASO.txt y MANIFIESTO_SHA256.txt.
El manifiesto enumera todos los archivos salvo a sí mismo; verificar antes y después de comprimir. No declarar entregado un archivo inexistente. Las pruebas y fuentes se conservan acumulativamente; si el tamaño exige paquetes auxiliares, entregar índice inequívoco con hashes y adjuntos para el siguiente chat.

## Contratos que M00 debe concretar
Esquema: entidad lógica/nombre físico, propietario, columna, tipo, nullable, PK, FK, unicidad y borrado/inactivación. Las 16 entidades se mantienen; CONFIGURACIÓN requiere formato estructurado documentado para reglas, actividades y versiones.
Operación: nombre, propietario, entradas tipadas, precondiciones, validaciones, resultado y errores, escrituras autorizadas, confirmación, rollback y auditoría. Completar contratos para las 20 macros y auxiliares.
Documento: ID plantilla/hash, selector y modo individual/grupal, capacidad por página (puede variar), fuente y orden estable, reglas de aprobación, campos y destinos exactos, estado y limpieza. Documentos grupales deben resolver destinatarios sin crear huérfanos ni listas opacas: M00 decide la representación dentro del contrato de BD_DOCUMENTOS o propone cambio explícito.
Fórmula: ubicación, significado, entradas, regla/fuente/versión, vacíos, redondeo, ejemplo manual y resultado real. Configuración de sesión/restauración y estado de cierre deben quedar persistidos en tablas, no solo en memoria VBA.

## Estado no ambiguo
APROBADO requiere cada puerta aplicable satisfecha con evidencia. BLOQUEADO/PENDIENTE_EXCEL no se transforman en aprobado por respuesta afirmativa sin prueba. Se permite diseño independiente de módulos posteriores, claramente rotulado; no integrarlo como funcional ni saltar la secuencia de aceptación.


## Archivos de estado inequívocos
ESTADO_ACTUAL.md vive en la raíz de cada entrega; CONTROL/ESTADO_MODULOS.csv y CONTROL/PLANTILLAS.csv son las tablas de estado de esa entrega. El paquete inicial usa 03_CONTROL/ solo como semilla. Guarda ruta relativa del candidato, SHA-256, base aprobada, predecesor inmediato, módulo/subtarea, versión y evidencias. Los documentos PDF de referencia no sustituyen el estado.
M00: LIBRO/ y VBA_INSTALADO/ son NO_APLICA. Auditoría documental suficiente para su puerta si el contrato base es coherente; reglas y plantillas aún no recibidas se bloquean por función dependiente.
En M11–M13, se permite continuar el mismo módulo desde un candidato EN_CURSO/EN_REVISION verificado, conservando la última base APROBADA. Esto no permite pasar a otro módulo productivo. Cada checkpoint usa ENTREGA_Mxx_Tnn_REVnn.zip, incluye las piezas anteriores y registra el hash de su predecesor. Si hay dos ramas incompatibles, no fusionar libros automáticamente. El hito ENTREGA_Mxx.zip solo se aprueba cuando todas sus pruebas aplicables pasan.



Actualiza también CONTROL/MACROS.csv: cada una de las 20 macros requiere contrato, instalación y evidencia de ejecución individual. Registrar un nombre o exportar una fuente no satisface esas columnas.
