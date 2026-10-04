# EVIDENCIAS REALES DE DESARROLLO — SISTEMA ACADÉMICO CETPRO

> **Proyecto:** Sistema Académico CETPRO (v2)  
> **Estudiante:** Gonzalo (whangedax)  
> **Entorno de Ejecución:** Servidor Local v2 (`http://127.0.0.1:8081/`)  
> **Perfil Utilizado:** Secretaría Académica (`SECRETARIA`) — Lic. Carmen Rosa Mendívil  
> **Fecha de Captura:** 02 de Octubre de 2026  
> **Resolución de Captura:** 1920 × 1080 píxeles (Escala 100%, formato PNG sin alteraciones)

---

## 1. Tarea Significativa Documentada

> **“Mejoré la interfaz del sistema mediante tarjetas de acceso más claras y un selector de grupos académicos organizado por programa y turno. También trabajé en la etapa de asistencia y evaluación para facilitar su uso por secretaría.”**

El presente conjunto de evidencias visuales demuestra de manera fidedigna y verificable la ejecución de dicha tarea directamente sobre el software real en funcionamiento, cumpliendo con la normativa institucional del MINEDU y las necesidades operativas de la Secretaría Académica del CETPRO.

---

## 2. Matriz de Evidencias Capturadas y Correspondencia con el Informe

| Nº | Archivo | Qué demuestra en el sistema | Parte del informe relacionada |
|:---|:---|:---|:---|
| **01** | `EVIDENCIA_01_CENTRO_DOCUMENTAL.png` | Interfaz principal del Centro de Emisión Documental (`#/documentos`) con cabecera institucional, indicador de rol, flujo guiado de 3 pasos y las 4 tarjetas principales de etapa (`Etapa 1: Matrícula`, `Etapa 2: Registro Auxiliar`, `Etapa 3: Cierre y Prácticas`, `Etapa 4: Certificación y Egreso`) con bordes acentuados, títulos, subtítulos y badges de capacidad. | **Paso 1:** Organización general de las etapas del proceso académico mediante tarjetas interactivas de alto contraste. |
| **02** | `EVIDENCIA_02_ETAPA2_SELECCIONADA.png` | Activación visual y funcional de la **Etapa 2 — Registro Auxiliar Docente** con borde azul prominente, sombra reactiva y despliegue del catálogo de documentos: *Control de Asistencia Modular* (`TMPL-05..10`) y *Registro de Evaluación Auxiliar* (`TMPL-11..17`) con selector interactivo de Unidades Didácticas (UD 1 a UD 7). | **Paso 1 / Paso 4:** Selección e interactividad de la Etapa 2 de seguimiento académico. |
| **03** | `EVIDENCIA_03_SELECTOR_GRUPOS.png` | Menú desplegable del **Selector de Grupos Académicos**, agrupado lógicamente por Programa de Estudio (`<optgroup>`), identificando el código oficial de aula, el turno formativo y el conteo exacto de estudiantes matriculados en tiempo real. | **Paso 2:** Organización y selección de grupos académicos por carrera y turno. |
| **04** | `EVIDENCIA_04_RESUMEN_GRUPO.png` | Tarjeta de contexto del grupo seleccionado (`GRP-BD-007`), mostrando programa formativo (*Computación e Informática*), módulo curricular, turno regular, 26 estudiantes matriculados y cálculo de foliación ministerial estimada por hoja. | **Paso 3:** Verificación y actualización automática del contexto académico antes de operar. |
| **05** | `EVIDENCIA_05_ASISTENCIA.png` | Módulo operativo de **Control de Asistencia Modular** en Etapa 2 con UD 1 seleccionada (estilo activo azul), distintivo de asistencia registrada (40 sesiones) y botones de acción rápida (*Generar Asistencia*, *Llenar Asistencia*, *Precargar Demo*). | **Paso 4:** Flujo de trabajo en el módulo de asistencia modular por Unidad Didáctica. |
| **06** | `EVIDENCIA_06_EVALUACION.png` | Módulo operativo de **Registro de Evaluación Auxiliar** en Etapa 2 con UD 1 seleccionada (estilo activo verde esmeralda), estado con notas vigesimales guardadas para los 5 Indicadores de Logro (IL1..IL5) y botones de llenado y emisión. | **Paso 5:** Flujo de trabajo en el registro auxiliar de calificaciones por capacidades. |
| **07** | `EVIDENCIA_07_VALIDACION_FLUJO.png` | Mecanismo de **validación y control de flujo**: ante la ausencia de grupo seleccionado, el sistema bloquea los botones de generación, alerta al usuario con aviso visual preventivo y exige el cumplimiento estricto del orden `Grupo → Unidad Didáctica → Acción`. | **Paso 6:** Validación del flujo de trabajo y prevención de errores operativos en secretaría. |
| **08** *(Opcional)* | `EVIDENCIA_08_LLENADO_ASISTENCIA.png` | Ventana modal interactiva a pantalla completa para el **llenado de asistencia diaria**: matriz de 40 sesiones con controles P/F/J (Presente, Falta, Justificada), colores diferenciados, estadísticas y persistencia local. | **Paso 7:** Registro interactivo de asistencia de estudiantes. |
| **09** *(Opcional)* | `EVIDENCIA_09_LLENADO_EVALUACION.png` | Ventana modal interactiva para el **llenado de calificaciones vigesimales (00 a 20)**: cuadrícula con los 5 Indicadores de Logro (IL1 a IL5), formato condicional automático (aprobado en verde, desaprobado en rojo) y cálculo inmediato del promedio de logro. | **Paso 7:** Registro interactivo de notas y evaluación continua. |
| **10** *(Opcional)* | `EVIDENCIA_10_DOCUMENTO_GENERADO.png` | Visor PDF oficial integrado mostrando el **Registro Auxiliar de Evaluación (TMPL-11)** generado en formato físico A3 apaisado, con membretes del MINEDU, logo oficial del CETPRO, capacidad terminal, indicadores y notas estampadas. | **Paso 8:** Resultado documental ministerial listo para impresión y archivo. |

---

## 3. Detalle de Figuras y Pies de Imagen Sugeridos para el Informe

### Figura 1
- **Archivo:** `EVIDENCIA_01_CENTRO_DOCUMENTAL.png`
- **Pie de imagen:** *Figura 1. Centro de emisión documental organizado mediante tarjetas correspondientes a las diferentes etapas del proceso académico.*
- **Descripción:** Demuestra la mejora visual y la jerarquía de las cuatro etapas del ciclo educativo (Matrícula, Aula y Asistencia, Cierre Modular y Certificación), permitiendo al personal de secretaría acceder ordenadamente a cualquier documento ministerial.

### Figura 2
- **Archivo:** `EVIDENCIA_02_ETAPA2_SELECCIONADA.png`
- **Pie de imagen:** *Figura 2. Selección interactiva de la Etapa 2 correspondiente al seguimiento de asistencia y evaluación.*
- **Descripción:** Muestra la retroalimentación visual al seleccionar la Etapa 2, cambiando el estado de la tarjeta y desplegando los formatos específicos de asistencia (`TMPL-05..10`) y evaluación (`TMPL-11..17`).

### Figura 3
- **Archivo:** `EVIDENCIA_03_SELECTOR_GRUPOS.png`
- **Pie de imagen:** *Figura 3. Selector de grupos académicos organizado por programa de estudios, turno y cantidad de estudiantes matriculados.*
- **Descripción:** Evidencia la agrupación sistemática mediante `<optgroup>` de todas las especialidades formativas del CETPRO (Computación, Peluquería, Confección, etc.), detallando en cada opción el código del aula, turno y número de matriculados.

### Figura 4
- **Archivo:** `EVIDENCIA_04_RESUMEN_GRUPO.png`
- **Pie de imagen:** *Figura 4. Resumen del grupo académico seleccionado con información del programa, módulo, turno y estudiantes matriculados.*
- **Descripción:** Comprueba que al elegir un grupo, la interfaz sintetiza en una tarjeta de resumen todos los parámetros relevantes del grupo activo, incluyendo la estimación de páginas oficiales según el aforo reglamentario por hoja.

### Figura 5
- **Archivo:** `EVIDENCIA_05_ASISTENCIA.png`
- **Pie de imagen:** *Figura 5. Control de Asistencia Modular de la Etapa 2 con selección del grupo y Unidad Didáctica correspondiente.*
- **Descripción:** Ilustra la interfaz de trabajo para asistencia, con selector de unidades formativas (UD 1 a UD 6), estado de marcas guardadas y accesos directos tanto para registro manual como para generación de la sábana ministerial A3.

### Figura 6
- **Archivo:** `EVIDENCIA_06_EVALUACION.png`
- **Pie de imagen:** *Figura 6. Registro de Evaluación Auxiliar organizado por grupo académico y Unidad Didáctica.*
- **Descripción:** Expone el entorno de evaluación continua, permitiendo conmutar entre las 7 Unidades Didácticas oficiales de la especialidad, con visualización de estado de calificaciones vigesimales e indicadores de logro.

### Figura 7
- **Archivo:** `EVIDENCIA_07_VALIDACION_FLUJO.png`
- **Pie de imagen:** *Figura 7. Validación del flujo de trabajo que requiere seleccionar previamente el grupo académico antes de ejecutar operaciones documentales.*
- **Descripción:** Constata el mecanismo de control de calidad y prevención de inconsistencias, el cual deshabilita las acciones de emisión e instruye al usuario a definir el grupo y unidad antes de proceder.

### Figuras Complementarias (Opcionales de Gran Valor)
- **Figura 8 (`EVIDENCIA_08_LLENADO_ASISTENCIA.png`):** *Figura 8. Interfaz interactiva para el registro de asistencia de estudiantes correspondiente al grupo y Unidad Didáctica seleccionados.*
- **Figura 9 (`EVIDENCIA_09_LLENADO_EVALUACION.png`):** *Figura 9. Registro interactivo de calificaciones de los estudiantes según el grupo y Unidad Didáctica seleccionados.*
- **Figura 10 (`EVIDENCIA_10_DOCUMENTO_GENERADO.png`):** *Figura 10. Resultado del flujo de seguimiento académico mediante la generación del formato institucional correspondiente.*

---

## 4. Verificación de Seguridad y Autenticidad
- Las capturas corresponden a ejecuciones reales sobre el motor de renderizado del navegador en Chromium/Edge sin emuladores externos ni maquetas estáticas.
- Los datos de alumnos presentados corresponden al dataset de validación y demostración institucional precargado en el esquema v2 (`CETPRO_V2_CANDIDATE`).
- No se expuso información sensible no autorizada.
- El código productivo del aplicativo y la base de datos se mantuvieron íntegros.
