---
name: cepro-orquestacion
description: Coordina desarrollo CEPRO por lotes con responsables, skills por especialidad, ahorro de contexto y auditoría independiente.
---
# Coordinación por lotes

1. Aplica `AGENTS.md` y `token-saver`; lee índice activo y estado Git.
2. Define un resultado, criterios y archivos del lote. No convierte una pantalla en rediseño total.
3. Delega exploración si faltan rutas o hay más de dos archivos desconocidos.
4. Para diseño visual, diseñador primero. Arquitecto solo si cambian contratos/datos/seguridad.
5. Implementador recibe mapa y especificación; un escritor por archivo.
6. Auditor independiente revisa diff y evidencia; no corregir desde la auditoría.
7. Devuelve defectos al implementador; revisar después las áreas corregidas.
8. Documentador registra hechos; cierra con pruebas reales, limitaciones y próximo lote.

## Despacho
Perfiles en `.agents/agents/cepro-<rol>.md`. Usa las herramientas reales del entorno
para invocarlos; en Antigravity comprueba el descubrimiento de perfiles. Si el entorno
no soporta agentes personalizados, pasa el perfil como instrucciones a un subagente
disponible. Si no hay delegación, ejecuta fases secuenciales y declara la limitación;
no afirmes auditoría independiente ni simules resultados.

Máximo dos especialistas simultáneos por defecto; solo tareas independientes y
con archivos distintos. Sin subdelegación. No lanzar equipos globales para un ajuste pequeño.
Antigravity admite `inherit`, `flash`, `pro`; usar solo si están disponibles en esa
instalación. En Codex heredar modelo y usar herramientas propias; no trasladar alias.

## Encargo mínimo
```text
Objetivo / contexto verificado:
Perfil y skills a leer (rutas existentes):
Entradas (rutas y rangos):
Archivos editables / solo lectura:
Criterios y verificaciones:
Presupuesto orientativo / salida máxima:
```
Salida del especialista: estado, archivos/líneas, evidencia, bloqueos; máximo 25 líneas
salvo especificación visual o arquitectura (una página).

## Presupuesto por lote
Contexto nuevo orientativo: coordinación 1–1,5k; exploración 1–2k; diseño 2–3k;
arquitectura condicional 1–2k; implementación 3–5k; auditoría 2–3k; memoria 0,5–1k.
No son límites técnicos. Registrar consumo real solo si el entorno lo expone.
Para continuidad usa `docs/cerebro-proyecto/INDICE_ACTIVO.md`; para una tarea larga,
un único archivo por lote bajo `docs/cerebro-proyecto/lotes/` con dueño y estado.
No mantener dos índices de estado ni copiar el historial a cada encargo.
