# M12.1B — Auditoría de fuente física institucional

Fecha: 2026-09-14

## Procedencia

- Código: `FUENTE_FISICA_INSTITUCIONAL_2026`
- Descripción: Volante físico institucional entregado por jefatura/dirección.
- Transcripción de valores entregada con la orden M12.1B.
- SHA-256 de la transcripción recibida: `47c91a3d74d60e657421aec5a9e0d17a547cd74024c772ad93403a3690c9cd1c`.
- La imagen `sources/raw/CARRERAS.jpeg` es una fuente separada que confirma los siete programas; no se le atribuyen los datos de contacto ni las resoluciones del nuevo volante.

## Estructura previa del modelo `institucion`

El object store `institucion` usa `id` como keyPath, sin índices y sin columnas rígidas. Antes de M12.1B existían los campos `nombre`, `distrito`, `ugel`, `dre`, `codigoModular`, `direccion`, `telefono`, `correo`, `director`, `resolucion`, `ruc`, `fuente`, `fechaRegistro`, `estado` y `observaciones`.

## Campos reutilizados

- `nombre`
- `ugel`
- `direccion`
- `telefono`
- `resolucion`, como representación combinada compatible para la caja visual única de TMPL-02
- `fuente`
- `observaciones`

## Campos añadidos de forma compatible

- `denominacionVisible`
- `tipoGestion`
- `resolucionAutorizacion1`
- `resolucionAutorizacion2`
- `celular1`
- `celular2`
- `fuenteDescripcion`
- `inicioAnunciado`
- `horarioAnunciado`
- `requisitosInscripcion`

No se modifica la versión de IndexedDB porque el store admite objetos extensibles y no requiere índices nuevos.

## Valores confirmados incorporados

| Campo | Valor |
|---|---|
| `nombre` | `CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"` |
| `denominacionVisible` | `CENTRO DE EDUCACIÓN TÉCNICA PRODUCTIVA PÚBLICO\nMICAELA BASTIDAS PUYUCAWA` |
| `tipoGestion` | `PÚBLICA` |
| `ugel` | `SAN ROMÁN` |
| `resolucionAutorizacion1` | `R.D. N.º 3367-DREP` |
| `resolucionAutorizacion2` | `R.D. N.º 774-DREP` |
| `resolucion` | `R.D. N.º 3367-DREP / R.D. N.º 774-DREP` |
| `direccion` | `Jr. Yungay N.º 302 - San Miguel - Juliaca` |
| `telefono` | `051-602378` |
| `celular1` | `999-041818` |
| `celular2` | `961-990905` |
| `inicioAnunciado` | `10 DE AGOSTO` |
| `horarioAnunciado` | `M - T - N / L - V y S/D` |
| `requisitosInscripcion` | `Una Foto`; `Fotocopia de DNI`; `Pago por Mantenimiento de Talleres` |

La inicialización del catálogo reconcilia una sola vez el registro productivo `INST-001` existente y registra auditoría. En ejecuciones posteriores, la comparación contra la fuente evita reescrituras y auditorías duplicadas.

## Campos deliberadamente no completados

`dre`, `codigoModular`, `departamento`, `provincia` y `distrito` permanecen como cadena vacía. No se crean valores de periodo lectivo o académico. `10 DE AGOSTO` se conserva únicamente como anuncio informativo y no se transforma en periodo, fecha académica ni apertura oficial.

B-002, B-004 y B-007 continúan abiertas.

## TMPL-02

Se mantienen intactas las cuatro cajas aprobadas en M12.1 y se añaden únicamente:

- `institution.managementType`: celda visual Tipo de Gestión.
- `institution.directorResolution`: celda visual Resolución Directorial, con AutoFit para las dos resoluciones combinadas.

No se modifica el PDF canónico. DRE, Código Modular, Departamento, Provincia, Distrito, periodos, módulo y unidades permanecen sin overlays.

La implementación queda preparada para validación física del usuario en Microsoft Edge; M12.1B no se declara validada físicamente en este documento.
