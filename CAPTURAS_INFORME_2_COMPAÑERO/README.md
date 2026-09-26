# Evidencias Visuales de UX — Informe 2 de Prácticas (Compañero)

**Proyecto:** Sistema Académico CETPRO (`PAQUETE_ANTIGRAVITY_CETPRO_V2`)  
**Tarea Significativa:** Implementación y validación del módulo de Registro Académico de Asistencia en el entorno de demostración del sistema CETPRO.  
**Entorno de Pruebas:** `CETPRO_V2_DEMO` (Aislado en memoria e IndexedDB, puerto 8081).  
**Producción Oficial:** `CETPRO_DB` (puerto 8080) — **INTACTA (Sin modificaciones ni accesos).**  
**Resolución de Captura:** 1920 × 1080 (Full HD, formato PNG nítido, sin recortes).

---

## 1. Tabla de Trazabilidad de Evidencias

| Nº | Archivo | Ruta | Acción realizada | Resultado | Estado |
|:---:|:---|:---:|:---|:---|:---:|
| **01** | `01_companero_inicio_demo.png` | `#/demo` | Inicio del entorno DEMO | Entorno preparado, franja `MODO DEMOSTRACIÓN · DATOS SIMULADOS · NO OFICIAL` visible, base `CETPRO_V2_DEMO` y accesos directos operativos | **OK** |
| **02** | `02_companero_grupos.png` | `#/grupos` | Identificación y selección del grupo | Grupo académico `GRUPO DEMO A` (Mecánica Automotriz, Turno Mañana, 40 matrículas) identificado | **OK** |
| **03** | `03_companero_matriculas_grupo.png` | `#/matriculas` | Verificación de matrículas del grupo | Listado de estudiantes vinculados a `GRUPO DEMO A` con estado `ACTIVA` | **OK** |
| **04** | `04_companero_asistencia_estado_inicial.png` | `#/registro` | Ingreso a Asistencia DEMO (Estado Inicial) | Selectores de cascada cargados, conteos iniciales (24 Presentes, 8 Ausentes, 4 Justificadas, 4 Sin registro) y cabecera en `versión 1` | **OK** |
| **05** | `05_companero_asistencia_antes_cambio.png` | `#/registro` | Selección y detalle del estudiante antes del cambio | Fila del `ESTUDIANTE DEMO 001` (Doc: `DEMO0001`) con selector original `PRESENTE` y campo observación vacío | **OK** |
| **06** | `06_companero_asistencia_modificacion.png` | `#/registro` | Modificación de marca y registro de observación | Se cambia estado a `JUSTIFICADA` y se ingresa *"Permiso médico presentado (DEMO)"*. Recálculo dinámico reflejado (23 Pres. / 5 Just.) | **OK** |
| **07** | `07_companero_asistencia_guardada.png` | `#/registro` | Guardado de cambios | Clic en *"Guardar cambios DEMO"*. Notificación toast verde `✓ Sesión DEMO guardada. Versión 2; 8 ausentes.` y cabecera actualizada a `versión 2` | **OK** |
| **08** | `08_companero_asistencia_conteos.png` | `#/registro` | Comprobación de conteos post-guardado | Verificación de las 4 tarjetas métricas consolidadas: 23 Presentes, 8 Ausentes, 5 Justificadas, 4 Sin registro | **OK** |
| **09** | `09_companero_asistencia_persistencia.png` | `#/registro` | Comprobación de persistencia real | Navegación a otro módulo y retorno a `#/registro`. La sesión recarga de IndexedDB con `versión 2`, estado `JUSTIFICADA` y su observación intacta | **OK** |
| **10** | `10_companero_resultado_final.png` | `#/registro` | Resultado final del proceso | Pantalla completa de la sesión de asistencia validada, limpia y consolidada | **OK** |
| **11** | `11_companero_estudiantes.png` | `#/estudiantes` | Revisión del padrón institucional | Padrón de 40 estudiantes demostrativos con datos de filiación y búsqueda rápida | **OK** |
| **12** | `12_companero_programas_modulos.png` | `#/programas` | Revisión de estructura curricular | Catálogo de 7 programas de estudio y 14 módulos formativos oficiales | **OK** |
| **13** | `13_companero_respaldo.png` | `#/respaldo` | Preparación del respaldo de seguridad | Módulo de respaldo y restauración en entorno DEMO con políticas de aislamiento | **OK** |
| **14** | `14_companero_respaldo_exportado.png` | `#/respaldo` | Exportación y verificación de respaldo | Generación exitosa de archivo JSON con confirmación en toast: `schema 2, 18 stores, SHA-256 ...` | **OK** |
| **15** | `15_companero_documentos_contexto.png` | `#/documentos` | Contextualización del sistema documental | Panel documental organizado en 4 etapas académicas que complementan el registro | **OK** |

---

## 2. Resumen Técnico de Ejecución

- **Entorno utilizado:** `CETPRO_V2_DEMO`
- **Grupo utilizado:** `GRUPO DEMO A` (Código `GAC-DEMO-A` · Programa: Mecánica Automotriz)
- **Unidad utilizada:** `UD DEMO 01 (SIMULADA)` (`UNI-DEMO-MOD-001-01`)
- **Sesión utilizada:** `Sesión 1 · 2026-03-02` (`ATS-DEMO-001`)
- **Estudiante DEMO modificado:** `ESTUDIANTE DEMO 001` (Documento: `DEMO0001` · Matrícula: `MAT-DEMO-001`)
- **Estado anterior:** `PRESENTE`
- **Estado nuevo:** `JUSTIFICADA` (Observación: *"Permiso médico presentado (DEMO)"*)
- **Guardado:** **VERIFICADO** (Notificación de sistema generada: *"Sesión DEMO guardada. Versión 2; 8 ausentes."*)
- **Persistencia:** **VERIFICADA** (Lectura directa post-recarga desde IndexedDB confirmando `versión 2`, `JUSTIFICADA`, observación y recálculo de tarjetas métricas a 23P / 5J)
- **Producción modificada:** **NO** (`CETPRO_DB` en puerto 8080 permaneció 100% aislada e intacta)
