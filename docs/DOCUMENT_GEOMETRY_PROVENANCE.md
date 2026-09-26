# NIGHT-DOCUMENT-BUILD-01 — procedencia geométrica

Fecha: 2026-09-15. Alcance: los 21 PDF canónicos, 24 páginas físicas. Este documento no autoriza emisión oficial ni convierte una zona visual en una caja de escritura certificada.

## Método y regla de corte

Los PDF se conservaron byte a byte y se inspeccionaron como PDF nativo. Las páginas se renderizaron únicamente para revisión visual; la emisión nunca se rasteriza. Una caja se incorpora con coordenadas solo cuando sus cuatro límites físicos son inequívocos y están dentro de la página. Una semejanza visual entre plantillas no permite copiar coordenadas. Si falta un límite, la zona se declara `geometryStatus=REVIEW_REQUIRED` y no se dibuja.

La cadena de evidencia es: PDF canónico + SHA-256 → página y dimensiones → caja física observada/medida → `canonicalKey` auditada → manifiesto independiente. `FIXED_IN_TEMPLATE` no se vuelve a pintar. Un campo bloqueado resuelve a texto vacío. Un texto resuelto que no cabe produce `FIELD_OVERFLOW`; nunca se trunca ni se omite.

## Estado por familia

| Plantillas | Evidencia geométrica incorporada | Corte conservador |
|---|---|---|
| TMPL-01 | Cajas históricas auditadas en `TMPL01_PDF_FIELDS.json`; una página y 30 filas máximas | No existe PAGE_2; capacidad + 1 produce `CAPACITY_EXCEEDED`; I-049 continúa abierta |
| TMPL-02 | Once cajas auditadas en `TMPL02_PDF_FIELDS.json`; seis históricas permanecen byte-equivalentes en su geometría y cinco proceden de líneas vectoriales físicas | `PRIMARY_PERSON_NAME` se define en el manifiesto, sin cambiar la caja aprobada; overflow es error |
| TMPL-03 | Página A3 vertical revisada visualmente | La zona inferior comprimida y la numeración 15 repetida impiden certificar capacidad/casillas; no se incorporaron cajas |
| TMPL-04 | Dos rectángulos inequívocos para programa y módulo medidos sobre la página A4 | Duración, inicio, turno, docente y autoridad no se enlazan: límites o fuentes insuficientes |
| TMPL-05–10 | Capacidad física auditada de 40 filas por PDF; manifiesto individual | Las zonas lógicas están inventariadas, pero las coordenadas de escritura siguen `REVIEW_REQUIRED`; no se copian entre UD |
| TMPL-11 | Capacidad auditada de 47 filas y 5 indicadores | Coordenadas de escritura y reglas derivadas pendientes |
| TMPL-12–17 | Capacidad auditada de 40 filas y 5 indicadores por PDF | Manifiestos separados; ninguna geometría se presume idéntica; no existe As-7 |
| TMPL-18 | 40 filas y 9 espacios/criterios visibles auditados | La semántica de los nueve criterios y sus bindings queda bloqueada por fuente/norma |
| TMPL-19 | Dos páginas físicas, 20 + 20 filas | No se sintetiza página 3 ni se calculan estadísticas oficiales |
| TMPL-20 | Dos páginas y 8 filas de detalle | Registro, elegibilidad y emisión permanecen bloqueados |
| TMPL-21 | Dos páginas físicas | Campos de título/registro/autoridad permanecen bloqueados y sin coordenadas certificadas |

Los 21 manifiestos viven en `app/data/pdf-manifests/TMPL-01.json` a `TMPL-21.json`. Las entradas sin `x/y/width/height` son inventario lógico deliberadamente no renderizable; no son cajas físicas aprobadas.
