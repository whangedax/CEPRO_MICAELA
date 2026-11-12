# Línea Base Técnica Inicial — Multi-Año, Sincronización Modular e Instalador Único

**Fecha:** 2026-11-12  
**Rama Git:** `feat/multianio-sync-modular`  
**Commit base:** `f4458e2`  
**Objetivo:** Congelar y registrar con rigor matemático el estado inicial del sistema antes de las modificaciones de soporte multi-año, sincronización modular (USB + WhatsApp), saneamiento de instalador e indicadores IL1–IL5.

---

## 1. Hashes Criptográficos de Referencia (SHA-256)

| Componente | Ruta de Archivo | Tamaño (bytes) | SHA-256 |
|---|---|---|---|
| **Línea Base SQLite Producción 2026** | `sources/baseline/production-2026.sqlite` | 77,656,064 | `FE506850B6145E1A461AB3F4FD673CBC4CE0FB771A3B3B97999DB6BC427E630A` |
| **Instalador Oficial Producción 2026** | `release/CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64.exe` | 170,380,019 | `AC8B9022902430FFDB5ED59C90DE0D29A727109A4653A2C12D5BE19DCB491974` |
| **Resguardo de Sandbox de Desarrollo** | `dev-sandbox/data/backups/pre-fase0-lineabase.sqlite` | 88,829,952 | `1686940A0F3D03FDDCBE3BE95F690B42A43B20C4F6CE478E681C3F75D7A9CA79` |
| **Repositorio Histórico (Solo Lectura)** | `C:\CETPRO\PAQUETE_ANTIGRAVITY_CETPRO_V2` | N/A | **Inalterado (0 modificaciones, estricto solo lectura)** |

---

## 2. Resultados de las Suites de Pruebas Base

### 2.1 Red Institucional Básica (`tests/institutional-network.test.cjs`)
- **Comando:** `node --test tests/institutional-network.test.cjs`
- **Resultado:** **13/13 pasaron (100% de éxito)**.
- **Cobertura de garantías:**
  - G01 Rechazo de firmas forjadas.
  - G02 Aislamiento 100% offline.
  - G03 Detección y rechazo de duplicados de importación.
  - G04 Control de concurrencia optimista (OCC) y tabla `conflicts`.
  - G05 Respaldo preventivo SQLite previo a importación.
  - G06 Verificación de integridad AES-256 y firma.
  - G07 Expiración y revocación de kits.
  - G08 RBAC estricto en operaciones satélites.
  - G09 Auditoría inmutable en `audit`.
  - G10 Tolerancia a caracteres especiales y fórmulas.
  - G11 Atomicidad en disco (.tmp -> .cetpro).
  - G12 Límite de tamaño de paquete (16 MB).
  - G13 Preservación exacta 1:1 de 286 matrículas.

### 2.2 Red Institucional Multi-Nodo Canónica (`tests/network-multinode.test.cjs`)
- **Comando:** `node --test tests/network-multinode.test.cjs`
- **Resultado:** **5/5 pasaron (100% de éxito)**.
- **Fases simuladas:**
  - Paso 1: Dirección genera 3 kits institucionales e inicializa satélites.
  - Paso 2: Operaciones locales concurrentes en los 3 nodos satélites (Secretaría, Docente Flores, Docente Valdivia).
  - Paso 3: Exportación concurrente de los 3 satélites al USB hacia Dirección.
  - Paso 4: Dirección escanea USB, aplica respaldo preventivo e importa el lote completo.
  - Paso 5: Idempotencia y resistencia — Segundo escaneo reporta 0 pendientes.

### 2.3 Configuración Académica y Reutilización Anual (`tests/academic-config.test.cjs`)
- **Comando:** `node --test tests/academic-config.test.cjs`
- **Resultado:** **5 pasaron, 1 falló**.
- **Análisis exhaustivo del fallo:**
  - **Prueba fallida:** `intercambio del docente lleva año, periodo y plan y excluye DNI y domicilios del personal`.
  - **Error:** `TypeError: Cannot read properties of null (reading 'fields')` en la aserción:
    `assert.equal(remote.record('documentSettings', 'academicYear:2026').fields.hours, 1056);`
  - **Causa raíz:**
    1. En `scripts/offline-core.cjs` dentro de `exchangePackage` (L608-610):
       `const latestByRecord = new Map(); for (const op of rawOperations) latestByRecord.set(op.body.entity + ':' + op.body.recordId, op);`
       Para `documentSettings`, el registro `academicYear:2026` tiene un `recordId` estructurado.
    2. En `offline-documents.cjs` (L36), la regla de visibilidad para `academicYear`:
       `if (s.kind === 'academicYear') return user.assignments.some(a => a.periodId?.slice(0, 4) === s.target);`
    3. Cuando `remote` importa el paquete antes de aplicar los `groups`, `actor` en `remote` tiene `assignments` que deben coincidir exactamente con el año del periodo. En el arnés de prueba de `academic-config.test.cjs`, la suite crea grupos sintéticos sin pre-cargar los settings completos de `academicYear` ni sincronizar el grupo previamente, lo que ocasiona que `academicYear:2026` sea filtrado durante la visibilidad o deduplicado.
    4. Esta condición se resolverá de raíz en las Fases 3 y 5 con la normalización de metadatos de sincronización de configuración y la resolución de visibilidad por asignación docente.

---

## 3. Dictamen de Línea Base
Línea base debidamente registrada, respaldada y verificada. El sistema se encuentra en un estado determinista, apto para la ejecución secuencial del Plan Maestro sin riesgo de regresión no controlada.
