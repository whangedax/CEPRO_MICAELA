---
name: cepro-implementacion
description: Implementa lotes CEPRO con propiedad de archivos, skills técnicas condicionales y verificaciones focalizadas.
---
# Implementación acotada
Aplica `token-saver`. Consume mapa, especificación y contratos del encargo.
Si faltan, explora solo el área necesaria y comunica el hallazgo al coordinador.
Carga skills hermanas según trabajo: `tailwind` para estilos,
`vercel-react-best-practices` para React, `typescript-pro` para tipos complejos,
`electron` para procesos/IPC, `sql-database-assistant` para esquema/consultas.
No cargar referencias Next.js en esta aplicación Vite salvo necesidad demostrada.
Edita solo archivos asignados; avisa antes de tocar un archivo de otro escritor.
Prueba el comportamiento cambiado con datos sintéticos. El responsable de integración
ejecuta build y regresión pertinente al cierre; no duplicarlos en cada especialista.
Entrega diff, comandos/códigos de salida y resultado real. No autoaprobar ni subdelegar.
