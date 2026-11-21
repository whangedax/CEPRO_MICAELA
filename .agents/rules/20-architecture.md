---
trigger: model_decision
description: Diseño de React, Electron, backend, IPC, API o límites entre capas.
---
# Capas
Renderer presenta e interactúa; API tipada comunica; backend valida y persiste.
No introducir acceso directo a Node/SQLite desde componentes.
Para UI consulta `docs/UI_ARCHITECTURE.md`; arquitecto solo ante cambios de
contratos, Electron, persistencia, autenticación o seguridad.
No añadir dependencias de red al funcionamiento offline.
