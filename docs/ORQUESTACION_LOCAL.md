# Desarrollo local con agentes — CEPRO_MICAELA

## Inicio en Antigravity

Abre la raíz de este proyecto, donde están `AGENTS.md` y `.agents/`.
En una nueva conversación solicita:

```text
Actúa como cepro-orquestador. Lee AGENTS.md y el índice activo.
Aplica token-saver y cepro-orquestacion. Trabaja por lotes y carga solo las
skills del especialista necesario. Objetivo de este lote: [resultado concreto].
```

Las skills del proyecto estarán disponibles al volver a descubrir personalizaciones
o en la siguiente conversación/turno según la versión del host. Comprueba la lista
de skills y agentes en Antigravity; si no se refresca, vuelve a abrir el proyecto.
No se instaló un daemon ni se cambió configuración global del usuario.

El workflow IDE `.agents/workflows/cepro-desarrollar.md` ofrece `/cepro-desarrollar`
en versiones que descubren workflows. Las versiones centradas en skills pueden usar
directamente `cepro-orquestacion`; no es necesario duplicar ni migrar sus instrucciones.

## Estructura instalada

```text
AGENTS.md                         reglas breves de entrada
.agents/
  agents/                         siete perfiles con skills asignadas
  rules/                          cinco reglas activadas por pertinencia
  skills/                         ocho skills locales + ocho de especialidad
  workflows/                      entrada breve para IDE
  skills-lock.json                 procedencia y SHA-256 de skills de terceros
docs/cerebro-proyecto/             índice de continuidad
docs/design/                      brief y futuras especificaciones visuales
docs/UI_ARCHITECTURE.md            límites y organización del frontend
scripts/verify-agent-config.cjs    comprobación estática, sin red ni dependencias
scripts/search-ui-design.ps1      búsqueda local con detección de Python 3
```

## Flujo y modelos

Coordinador → explorador si falta mapa → diseñador si cambia UI → arquitecto solo
ante cambios de contratos/datos/seguridad → implementador → auditor → documentador.
Máximo dos especialistas activos por defecto, sin recursión y un escritor por archivo.
Una corrección pequeña no necesita todos los roles. Revisiones sustanciales sí
conservan independencia entre implementador y auditor.

Los perfiles usan el formato documentado de Antigravity: `skills`, `tools`,
`mainAgent`, `subagent` y política sandbox. Explorador/documentador usan `flash`,
auditor `pro` y otros `inherit`; confirmar disponibilidad en la instalación concreta.
Son niveles de Antigravity, no identificadores de modelos Codex. En otros hosts se
invocan herramientas/modelos disponibles y se transmite el perfil como instrucciones.

Un perfil de solo lectura limita las herramientas de edición y lo instruye así,
pero `run_command` no constituye aislamiento de escritura del sistema operativo.
Los permisos/sandbox reales del host siguen siendo necesarios. No se modificaron
esos permisos ni se comprobó su aplicación dentro de Antigravity.

## Skills y procedencia

Locales: token-saver, cepro-orquestacion, cepro-exploracion, cepro-ui-design,
cepro-arquitectura, cepro-implementacion, cepro-auditoria y cepro-memoria.

Terceros: frontend-design (Anthropic), ui-ux-pro-max (NextLevelBuilder),
web-design-guidelines (Vercel), tailwind, electron, sql-database-assistant,
typescript-pro y vercel-react-best-practices. Las últimas cinco se copiaron de las
skills locales existentes con sus recursos; la procedencia se distingue en el lock.
No atribuir un commit remoto verificado a esas copias locales.

Las tres descargas GitHub están fijadas por commit. Se conservan las licencias
disponibles; en el commit descargado de vercel-labs/agent-skills no se encontró
LICENSE en la raíz. No se inventa una licencia para web-design-guidelines.
Adaptaciones locales: ruta de búsqueda UI/UX para el proyecto, guía de auditoría
offline y normalización de metadatos de cuatro copias locales; ver lock.

UI/UX usa Python 3 para búsquedas locales y no requiere paquetes extra. Ejemplo:

```powershell
.\scripts\search-ui-design.ps1 -Query "table keyboard focus" -Domain ux -MaxResults 1
```

El helper evita el alias de Microsoft Store, busca Python 3 y admite `-PythonPath`
o `CEPRO_PYTHON`. Como fallback opcional detecta el runtime local de Codex si existe;
no lo descarga, no cambia PATH y no requiere una ruta absoluta de este usuario.
Las guías Vercel tienen snapshot offline con commit registrado. Las búsquedas de
diseño son recomendaciones: no importan fuentes remotas ni instalan dependencias.

## Verificación y mantenimiento

```powershell
node scripts/verify-agent-config.cjs
```

Verifica rutas, contratos, metadatos básicos y hashes de terceros; no inicia agentes
ni demuestra que Antigravity los haya cargado. El comprobador no sustituye el parser
YAML del host. Para cambios deliberados en skills externas revisar primero el diff
y actualizar después el lock con `node scripts/verify-agent-config.cjs --write-lock`.
No usar esa opción para ocultar una alteración desconocida.

La configuración está permitida en `.gitignore`; otros archivos privados de `.agents`
siguen excluidos. Los backups locales de integración quedan en `.agents/local-backups/`.
Para otros worktrees, transportar estos archivos con un commit revisado o copia
selectiva. No copiar `.git`, datos, tokens ni bases. No ejecutar cherry-pick o merges
en una rama con cambios ajenos solo para instalar instrucciones.

## Fuentes de compatibilidad

- [Skills Antigravity](https://antigravity.google/docs/skills)
- [Perfiles de agentes](https://antigravity.google/docs/subagents)
- [Reglas y activación](https://antigravity.google/docs/rules/)

Compatibilidad documental revisada el 2026-11-12; falta la prueba de descubrimiento
y ejecución dentro de la instalación del usuario. La configuración por sí sola no
impone presupuestos de tokens ni demuestra la calidad de una pantalla.
