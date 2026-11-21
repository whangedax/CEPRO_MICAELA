# Sistema Visual Unificado — CEPRO_MICAELA 2.0 (Todos los Roles)

Documento rector para el rediseño visual coherente en **DOCENTE**, **SECRETARIA** y **DIRECTOR**, adaptado del piloto `d14c` al sistema de temas existente (`html.dark` + `ThemeSwitcher.tsx`) y preservando intactos los 21 formatos MINEDU.

## 1. Tipografía Offline (Sin CDN)
- **Fuente principal:** `Plus Jakarta Sans` variable empaquetada localmente en `public/fonts/PlusJakartaSans-Variable.ttf` (con `OFL.txt` y `source.json`), declarada vía `@font-face` (`font-weight: 200 800`, `font-display: swap`).
- **Reserva:** `'Segoe UI', system-ui, sans-serif`.
- **Escala:** Título `30/36 px`, Sección `20/28 px`, Tarjeta `16/24 px`, Lectura/Acción `14/21 px`, Metadatos `12/18 px`.
- **Reglas:** `tabular-nums` en cifras/KPIs/tablas; mayúsculas solo para siglas; sin fuentes remotas ni modificación de fuentes/geometría en plantillas PDF MINEDU.

## 2. Tokens Semánticos (`src/index.css` `@theme` + `:root` / `html.dark`)

| Rol Semántico | Variable CSS | Claro (`:root`) | Oscuro (`html.dark`) |
| :--- | :--- | :---: | :---: |
| Fondo lienzo | `--ui-canvas` | `#f6f8fa` | `#0f1715` |
| Superficie tarjeta | `--ui-surface` | `#ffffff` | `#182220` |
| Superficie elevada / hover | `--ui-surface-alt` | `#f1f5f4` | `#1f2d2a` |
| Texto principal | `--ui-ink` | `#172b28` | `#f0fdf8` |
| Texto secundario | `--ui-muted` | `#52645d` | `#b8cbc2` |
| Borde | `--ui-line` | `#d7e2dc` | `#2b413b` |
| Acción primaria | `--ui-brand` | `#13594a` | `#98d5bb` |
| Texto sobre acción | `--ui-on-brand` | `#ffffff` | `#12211e` |
| Contexto suave | `--ui-brand-soft` | `#e6f4f1` | `#213c34` |
| Identidad Sidebar | `--ui-sidebar` | `#103e33` | `#0b2922` |
| Activo Sidebar | `--ui-sidebar-active` | `#e5f2e9` | `#1f4a3e` |

- **Sombra:** una sombra tenue por superficie (`--ui-shadow`).
- **Estados semánticos:** éxito, aviso y error llevan **texto e icono** además de color (nunca solo color).

## 3. Composición, Accesibilidad e Interacción
- **Ritmo 4 px:** `8 px` entre elementos relacionados, `16 px` dentro de grupos, `24 px` relleno de tarjeta, `32 px` entre secciones.
- **Radios:** `10 px` controles/inputs/botones, `16 px` tarjetas/modales, píldora (`9999px`) para badges de estado.
- **Objetivos táctiles y foco:** altura mínima `44 px` en botones, ítems de sidebar y controles interactivos; foco `:focus-visible` de `2 px` con `outline-offset: 3px`.
- **Nombres largos y responsive (`1024 px` / `1366 px`):** `min-width: 0` en contenedores flex de cabecera/tarjetas; truncado seguro sin expulsar botones como `Cerrar sesión`.
- **Modales:** panel `.cepro-dialog-panel`, trampa de foco `Tab` / `Shift+Tab`, cierre con `Escape` y retorno de foco al control origen.
- **Movimiento y Print:** `prefers-reduced-motion` elimina transiciones; `@media print` fuerza `#ffffff` / `#000000` e ignora tema oscuro.

## 4. Prioridades por Rol (Sin Alterar Permisos)
- **Docente:** aulas asignadas, unidad activa, asistencia, evaluaciones y entregas.
- **Secretaría:** padrón de estudiantes, matrículas, ficha de registro 2026 y documentación autorizada.
- **Dirección:** supervisión institucional, entregas/revisión, configuración académica por año, cuentas y red/respaldos.
