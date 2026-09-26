# Informe Técnico de Implementación — Módulo M04

**Sistema Académico CETPRO Público "Micaela Bastidas Puyucawa"**  
**Módulo:** M04 — Importación Controlada de BD.zip e Incidencias  
**Fecha:** 11 de Septiembre de 2026  
**Estado:** **M04 CONCILIADO — APTO PARA AUTORIZAR IMPORTACIÓN PRODUCTIVA**

---

## 1. Resumen Ejecutivo

El módulo **M04 — Importación Controlada de BD.zip e Incidencias** establece la infraestructura de staging y reconciliación para la ingesta segura y trazable del archivo histórico institucional `sources/raw/BD.zip`.

En estricto cumplimiento de las reglas del proyecto:
1. **0 registros** ingresaron a la base de datos productiva (`estudiantes = 0`, `matriculas = 0`, `unidades = 0`).
2. Se procesaron **295 filas físicas útiles** con estudiantes a partir de los 12 libros de trabajo Excel.
3. Se resolvió formal y matemáticamente la discrepancia histórica de matrículas (**295 vs 300**) y personas (**268 vs 274**).
4. No se utilizaron dependencias externas en el entorno del navegador (cero npm/CDN), utilizando JavaScript ES6+ nativo e IndexedDB.
5. Se creó una suite de pruebas automatizadas con 20 casos de prueba (`T-M04-01` a `T-M04-20`) que concluyó con un **100% de aprobación**.

---

## 2. Arquitectura de Staging

### 2.1 Flujo de Ingesta y Aislamiento

```
BD.zip ──► Lectura XML Nativa ──► Extracción de Filas ──► staging_importaciones (IndexedDB)
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    ▼                         ▼
                                          Evaluación Incidencias     Conciliación Matemática
                                                    │                         │
                                                    └────────────┬────────────┘
                                                                 ▼
                                                    Dashboard Previsualización (#/incidencias)
                                                                 │
                                                    🔒 BOTÓN IMPORTAR BLOQUEADO
```

### 2.2 Estructura del Store `staging_importaciones`

El store de IndexedDB `staging_importaciones` garantiza trazabilidad completa de cada candidato sin modificar las tablas de producción:

```javascript
{
  id: "STG-BD-2026-001",
  loteId: "IMP-BD-2026-001",
  archivoOrigen: "1.A PB TURNO MAÑANA  PROF. ALE.xlsx",
  hojaOrigen: "PB.M-PB.T-PB.T-",
  filaOrigen: 6,
  datosOriginales: "{\"A\":\"1\",\"B\":\"01704242\",\"C\":\"APELLIDOS Y NOMBRES...\"}",
  tipoDocumentoOriginal: "DNI",
  numeroDocumentoOriginal: "01704242",
  numeroDocumentoNormalizado: "01704242",
  nombreCompletoOriginal: "GARCIA LOPEZ MARIA",
  sexoOriginal: "F",
  fechaNacimientoOriginal: "15/04/1995",
  programaOriginal: "PELUQUERÍA BÁSICA",
  programaCodigo: "PROG-001",
  turnoOriginal: "MAÑANA",
  modalidadOriginal: "PRESENCIAL",
  criterio: "REGISTRO_VALIDO",
  estado: "LISTO", // LISTO | PENDIENTE_REVISION
  incidencias: [],
  fechaImportacion: "2026-09-11T16:30:00.000Z"
}
```

---

## 3. Motor de Detección de Incidencias

Cada fila procesada es evaluada mediante reglas deterministas conservando los valores originales:

| Código de Incidencia | Severidad | Criterio de Activación | Acción en M04 |
| :--- | :---: | :--- | :--- |
| `DOCUMENTO_VACIO` | ALTA | Estudiante sin DNI registrado en la celda original. | Registro en staging con `estado = PENDIENTE_REVISION`. No se elimina. |
| `DOCUMENTO_FORMATO_ATIPICO` | MEDIA | DNI con longitud diferente a 8 dígitos o caracteres atípicos. | Preserva ceros iniciales como string y marca para revisión. |
| `DOCUMENTO_REPETIDO` | MEDIA | Mismo DNI aparece matriculado en 2 o más archivos/listas. | Marca multi-matrícula en staging sin eliminar duplicados reales. |
| `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | ALTA | Mismo DNI presenta variaciones ortográficas de nombre entre listas. | Genera incidencia explícita. No se fusiona por suposición. |
| `SEXO_INCONSISTENTE` | BAJA | Valor de sexo distinto a M/F o Masculino/Femenino. | Conserva valor original y solicita revisión. |
| `PROGRAMA_VARIANTE` | MEDIA | Nombre de programa en Excel no coincide exactamente con el catálogo M02. | Asigna mapeo sugerido y mantiene texto fuente. |

---

## 4. Matriz de Pruebas Automatizadas (Suite M04)

La suite `tests/m04_tests.js` evalúa 20 aserciones técnicas:

| Prueba ID | Descripción de la Prueba | Resultado |
| :--- | :--- | :---: |
| **T-M04-01** | Detección de exactamente 12 libros Excel dentro de BD.zip | **PASSED** |
| **T-M04-02** | Conservación de trazabilidad origen (archivo, hoja, fila) | **PASSED** |
| **T-M04-03** | Conservación de documentos como tipo texto (string) | **PASSED** |
| **T-M04-04** | Preservación de ceros iniciales en DNI | **PASSED** |
| **T-M04-05** | Inmutabilidad comprobada de fuentes originales (BD.zip) | **PASSED** |
| **T-M04-06** | `estudiantes` en base productiva permanece en 0 | **PASSED** |
| **T-M04-07** | `matriculas` en base productiva permanece en 0 | **PASSED** |
| **T-M04-08** | Prohibición de fusión automática de personas por nombre | **PASSED** |
| **T-M04-09** | Incidencia por discrepancia ortográfica en mismo DNI | **PASSED** |
| **T-M04-10** | Documentos vacíos conservados con incidencia sin borrar | **PASSED** |
| **T-M04-11** | Documentos atípicos conservados con incidencia sin borrar | **PASSED** |
| **T-M04-12** | Contraste de programas con el catálogo oficial M02 | **PASSED** |
| **T-M04-13** | Cero inferencias o asignaciones de Módulo I / Módulo II | **PASSED** |
| **T-M04-14** | Trazabilidad biunívoca entre staging y filas Excel | **PASSED** |
| **T-M04-15** | Previsualización en pantalla escritorio (`#/incidencias`) | **PASSED** |
| **T-M04-16** | Previsualización responsive en pantallas móviles | **PASSED** |
| **T-M04-17** | Cero conexiones externas o CDNs | **PASSED** |
| **T-M04-18** | Operatividad 100% Offline en navegador local | **PASSED** |
| **T-M04-19** | Integridad de Hashes SHA-256 de fuentes originales | **PASSED** |
| **T-M04-20** | Explicación matemática reproducible de 295/300 y 268/274 | **PASSED** |

---

## 5. Estado de la Base de Datos Productiva al Finalizar M04

```
CETPRO_DB (IndexedDB v1):
  - estudiantes: 0 registros
  - matriculas:  0 registros
  - unidades:    0 registros
  - staging_importaciones: 295 registros (Lote IMP-BD-2026-001)
```

**Conclusión:** M04 concluye de forma limpia y auditada en estado **M04 CONCILIADO — APTO PARA AUTORIZAR IMPORTACIÓN PRODUCTIVA**.
