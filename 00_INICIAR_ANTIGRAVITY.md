# Primer mensaje para Antigravity

Abre este repositorio como Project y envía lo siguiente al agente:

---

Trabaja exclusivamente dentro de este Project CETPRO.

Lee primero, en este orden:
1. `.agents/rules/00-core.md`
2. `.agents/rules/10-data.md`
3. `.agents/rules/20-architecture.md`
4. `.agents/rules/30-documents.md`
5. `.agents/rules/40-quality.md`
6. `docs/PROJECT_STATE.md`
7. `docs/ROADMAP.md`
8. `docs/DATA_MODEL.md`
9. `docs/MIGRATION_FROM_EXCEL.md`
10. `sources/templates/CATALOGO_PLANTILLAS.md`
11. `sources/templates/audit/LEEME_PRIMERO.txt`

Después ejecuta **únicamente M00 — Contratos y arquitectura** usando la skill `cetpro-module`.

Objetivo de M00:
- auditar las fuentes disponibles sin modificarlas;
- definir el contrato de datos para la aplicación local;
- confirmar el modelo Persona/Estudiante → Matrícula → Grupo/Programa/Módulo;
- definir las interfaces de persistencia IndexedDB;
- definir estados, errores y reglas de auditoría;
- verificar que existen las 21 plantillas recibidas y contrastar sus SHA-256 con `sources/templates/CATALOGO_PLANTILLAS.md`;
- registrar que el conjunto fuente no incluye As-7 / asistencia UD7 y que no debe inventarse;
- registrar todas las reglas institucionales faltantes como BLOQUEADAS;
- producir `docs/contracts/` y actualizar `docs/PROJECT_STATE.md`.

No implementes todavía pantallas productivas, no cargues datos reales a IndexedDB y no inventes reglas académicas. Si una decisión institucional falta, documenta el bloqueo y continúa con las partes independientes.

Al finalizar, muestra:
- archivos creados/modificados;
- decisiones técnicas tomadas;
- bloqueos reales;
- pruebas ejecutadas;
- criterio exacto para poder comenzar M01.

---
