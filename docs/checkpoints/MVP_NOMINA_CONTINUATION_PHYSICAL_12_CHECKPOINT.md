# Checkpoint previo — MVP-NOMINA-CONTINUATION-PHYSICAL-12

Fecha: 2026-09-16

## Alcance autorizado

- Continuar la salida administrativa multipágina TMPL-01 en DEMO/LAB.
- Añadir continuidad global inequívoca, total general y registros por página fuera de los campos oficiales.
- Validar físicamente Nómina y Registro desde la UI candidata en Edge automatizado.
- Mantener `CETPRO_DB`, la candidata real y los 21 PDF canónicos sin escrituras ni mutaciones.

## Línea base SHA-256

| Archivo | SHA-256 |
|---|---|
| `app/js/services/document-pagination-policy.js` | `edf6c152de6f17fb071ab0ca6c4a024dc172d87a275fcf87905ae037fb0b9e71` |
| `app/js/services/pdf-template-engine.js` | `fa37447fe064197d1114e9e108d0abf7d1d65e4b5da4f87e7a1e3384681c3b9f` |
| `app/js/ui/nominas-view.js` | `69910efc8c0ddf2de380060b838f5e47397b8701a9d096e35a7e898cf05893c4` |
| `app/js/ui/enrollment-register-view.js` | `c4bd6a7f1a7d75bdeb97b9c4194ba6c918e733c4f46ebd763fb7c5d73eecc62b` |
| `app-v2/index.html` | `79ebd64aeead1f8aeeb8584fb324a790980f2547240680d604e615d913b82b91` |
| `app-v2/candidate.css` | `0ab79cbf195b1b0fb386cd50c6e30fb405853a19c265e46c392fbdf97ec36652` |
| `app/js/config.js` | `110f5b6358c6dd37d5db60e182444305cee02bdd87f1c3b506e8395d9349ffe8` |
| PDF canónico TMPL-01 | `938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2` |

## Hallazgo previo

El modo `ADMINISTRATIVE_MULTIPAGE` reutiliza correctamente una copia de la página canónica por cada bloque de 30, pero cada copia calcula totales H/M parciales y los escribe en casillas oficiales sin identificarlos como parciales. Este gate debe dejar todas las casillas oficiales de totales vacías en la salida administrativa y presentar los conteos únicamente en una franja administrativa externa e inequívoca.

## Restricciones

- No migrar ni abrir `CETPRO_DB` para escritura.
- No crear periodos, currículo, módulos ni asignaciones reales.
- No alterar PDF/XLSX canónicos.
- No declarar aceptación física humana; el resultado automatizado se reporta como `AUTOMATED_EDGE_HEADLESS` y la aceptación humana permanece pendiente.
