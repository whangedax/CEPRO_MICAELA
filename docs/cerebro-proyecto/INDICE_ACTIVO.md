# Índice Vivo Activo — CEPRO_MICAELA 2.0

> Lectura rápida (< 65 líneas). Para historia detallada o hashes antiguos usar `rg -n` sobre `CEPRO_MICAELA_CEREBRO_MAESTRO.md` o `HISTORIAL_TAREAS.md`. No leer esos archivos completos por defecto.

## Estado Vigente (2026-11-20)
- **Rama activa:** `feat/multianio-sync-modular`.
- **Padrón 2026-I Completo en `dev-sandbox/data/cetpro.sqlite` (7 carreras, 17 grupos abiertos, 311 activos / 312 totales, 338 matrículas activas, 11/11 docentes activos, 0 duplicados intra-carrera):**
  - **Computación (`PROG-005`/`MOD-009`):** `A:25, B:29, C:22, D:21` = **97** (`magda.chura`) · [load-comp-tarde-2026.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/load-comp-tarde-2026.cjs) (`C77B...C8DE`).
  - **Corte y Ensamblaje (`PROG-006`/`MOD-011`):** `Mañana A:27, Tarde B:23, Noche C:7, Conv. Lampa Mañana A:8` = **65** (`liz.flores`, `rene.chura`, `teofilo.larico`, convenio sin docente) · [load-corte-ensamblaje-2026.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/load-corte-ensamblaje-2026.cjs) (`2812...F52A`).
  - **5 Carreras Restantes (`PROG-001..004, 007`):** Electricidad (`Mañana A:8` `serafin.huanca`), Automotriz (`Tarde A:21` + `Conv. Lampa Mañana A:8` `edgar.velasquez`), Motos (`Mañana A:32` `anibal.maquera`), Carpintería (`Tarde A:24` + `Conv. Lampa Mañana A:4` `cesario.ccosi`), Peluquería (`Mañana A:35` `alejandrina.ayna`, `Tarde B:18` `azucena.ccolla`, `Noche C:26` `fidelia.gutierrez`) = **176** (incluye 3 `PENDIENTE` `99990001..003`). Script [load-5-carreras-2026.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/load-5-carreras-2026.cjs) (`D877D716C924D0B27BFEDE7A1E97F9E200F4ED19CD91EBF8D772812E4569C5C4`); respaldo `pre-carga-5carreras-20261120.sqlite` (`3D8E5DACF03A99B283F39B9D39DCC744184D304E398B2ED6BA22E4996E594EB7`).
  - **Soporte Grupo por Convenio y Consulta UI:** `isConvenio`/`convenioName` en contratos, motor y vistas [GestionGrupos.tsx](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/GestionGrupos.tsx), [GestionEstudiantes.tsx](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/GestionEstudiantes.tsx) y [GestionMatriculas.tsx](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/GestionMatriculas.tsx).
  - **Eliminación Segura de Grupo Cerrado e Integridad Sistémica de Revisiones (`rev`):** `OfflineCore.deleteGroup` ([offline-core.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/offline-core.cjs), `88BC...A827`) exige `DIRECTOR`, `closed === true`, `0` activos y `rev` estricto; autorrepara `rev` al arranque vía `ensureRecordRevisions()`, normaliza `?? null` en `write()`/`importPackage()` manteniendo OCC estricto cuando existe `rev`, sella `rev` en productores ([cepro-bd-catalog.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/cepro-bd-catalog.cjs) `B31B...8A427`, [ficha-registro-2026.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/ficha-registro-2026.cjs) `955C...61A8A`, [import-real-bd-2026.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/import-real-bd-2026.cjs) `7019...5D1B28`), alerta `MISSING_REVISION` en [database-health.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/scripts/database-health.cjs) (`1D61...A80F0`) y sincroniza conflictos `409` en [GestionGrupos.tsx](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/src/pages/GestionGrupos.tsx) (`F156...9594BE`).
  - **Verificación:** `tsc`, `build`, [delete-closed-empty-group.test.cjs](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/tests/delete-closed-empty-group.test.cjs) (`5CAC...2D70AB`, **7/7**), `Conteos Canónicos` (**6/6**; tests 2–3 de `cepro-bd-catalog` omitidos por asumir `286` sobre `dev-sandbox`), `documental-2026` (**6/6**), `test:offline` (**15/15**), `test:secretariat` (**2/2**), `test:academic` (**6/6**), `test:workspace` (**3/3**), copia aislada `VACUUM INTO` de `dev-sandbox` (`60 -> 0` sin `rev`, `G-de522d0a`/`G-78a1f8da` eliminables, `healthy:true`), auditoría `cepro-auditor` **APROBADA**; pendiente reiniciar backend `8085` para autorreparar `dev-sandbox` y QA visual vivo.
- **Base de datos canónica 2026:** 286 estudiantes únicos / 286 matrículas activas (1:1), 13 cuentas oficiales, 7 carreras (`PROG-001..007`), 14 módulos (`MOD-001..014`), 21 plantillas MINEDU (`TMPL-01..21`, Peluquería M2 con 7 UDs vía `TMPL-17`) + extensiones 2026 (`TMPL-22..23`).
- **Sistema Documental Oficial 2026 (Lotes Doc-1 a Doc-5 + Plantilla Oficial 02 Título A4):**
  - 6 plantillas oficiales 2026 (`BASE_01..06` -> `TMPL-22, 21, 20, 23, 19, 01`), 21 formatos MINEDU preservados.
  - `TMPL-21` reconstruido desde `Plantilla_02_Titulo_Auxiliar_Tecnico_corregida.pdf` (`841.89×595.28 pt`), señales `A`–`F` (`A` vertical rotado 90° en portada y repetido en línea institucional + pie de reverso, `B` UGEL independiente sin inventar, `C` R.D. de referencia, `D`–`F` editables, sin código de barras) y guía [Plantilla_Titulo_Senalada_Codigo_Vertical.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/documental/Plantilla_Titulo_Senalada_Codigo_Vertical.md).
  - Parámetros dinámicos del código institucional (`registryCorrelative`, `registryLevelCode`, `programAcronym`/`sigla`, `registryShortRef`, `registryCodeYear`, `referenceResolution`, `tituladoName`, `officialTitleText`) configurables en Config/Centro Documental; `scripts/offline-documents.cjs` (`E11A620B770227243B5BBA2145A714B304999993C503810D6D7886CA0B34DF88`) preserva `doc.parameters` en formatos individuales incluso bajo `demoFill`.
  - Persistencia SQLite `documentEmissions`, correlativos unívocos, exclusión de sync `.cetpro` y RBAC fail-closed (409).
  - Informe técnico consolidado: [ENTREGABLES_SISTEMA_DOCUMENTAL_2026.md](file:///c:/CETPRO/CETPRO_MODERNIZACION_V2/docs/documental/ENTREGABLES_SISTEMA_DOCUMENTAL_2026.md).
- **Último ciclo completado (Lotes 1 a 7 — Rediseño Visual Integral 3 Roles):**
  - Sistema visual `--ui-*` unificado, tipografía offline `Plus Jakarta Sans` en `public/fonts/` (cero CDN), modo claro/oscuro auditado (WCAG `17.43:1`), lienzo PDF y `@media print` protegidos (`rgb(255,255,255)`).
  - Paneles y flujos rediseñados y verificados: Dirección, Secretaría, Docente. Registro: `docs/design/REGISTRO_LOTES_UI.md`.
- **Instaladores de referencia intactos:**
  - Institucional Tarea 43: `release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe` (`AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF`).
  - Producción 2026: `release/CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64.exe` (`AC8B9022902430FFDB5ED59C90DE0D29A727109A4653A2C12D5BE19DCB491974`).

## Mapa Rápido de Código
- **Electron:** `electron/main.cjs`, `electron/preload.cjs`, `electron/backend-runner.cjs`.
- **Backend / SQLite:** `scripts/offline-core.cjs`, `scripts/offline-http.cjs`, `scripts/documental-2026-engine.cjs`, `scripts/document-contracts.cjs`, `scripts/offline-documents.cjs`, `scripts/sync-modules.cjs`, `scripts/curriculum-units.cjs`.
- **Frontend / Diseño:** `src/App.tsx`, `src/index.css`, `src/api/client.ts`, `src/pages/CentroDocumental.tsx`, `src/pages/ConfiguracionDocumental.tsx`, `src/utils/documentTemplates.ts`.
- **QA principal:** `node --test tests/documental-2026-modernization.test.cjs` (6/6), `node scripts/verify_all_21_preflights.cjs` (21/21), `npm run test:sandbox` (219 tests), `npm run test:typography` (6/6), `npm run test:ux-darkmode`.

## Pendientes / Siguiente Paso
- Cuando el usuario autorice salir de modo dev: prueba en Electron real empaquetado con escalado nativo en Windows, actualizar empaquetado con `production-2026-sterile.sqlite` y auditar instalador único universal.

## Tooling de agentes
- Siete perfiles y dieciséis skills locales; guía: `docs/ORQUESTACION_LOCAL.md`; verificar: `node scripts/verify-agent-config.cjs`.

## Sincronización reparada (2026-11-13)
- Flujo común WhatsApp/.cetpro en los tres roles, con capacidades, resumen, preview y confirmación.
- Tablas CSV/XLSX/JSON reparadas; merge, permisos, revisiones e historial conservados.
- QA: 53/53 regresión, 43/43 HTTP, 15 escenarios UI; auditoría aprobada.
- Informe y uso: `docs/SINCRONIZACION_SEGURA_RESULTADO.md`; reiniciar backend si estaba abierto.

## UX de intercambio y archivos (2026-11-13)
- Recorridos guiados en ambos medios y tres roles; fuente local y ayuda plegada.
- QA motor 53/53 y navegador 36 escenarios, cero errores JS; auditoría independiente aprobada.
- Informe: `docs/TRANSFERENCIA_UX_RESULTADO.md`; pendiente USB físico, WhatsApp real y Electron.
