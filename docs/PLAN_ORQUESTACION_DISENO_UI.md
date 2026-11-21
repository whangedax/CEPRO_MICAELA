# Plan de orquestación y diseño de interfaces — CEPRO_MICAELA

Fecha: 2026-11-12. Estado: estructura y skills instaladas; falta verificar descubrimiento y ejecución dentro de Antigravity.

Este documento conserva el diagnóstico y la estrategia iniciales. Para el estado
actual, las rutas instaladas y el arranque consulta `docs/ORQUESTACION_LOCAL.md` y
`docs/cerebro-proyecto/INDICE_ACTIVO.md`; las referencias a «por crear» más abajo
describen el punto de partida, no dependencias aún ausentes.

## 1. Situación verificada

- Aplicación Windows offline con Electron, React, TypeScript y Tailwind.
- Este worktree no contiene `.agents` ni un `AGENTS.md` raíz al iniciar esta revisión.
- La copia `C:/CETPRO/CETPRO_MODERNIZACION_V2/.agents` contiene cinco perfiles y dos skills: `token-saver` y `cepro-orquestacion`.
- El protocolo existente separa exploración, arquitectura condicional, implementación, auditoría y documentación. No define un diseñador ni presupuestos por fase.
- Los modelos `flash`, `pro` e `inherit` son declaraciones de esos perfiles; no se verificó su correspondencia con el runtime de Codex.
- `.gitignore` excluye `.agents/`: las definiciones locales actuales no viajan automáticamente a los worktrees. No cambiar esa exclusión global sin revisar qué archivos se incluirían.
- `src/index.css` declara Plus Jakarta Sans. No se hallaron fuentes en `src/public` de la copia principal ni su carga en los estilos revisados. Falta confirmar la fuente renderizada en la aplicación.

## 2. Objetivo y límites

Conseguir interfaces legibles, coherentes y cuidadas, empezando por el panel docente. Conservar verde institucional, operación offline, roles y comportamiento académico. Preservar geometría y tipografía de los 21 formatos MINEDU.

Esta estrategia no rediseña todavía pantallas, instala skills externas, cambia modelos ni activa un servicio de agentes. Los perfiles Markdown describen roles; el coordinador debe invocar las herramientas de delegación disponibles para ejecutarlos.

## 3. Responsables y skills

Todos aplican `token-saver`. Cada perfil debe declarar `skills_obligatorias`, `skills_condicionales`, `entradas`, `salidas`, `archivos_permitidos` y `criterio_de_cierre` en su cuerpo. Estos campos son un contrato de trabajo, no opciones nativas verificadas de Codex.

| Responsable | Skill obligatoria de especialidad | Cuándo carga otras skills | Entrega y límite |
| --- | --- | --- | --- |
| Coordinador principal, rol `cepro-orquestador` | `cepro-orquestacion` | Lee contratos de especialistas; no carga todas sus skills | Divide trabajo, asigna archivos, decide avance y mantiene estado; no duplica implementación |
| `cepro-explorador` | `cepro-exploracion`, local por crear | Skill de dominio solo ante una duda concreta | Mapa de rutas, símbolos y rangos, máximo 25 líneas; solo lectura |
| `cepro-disenador-ui`, nuevo | `cepro-ui-design`, local por crear | `ui-ux-pro-max` para sistema visual; `frontend-design` para composición | Especificación visual, propuesta de pantalla y criterios verificables; no modifica código productivo |
| `cepro-arquitecto` | `cepro-arquitectura`, local por crear | `electron` para procesos/IPC; `sql-database-assistant` para esquema/consultas | Contratos y riesgos, máximo una página; solo si cambia arquitectura |
| `cepro-implementador` | `cepro-implementacion`, local por crear | `tailwind` al estilizar; `vercel-react-best-practices` al cambiar React; `typescript-pro` si hay tipos complejos | Código del lote asignado, pruebas focalizadas y evidencia; no se autoaprueba |
| `cepro-auditor` | `cepro-auditoria`, local por crear | `web-design-guidelines` para UI; `electron` o SQL solo cuando el cambio lo requiera | Dictamen con evidencia; solo lectura del código revisado |
| `cepro-documentador` | `cepro-memoria`, local por crear | Ninguna por defecto | Actualiza índice e informe usando hechos verificados; no vuelve a explorar el repositorio |

Los seis nombres locales nuevos son propuestas, no skills instaladas. Las skills externas de diseño también están pendientes de integrar. Las skills de especialidad ya disponibles en la sesión se leen desde su ubicación real, sin copiar sus manuales dentro de cada perfil.

## 4. Contenido mínimo de las skills locales propuestas

- `cepro-exploracion`: búsqueda acotada, identificación de dependencias y mapa con evidencia; sin suites pesadas.
- `cepro-ui-design`: brief institucional, tipografía offline, variables visuales, componentes, estados y revisión visual. Primero comprobar fuentes; no cambiar una familia solo por novedad.
- `cepro-arquitectura`: contratos e invariantes de las áreas afectadas; omitir este paso en ajustes visuales sin cambios de arquitectura.
- `cepro-implementacion`: consumir especificación y rutas recibidas, respetar propiedad de archivos y comprobar el comportamiento modificado.
- `cepro-auditoria`: comparar resultado con criterios, inspeccionar cambios y revisar evidencia real; profundizar seguridad solo si el alcance la afecta.
- `cepro-memoria`: separar verificado, pendiente e hipótesis; registrar una sola fuente de estado y enlaces a evidencias.

Mantener cada skill breve, aproximadamente 40–80 líneas cuando baste. Cargar referencias adicionales por necesidad. No incrustar bases de paletas, catálogos de fuentes ni informes históricos en el contexto inicial.

## 5. Contrato de delegación

El coordinador envía a cada especialista únicamente:

```text
Objetivo: un resultado concreto.
Contexto verificado: resumen breve y referencias.
Entradas: rutas, rangos relevantes y especificación vigente.
Skills: nombres y rutas disponibles que debe leer.
Propiedad: archivos que puede editar; resto solo lectura.
Aceptación: comportamiento y evidencia necesarios.
Presupuesto orientativo: contexto nuevo y extensión de entrega.
Salida: estado, archivos/líneas, evidencia, bloqueos y siguiente paso.
```

Evitar heredar todo el chat cuando el resumen baste y la herramienta permita contexto aislado. El coordinador adjunta las reglas aplicables al trabajo; el agente no debe descubrirlas desde cero. No se asignan dos escritores al mismo archivo simultáneamente.

## 6. Ahorro de tokens con calidad

- Buscar con `rg -n` antes de leer; bloques de hasta 120 líneas y sin releer salvo cambio o necesidad concreta.
- Entregas habituales: 15–25 líneas; una propuesta visual puede usar hasta una página y enlaces a capturas.
- Guardar logs completos fuera del contexto cuando se necesiten; retornar resumen y ubicación. Conservar el código de salida del comando original al filtrar, para no ocultar fallos.
- Usar contexto aislado por tarea, no una conversación creciente para todo el rediseño.
- Una búsqueda cartográfica compartida por lote. El auditor sí inspecciona de forma independiente las partes críticas; la independencia no se elimina para ahorrar tokens.
- Ejecutar pruebas focalizadas tras el cambio. El responsable de integración ejecuta build y regresión pertinente una vez al cerrar el lote; repetir solo por nuevos cambios o fallos.
- Máximo dos intentos con la misma estrategia fallida; después resumir evidencia y replantear. No abandonar un criterio requerido por haber alcanzado un presupuesto orientativo.
- Skills, archivos y capturas se cargan por demanda. No lanzar todos los agentes en cada petición.

Presupuesto orientativo de contexto nuevo por fase, incluyendo instrucciones y extractos nuevos; excluye el contexto ya existente del chat y el cómputo interno no medido:

| Fase | Objetivo de tokens | Condición |
| --- | --- | --- |
| Clasificación y coordinación | 1.000–1.500 | Siempre |
| Exploración | 1.000–2.000 | Si falta mapa o hay más de dos archivos desconocidos |
| Diseño | 2.000–3.000 | En el piloto; luego solo diferencias |
| Arquitectura | 1.000–2.000 | Solo si cambian contratos, Electron, datos o seguridad |
| Implementación de un lote | 3.000–5.000 | Una pantalla o conjunto pequeño de componentes |
| Auditoría | 2.000–3.000 | Independiente para cada lote implementado |
| Memoria | 500–1.000 | Al cierre del lote |

Un piloto con exploración y sin cambios de arquitectura apunta a 9.500–15.500 tokens de contexto nuevo. Es una estimación de planificación, no una promesa de consumo ni un límite ejecutable. No usar contadores estimados como facturación real. Si la plataforma expone uso real, registrar ese dato por separado.

## 7. Flujo del orquestador

1. Leer índice breve y estado de Git. Confirmar objetivo, fuentes disponibles y criterios del lote.
2. Clasificar alcance: visual pequeño, piloto de diseño o cambio de arquitectura.
3. Resolver directamente trabajos triviales; para un piloto delegar exploración si falta mapa.
4. Pedir al diseñador una especificación acotada. Arquitecto solo si hay un motivo técnico concreto.
5. Delegar implementación con rutas y criterios. Un único escritor sobre componentes compartidos.
6. Auditor revisa diff, comportamiento y capturas. Devuelve `APROBADO`, `CON OBSERVACIONES` o `RECHAZADO`, con severidad y evidencia.
7. Corregir defectos que impidan aceptar el lote y revisar las áreas modificadas. Registrar observaciones menores pendientes de forma explícita.
8. Documentador registra el cierre verificado. Coordinador informa resultado y propone el siguiente lote según la prioridad vigente.

Paralelizar solo tareas independientes, por ejemplo búsqueda de fuentes y mapeo de componentes. Diseño precede a implementación; auditoría precede al cierre. No abrir siete agentes a la vez ni mantener agentes ociosos. La selección de modelos depende de los identificadores reales y preferencias autorizadas; no reutilizar `flash/pro` como si fueran modelos de Codex comprobados.

## 8. Lotes del rediseño

| Lote | Resultado concreto | Criterio para continuar |
| --- | --- | --- |
| 0. Preparación | Revisar e integrar skills externas y crear contratos locales; resolver disponibilidad de `.agents` en worktrees | Rutas existentes, skills legibles y propiedad de archivos clara |
| 1. Diagnóstico visual | Capturas de referencia y fuente renderizada del panel docente, con datos sintéticos | Defectos priorizados y comportamiento actual documentado |
| 2. Sistema visual | Paleta, tipografía local, escala, espaciado y estados para claro/oscuro | Especificación breve coherente con las tareas académicas |
| 3. Piloto | Panel docente y componentes compartidos estrictamente necesarios | Evidencia visual y funcional revisada por auditor |
| 4. Extensión | Matrícula, asistencia, evaluación y paneles por rol, una pantalla por lote | Cada pantalla pasa los criterios antes de ampliar alcance |
| 5. Integración | Revisión de recorridos completos y resumen de pendientes | Build y regresión pertinente aprobados; sin cambios de formatos oficiales |

El primer encargo de implementación termina en el piloto. No interpretar una petición de mejorar una pantalla como autorización para rehacer todas las pantallas en una sola ejecución.

## 9. Criterios de calidad del piloto

- Fuente renderizada comprobada y disponible sin internet; licencia y pesos necesarios incluidos al incorporarla.
- Jerarquía clara de título, contexto académico y acción principal; controles y estados consistentes.
- Tabla con nombres largos, estados vacíos, carga, errores y confirmación de guardado comprobados donde existan.
- Navegación por teclado, foco visible y contraste revisados; no comunicar estados solo mediante color.
- Claro/oscuro sin texto ilegible. Ventanas de 1024 y 1366 píxeles y escala de Windows 125 %/150 %; si solo se simula, declararlo.
- Capturas antes/después con el mismo escenario y datos sintéticos. El auditor registra qué tamaños y estados observó realmente.
- Flujo docente afectado funciona; sin cambios de permisos, notas, sincronización ni documentos oficiales.
- No sustituir comprobación visual por build exitoso. No afirmar pruebas que no se ejecutaron.

## 10. Estado breve que devuelve el coordinador

```text
Lote / objetivo:
Etapa / responsable:
Resultado verificado:
Pruebas y capturas:
Consumo real disponible / estimación separada:
Pendientes o bloqueo:
Siguiente tarea acotada:
```

Situación inicial al redactar el plan: revisión y planificación realizadas. Después
se instaló el lote 0 (estructura, perfiles y skills); no se activó un orquestador
persistente ni se comprobó ejecución de perfiles dentro de Antigravity. El siguiente
paso de producto es el diagnóstico del panel docente; el rediseño aún no comenzó.
