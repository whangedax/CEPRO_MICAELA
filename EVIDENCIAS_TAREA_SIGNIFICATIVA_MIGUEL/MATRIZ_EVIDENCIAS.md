# Matriz de Evidencias de la Tarea Significativa

| Operación | Paso/Subpaso | Evidencia | Estado | Hallazgo real |
|---|---|---|---|---|
| 1 | 1.1.1 | Evidencia 01 | VERIFICADO | Se comprobó ubicación en repositorio local CETPRO y la existencia activa de la rama DEV-MIGUEL. |
| 1 | 1.1.2 | Evidencia 01 | VERIFICADO | La rama DEV-MIGUEL aísla correctamente los cambios. |
| 1 | 1.1.3 | Evidencia 02 | VERIFICADO | Se comprobó la sincronización con origin/main y origin/dev-gonzalo. |
| 1 | 1.2.1 | Evidencia 03 | **NO VERIFICADO (Parcial)** | La descripción indicaba extensiones `.docx` y `.xml`. **HALLAZGO REAL:** El sistema utiliza plantillas `.pdf`, metadatos en `.json` y hojas `.xlsx`. No existen archivos docx ni xml. |
| 1 | 1.2.2 | Evidencia 04 | VERIFICADO | Existe un catálogo y vistas diferenciadas de documentos individuales y grupales. |
| 1 | 1.3.1 | Evidencia 05 | **NO VERIFICADO (Parcial)** | La descripción afirma usar XML Tools y Jinja Linter. **HALLAZGO REAL:** El proyecto usa configuración JSON (`TMPL-18.json`), sin presencia de Jinja ni XML. |
| 1 | 1.3.2 | Evidencia 06 | VERIFICADO | La estructura institucional y áreas visuales del PDF original se mantienen. |
| 2 | 2.1.1 | Evidencia 07 | VERIFICADO | Los campos estáticos (nombres normativos) son parte intrínseca del PDF base. |
| 2 | 2.1.2 | Evidencia 07 | VERIFICADO | Se respetan cabeceras, logos y pie de página en los archivos de origen. |
| 2 | 2.2.1 | Evidencia 08 | **NO VERIFICADO (Parcial)** | La descripción propone placeholders `{{nombre_cetpro}}`. **HALLAZGO REAL:** El sistema no usa placeholders en texto, inyecta datos mediante coordenadas absolutas JSON (ej. `"dataSource": "institution.name"` y `"position": {"x":120, "y":745}`). |
| 2 | 2.2.2 | Evidencia 09 | VERIFICADO | Existe correspondencia demostrable entre `TMPL-18.json` y el sistema. |
| 2 | 2.3.1 | Evidencia 10/11 | VERIFICADO | La plantilla TMPL-18 posee los campos EFSRT señalados, inyectados vía coordenadas. |
| 2 | 2.3.2 | Evidencia 12 | VERIFICADO | La plantilla contiene cuadrículas exactas para criterios y evaluación final. |
| 3 | 3.1.1 | Evidencia 13 | **NO VERIFICADO (Total)** | Se propone el uso de `{% for alumno in ... %}`. **HALLAZGO REAL:** El proyecto utiliza renderizado programático en JavaScript (`app/js/ui/documents-view.js`) inyectando texto iterativo sobre coordenadas relativas al `originY` de una cuadrícula (`grid`), no usa Jinja. |
| 3 | 3.1.2 | Evidencia 14 | VERIFICADO | Cada fila genera campos como código, nombre, empresa, notas y situación. |
| 3 | 3.2.1 | Evidencia 15/16| VERIFICADO | Se generaron documentos con datos tabulares manteniendo márgenes. |
| 3 | 3.2.2 | Evidencia 17 | VERIFICADO | Existe una fila o sección de consolidado al final de las listas de evaluación. |
| 3 | 3.2.3 | Evidencia 18 | VERIFICADO | La paginación automática se gestiona mediante el archivo de manifiesto (propiedad `capacity.rows`). |
| 4 | 4.1.1 | Evidencia 19 | VERIFICADO | El sistema y PDF-lib soportan inyección de caracteres UTF-8. |
| 4 | 4.1.2 | Evidencia 20 | VERIFICADO | Los campos no resueltos quedan en blanco por diseño. |
| 4 | 4.2.1 | Evidencia 21 | VERIFICADO | Historial Git refleja constantes adaptaciones de variables (ej. commits de Gonzálo y Miguel). |
| 4 | 4.2.2 | Evidencia 22 | VERIFICADO | El JSON de plantilla define estrictamente fuente (`fontId`) y tamaño (`size`). |
| 4 | 4.3.1 | Evidencia 23 | VERIFICADO | Historial de diffs disponibles. |
| 4 | 4.3.2/3| Evidencia 24 | VERIFICADO | Commit `5296117` existe realmente modificando `TMPL-18.json`. El commit propuesto textualmente (`fix(templates)...`) **NO EXISTE**, el real es el 5296117. |
| 4 | 4.3.4 | Evidencia 26 | **NO VERIFICADO (Total)** | La suite T-AH01 no existe en el repositorio. Existen otras regresiones (`mvp_...`, `night_...`, `m12_...`), pero ninguna nombrada T-AH01. |
| 4 | 4.3.4 | Evidencia 27 | **NO VERIFICADO (Total)** | El commit `b37e459` (audit regresion T-AH01) no existe en el historial real. |
