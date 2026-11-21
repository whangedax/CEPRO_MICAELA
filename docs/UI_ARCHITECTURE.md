# Arquitectura de interfaces — CEPRO_MICAELA

Esta guía define dónde colocar trabajo futuro. No es una migración de código ni
afirma que los componentes propuestos ya existen. Extender las carpetas actuales
antes de crear capas nuevas y mover solo lo necesario para un lote.

## Capas y dependencias

```text
src/pages/                  pantallas y composición de recorridos
    ↓
src/components/academic/    componentes de dominio académico
src/components/network/    interfaz de sincronización existente
    ↓
src/components/ui/         controles compartidos sin reglas académicas
    ↓
src/index.css              entrada de Tailwind y variables del tema

src/api/                   cliente y contratos para backend
electron/ + scripts/       procesos, autorización y persistencia existentes
```

Páginas y componentes de dominio usan `src/api/`. Los controles UI reciben datos y
callbacks; no conocen SQLite, IPC, contraseñas ni reglas de aprobación académica.
No duplicar validaciones de autoridad en el renderer. No introducir dependencias
de un componente base hacia una página o hacia un componente de dominio.

## Sistema visual

- `docs/design/BRIEF.md`: objetivo y restricciones del piloto.
- `docs/design/SYSTEM.md`: crear después del diagnóstico; decisiones verificadas de
  paleta, tipografía, escala, espaciado, superficies y estados. Un único documento rector.
- `docs/design/<lote>.md`: diferencias y aceptación de la pantalla; no copiar el sistema.
- Si UI/UX Pro Max genera `design-system/`, tratarlo como candidato: revisar pertinencia
  y consolidar decisiones en SYSTEM.md antes de implementar; no mantener dos autoridades.
- Variables compartidas de Tailwind 4 en `@theme` de `src/index.css`. Extraer un archivo
  de tema solo cuando el tamaño o los consumidores lo justifiquen.
- Colores semánticos para superficie, texto, borde, acción, éxito, aviso y error.
  Estados académicos requieren también texto/iconos, no solo colores.
- Reutilizar Sidebar, Topbar, modales y tarjetas existentes. Crear Button, Field,
  DataTable, Tabs u otros controles solo cuando el piloto demuestre repetición útil.

## Tipografía y recursos

Primero comprobar en runtime la fuente realmente renderizada. Al integrar fuentes,
usar recursos locales con licencia bajo `public/fonts/`, `@font-face` y solo los pesos
necesarios. Sin importaciones de Google Fonts o CDN en ejecución offline.
Separar tamaño de lectura, metadatos, encabezados y datos tabulares; no reducir
información esencial a texto diminuto. Alinear cifras cuando facilite comparación.
La fuente y estilos de la UI no modifican la geometría ni fuentes de los documentos MINEDU.

## Calidad por lote

Comparar antes/después en el mismo escenario sintético. Verificar navegación por
teclado, foco, nombres largos, estados vacíos/error/carga donde existan, claro/oscuro
y movimiento reducido. Revisar 1024/1366 px y escalas Windows 125 %/150 % pertinentes;
declarar qué se observó realmente y qué fue simulado. No afirmar escalado nativo
a partir de un viewport de navegador.

Auditoría visual independiente para cambios sustanciales. Build y pruebas focalizadas
no sustituyen las capturas y el recorrido afectado. No añadir una biblioteca UI o de
animaciones por estética si los controles existentes pueden resolver el objetivo.
