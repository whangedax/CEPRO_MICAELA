# Invariantes post-migración v1→v2

| ID | Invariante |
|---|---|
| INV-G01 | Toda matrícula con grupo histórico recibe `grupoId`. |
| INV-G02 | Cada `matricula.grupoId` existe en `grupos_academicos`. |
| INV-G03 | Cada grupo refiere un programa existente. |
| INV-G04 | Programa de matrícula coincide con programa de grupo. |
| INV-G05 | `grupo.sourceGroupCode === matricula.grupoCode` exacto. |
| INV-G06 | Un sourceGroupCode v1 consistente produce un solo grupo migrado; IDs sin colisión. |
| INV-G07 | Conteo de matrículas pre/post idéntico (oracle actual: 295). |
| INV-G08 | Conteo/contenido de estudiantes idéntico (oracle actual: 269). |
| INV-G09 | Conteo/contenido de staging idéntico (oracle actual: 295). |
| INV-G10 | Periodos permanece 0 en la migración actual. |
| INV-G11 | Unidades permanece 0. |
| INV-G12 | Ningún módulo/periodo se infiere o asigna automáticamente. |
| INV-G13 | Ningún store v1 pierde registros ni cambia valores. |
| INV-G14 | En datos de dominio, la única diferencia en matrículas es `grupoId`; metadata añade solo el migration marker requerido. |
| INV-G15 | `sourceGroupCode` y `codigoVisible` no se usan como PK de grupos futuros. |
| INV-G16 | Grupo con programa mixto, código vacío o FK esencial rota aborta la upgrade completa. |
| INV-G17 | Turno/modalidad/sección sin uniformidad+procedencia no se elevan al grupo. |
| INV-G18 | Backup schema 2 enumera exactamente 18 stores y no puede restaurarse mediante UI productiva schema 1. |

El auditor v2 verifica matrícula→estudiante/programa/grupo, grupo→programa/módulo/periodo, coincidencia de programa y trazabilidad groupCode. No repara. Las pruebas de aborto reabren la DB sin versión solicitada y exigen `version===1`, ausencia de `grupos_academicos` y snapshot idéntico.
