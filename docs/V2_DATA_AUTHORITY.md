# Autoridad de datos v2

| Dominio | Autoridad | Campo histórico / derivado |
|---|---|---|
| Identidad | `estudiantes.id` | documento como texto, sin normalización inventada |
| Matrícula | `matriculas.id` | una persona puede tener N matrículas |
| Grupo | `grupos_academicos.id` y `matriculas.grupoId` | `grupoCode`/`sourceGroupCode` solo trazabilidad |
| Programa | `programas.id` | debe coincidir entre matrícula y grupo |
| Módulo/periodo | grupo académico cuando exista fuente oficial | no heredar desde otra matrícula |
| Currículo | módulo → unidad → indicador | bloqueado por B-002 |
| Documento | contexto resuelto + contrato + manifest | preview no autoriza emisión |

Una divergencia entre autoridad y campo histórico se reporta; no se corrige automáticamente.
