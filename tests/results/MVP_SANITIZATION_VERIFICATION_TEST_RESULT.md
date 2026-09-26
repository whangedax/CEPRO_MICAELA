# Reporte de Verificación de Saneamiento y Regresión de Seguridad

Fecha: 2026-09-17

- **Estado de Base de Datos Candidata (`CETPRO_V2_CANDIDATE`):**
  * `periodos.count() === 0`: **CONFIRMADO** (0 periodos).
  * `grupos_academicos.periodoId`: **CONFIRMADO** (0 grupos con periodos huérfanos).
  * Invariantes de datos: **269 estudiantes**, **295 matrículas**, **12 grupos académicos** (100% canónicos e intactos).
- **Nómina Administrativa (TMPL-01) en Estado Limpio:**
  * Grupo de 70 estudiantes renderizado en **3 páginas físicas exactas (30 + 30 + 10)**.
  * Fechas y periodo ausentes se muestran como celdas limpias vacías (0 'null', 0 'undefined', 0 'PENDIENTE').
  * Módulo "Ofimática", R.D., Turno NOCHE, Ciclo TÉCNICO, Sección ÚNICA estampados en las 3 páginas.
  * Leyendas de pie de página: `Página X de 3 · Registros A–B` y `TOTAL GENERAL DEL GRUPO: 70` con precisión matemática.
- **Invariantes de Seguridad:**
  * 21/21 hashes SHA-256 de PDFs canónicos 100% intactos.
  * `CETPRO_DB` y puerto 8080 totalmente aislados y sin modificaciones.
