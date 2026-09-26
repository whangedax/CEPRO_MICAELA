# Checkpoint previo — MVP-DOCUMENT-PAGINATION-AND-REGISTRY-HOTFIX-11

Fecha: 2026-09-16

## Barreras

- Trabajo limitado a código compartido y datos DEMO/LAB.
- `CETPRO_DB` no se abrirá, migrará ni escribirá.
- `CETPRO_V2_CANDIDATE` se observará solo para fingerprint/conteos antes y después.
- La geometría `REVIEW_REQUIRED` de TMPL-03 no se habilitará.
- Los 21 PDF canónicos son inmutables.
- La emisión oficial continúa bloqueada.

## Estado previo

- Grupo DEMO B: 25 matrículas; TMPL-01 administrativa de una página visible.
- Grupo DEMO A: 40 matrículas; UI previa bloqueada por `CAPACITY_EXCEEDED` y reporte interno alternativo.
- Registro administrativo: renderer alternativo ya pagina por tabla, pero su visor está después de la tabla larga y no existe estado visible de generación/error.
- Regresión segura previa: 511/511 en 18 suites.
- No existe repositorio Git; este archivo sustituye el checkpoint de commit.

## SHA-256 previos

- `app/js/ui/enrollment-register-view.js`: `35894BB57E9D870E68C04BFA7C4BEA5EACFAB54812467876B67E6AA6CB1E4A48`
- `app/js/ui/nominas-view.js`: `925DB3B67B3344F587E39EF3A47B0BF80F60E7B6EB7417973880401C02A77509`
- `app/js/services/mvp-pdf-service.js`: `885BA80387D937E7E05B5F8DDAD58606F9E759F8127B2DED5BD85D295D787C80`
- `app/js/services/pdf-template-engine.js`: `7D19A82E9CE239867C341A6AB0D7C9280180B9AD3CB988D67C5562669C8A9604`
- `app/data/pdf-manifests/TMPL-01.json`: `4C6C13D1415E8946A74BAE66776F2F99D91DB185618F8B7345C5F147B2D6683C`
- `app/data/pdf-manifests/TMPL-19.json`: `42F5F8F5731A522A4CC8D254A14BA47DCFC56F99B0143364CBAC6462A9C64CCC`
- `app/data/pdf-manifests/TMPL-20.json`: `7C02ED7402274FA3A85D32A9EFC58D60619D18E16EED51C1561B05BDFBE5318F`
- `app/data/pdf-manifests/TMPL-21.json`: `BD5AFB8FE16588677E9E119E6AFBFFE1D17F5999CA7262A7C9D241FE5D99CA39`

## Criterio de detención

Si falla el snapshot inicial, cambia un hash canónico o se detecta una escritura REAL, detener el gate.
