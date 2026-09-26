# MVP-NOMINA-CONTINUATION-PHYSICAL-12 — informe A–R

Fecha de cierre técnico: 2026-09-17

Entorno: `AUTOMATED_EDGE_HEADLESS`, Microsoft Edge `Edg/153.0.4234.32`, runtime DEMO/LAB aislado. Este resultado no constituye aceptación física humana.

## Resultado

| Ítem | Evidencia | Resultado |
|---|---|---|
| A | DEMO B | 25 matrículas, 1 página | 
| B | DEMO A | 40 matrículas, 2 páginas |
| C | Rangos | B: `1–25`; A: `1–30` y `31–40`. La matriz 1/30/31/40/50/60/61/70/300 confirmó hasta `271–300`. |
| D | Total general | B=25 y A=40, mostrados solo en el overlay administrativo. Las casillas oficiales de totales quedan vacías. |
| E | Filas por página | B=`25`; A=`30+10`. Para cada escala, la suma de chunks coincide con el total. |
| F | Duplicados | 0; `unique(matriculaId) = totalRows`. |
| G | Omisiones | 0; el orden global extraído del PDF coincide con el contexto de entrada. |
| H | Visor Nómina | Visible inmediatamente después de generar, con estado `Generando…` y éxito accesible. |
| I | Descarga | Enlace visible pulsado en Edge; nombre de archivo y bytes PDF válidos para B y A. |
| J | Impresión | Botón visible y manejador de impresión ejecutado para B y A. |
| K | Visor Registro | Visible con scroll automático para DEMO A=40 y DEMO B=25; estados de progreso y éxito observados. |
| L | PDF Registro | A=40: 3 páginas/40 filas; B=25: 2 páginas/25 filas; sin truncamiento. |
| M | CSV Registro | A=40: 42 líneas (rótulo DEMO + cabecera + 40); B=25: 27 líneas; nombres completos y estado de éxito visible. |
| N | Errores JS | 0. |
| O | Red externa | 0 solicitudes. |
| P | Candidata intacta | Conteos 269/295/12/0/0/0 y fingerprint semántico idéntico antes/después. En una corrida dedicada: `491e268104c07b963631e8b5ee32e5e60d48f464a3a16ef1b7f2922da65a4ef9`. |
| Q | Hashes PDF | 21/21 canónicos intactos. TMPL-01 canónico conserva SHA-256 `938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2`. |
| R | Suite dedicada | `31/31`, `failed=0`; regresión segura `576/576`, `failed=0`, 20 suites. |

## Auditoría de totales TMPL-01

- En el renderer canónico de máximo 30, H/M/TOTAL corresponden al documento canónico completo; G/P/B y total de condición permanecen vacíos porque no existe fuente confirmada.
- Antes de este gate, cada copia administrativa calculaba H/M/TOTAL por chunk, lo que producía un total parcial no rotulado.
- En `ADMINISTRATIVE_MULTIPAGE`, todas las casillas oficiales de resumen quedan ahora vacías. No se inventa condición G/P/B.
- Fuera de los campos oficiales se imprime `TOTAL GENERAL DEL GRUPO: X` y `REGISTROS EN ESTA PÁGINA: Y`, junto con `Página X de Y · Registros A–B`.

## Inspección visual

El artefacto A=40 fue renderizado a PNG en sus dos páginas e inspeccionado: A4 intacto, filas físicas 01–30 sin modificación, overlay legible en el margen inferior, casillas oficiales de resumen vacías y sin solapamiento con el contenido canónico.

Artefacto DEMO: `output/pdf/MVP_NOMINA_CONTINUATION_PHYSICAL_12_DEMO_A_40.pdf` (SHA-256 final `77d7aa980201940482201cfedf75c5031b98d0c0e7e29eb26a25a66bd3e67342`).

## Límites preservados

- `CONFIG.DB.VERSION` productiva continúa en 1.
- `CETPRO_DB` no fue abierta, migrada ni escrita por la suite dedicada.
- No se crearon periodos, currículo, unidades ni asignaciones reales.
- TMPL-01 canónica mantiene máximo 30; TMPL-02 funciona; TMPL-03 continúa `REVIEW_REQUIRED`; TMPL-19/20/21 conservan exactamente 2 páginas.
- `HUMAN_PHYSICAL_EDGE_ACCEPTANCE=PENDING` hasta confirmación expresa del usuario en Edge visible.
