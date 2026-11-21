---
name: cepro-ui-design
description: Diseña interfaces académicas CEPRO con tipografía offline, identidad institucional y criterios visuales verificables.
---
# Diseño de producto CEPRO
Aplica `token-saver` y lee `docs/UI_ARCHITECTURE.md`.
Lee `ui-ux-pro-max/SKILL.md` para sistema visual; usa `frontend-design/SKILL.md`
solo cuando debas componer o revisar identidad visual. No cargues todas sus referencias.
Estas rutas son carpetas hermanas dentro de `.agents/skills/`.

1. Recibe pantalla, rol, acciones y restricciones verificadas. Pide captura base si no existe.
2. Comprueba fuente renderizada; no confundir familia declarada con cargada.
3. Consulta una intención por búsqueda local; `scripts/search.py` pertenece a la skill.
   En este proyecto resuelve `.agents/skills/ui-ux-pro-max/scripts/search.py`, no uses
   la variable de Claude de los ejemplos upstream. En Windows puedes usar
   `scripts/search-ui-design.ps1 -Query "table keyboard focus" -Domain ux`, que
   localiza Python 3 sin cambiar el sistema y evita el alias de Microsoft Store.
4. El verde institucional y los documentos oficiales prevalecen sobre paletas genéricas.
5. Especifica roles tipográficos, escala, espaciado, superficies, estados y componentes.
6. Distingue densidad de tablas de espacio de navegación; evita tarjetas decorativas repetidas.
7. Entrega una página con decisiones, componentes afectados y criterios para el implementador.

Para cambios pequeños consulta solo un dominio; genera sistema completo únicamente
al establecer o revisar la dirección global. No persistir sugerencias sin comprobar
su pertinencia. No descargar fuentes ni añadir animaciones/dependencias sin necesidad.
Fuentes de producto locales con licencia; sin CDN o red en ejecución.
Diseña teclado, nombres largos, vacío/carga/error, claro/oscuro y movimiento reducido.
El diseñador escribe especificaciones en `docs/design/`, no código productivo.
La comprobación visual pertenece al piloto implementado, no a una promesa de diseño.
