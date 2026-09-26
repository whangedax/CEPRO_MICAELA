# Catálogo Curricular Oficial de Programas y Módulos (M02)

**Fuente Autoritativa**: `sources/raw/CARRERAS.jpeg` (SHA-256: `1f43e0e267475e14a476b5aafc5fad5972c53897d468e61a218b0324b72c42b6`)  
**Institución**: CETPRO Público "MICAELA BASTIDAS PUYUCAWA" - SAN MIGUEL / UGEL San Román  
**Estado Global**: CONFIRMADO E INICIALIZADO DE FORMA IDEMPOTENTE  

---

## Estructura del Catálogo Oficial (7 Programas / 14 Módulos)

| FUENTE | PROGRAMA | ID PROG | MÓDULO | ID MOD | ESTADO |
|---|---|---|---|---|---|
| `sources/raw/CARRERAS.jpeg` | **MECÁNICA AUTOMOTRIZ** | `PROG-001` | Módulo I: Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos y Transmisión | `MOD-001` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **MECÁNICA AUTOMOTRIZ** | `PROG-001` | Módulo II: Diagnóstico y Mantenimiento del Motor de Combustión Interna de los Vehículos Automotrices | `MOD-002` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **MECÁNICA DE MOTOS Y VEHÍCULOS AFINES** | `PROG-002` | Módulo I: Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos, Transmisión, Sistema Eléctrico y Sistema Electrónico de Motos y Vehículos Afines | `MOD-003` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **MECÁNICA DE MOTOS Y VEHÍCULOS AFINES** | `PROG-002` | Módulo II: Mantenimiento y Reparación de Motos de Combustión y Conversión del Sistema GNV-GLP | `MOD-004` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **CARPINTERÍA METÁLICA** | `PROG-003` | Módulo I: Construcciones Metálicas de Consumo con Soldadura por Arco Eléctrico en Acero | `MOD-005` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **CARPINTERÍA METÁLICA** | `PROG-003` | Módulo II: Construcciones Metálicas de Consumo en Aluminio con Soldadura Especial TIG-MIG-MAG-LASER | `MOD-006` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **PELUQUERÍA Y BARBERÍA** | `PROG-004` | Módulo I: Corte de Cabellos, Peinados y Diseño de Barbas | `MOD-007` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **PELUQUERÍA Y BARBERÍA** | `PROG-004` | Módulo II: Ondulación, Decoloración, y Tinturación | `MOD-008` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **COMPUTACIÓN E INFORMÁTICA** | `PROG-005` | Módulo I: Ofimática | `MOD-009` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **COMPUTACIÓN E INFORMÁTICA** | `PROG-005` | Módulo II: Diseño Gráfico y Plataformas Digitales | `MOD-010` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **CORTE Y ENSAMBLAJE** | `PROG-006` | Módulo I: Técnicas de Trazado, Tendido y Corte de Prendas de Vestir | `MOD-011` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **CORTE Y ENSAMBLAJE** | `PROG-006` | Módulo II: Técnicas de Confección de Prendas de Vestir | `MOD-012` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **MANTENIMIENTO DE SISTEMAS ELÉCTRICOS** | `PROG-007` | Módulo I: Instalación de Sistemas Eléctricos en Edificaciones | `MOD-013` | `ACTIVO` |
| `sources/raw/CARRERAS.jpeg` | **MANTENIMIENTO DE SISTEMAS ELÉCTRICOS** | `PROG-007` | Módulo II: Mantenimiento de Equipos Electrónicos y Sistemas de Seguridad en Domótica | `MOD-014` | `ACTIVO` |

---

## Reglas Inviolables de Dominio M02

1. **Inviolabilidad Curricular (B-002)**: El store `unidades` permanece estrictamente vacío (0 registros). No se infieren unidades didácticas, horas, créditos, capacidades ni indicadores sin resolución aprobada.
2. **Prohibición de Asignación Automática**: La presencia del Módulo I o Módulo II no asigna automáticamente a ningún estudiante ni matrícula.
3. **Idempotencia de Carga**: La inicialización del catálogo (`initializeCatalogs()`) puede ser ejecutada ilimitadamente conservando siempre 7 programas y 14 módulos.
