# DEMO-NOMINA-HOTFIX-10 — resultado de pruebas

Fecha: 2026-09-16

Estado final: suite dedicada ejecutada en Microsoft Edge headless `Edg/153.0.4234.32` con **22/22**, `failed=0`.

La suite valida navegación real `Grupos → GRUPO DEMO B → Nómina`, `runtimeTarget=DEMO`, `DB=CETPRO_V2_DEMO`, autoridad por `groupId`, 25 filas visibles y en PDF, TMPL-01 válido de una página, marca `DEMOSTRACIÓN — NO OFICIAL`, ausencia de IDs técnicos como códigos oficiales, visor Blob visible, descarga e impresión. También confirma `CAPACITY_EXCEEDED` para Grupo A=40, reporte completo de 40 filas, 0 errores de consola, 0 red externa y fingerprint/conteos de `CETPRO_V2_CANDIDATE` idénticos antes/después.

Resultado de la regresión segura acumulada: **511/511 en 18 suites**, `failed=0`.
