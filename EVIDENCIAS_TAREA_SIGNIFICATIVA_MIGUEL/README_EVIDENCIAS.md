# Evidencias Completas del Proceso (Alumno 2)

Este directorio alberga todas las capturas (en formato PNG a 1920x1080) requeridas para la sustentación del Informe de Prácticas, priorizando estrictamente la realidad del repositorio local.

### Documentos Anexos
- **`MATRIZ_EVIDENCIAS.md`**: Contiene la auditoría de cada afirmación del informe frente a la arquitectura real del sistema. Resultó vital para identificar desajustes entre la narración original (ej. uso de Jinja, .docx) y la verdadera implementación (JSON de coordenadas absolutas y PDF).
- **`UBICACION_EN_INFORME.md`**: Detalla en qué sección específica de la narrativa académica se debe insertar la selección de las 11 mejores evidencias visuales.

### Advertencia de Inconsistencias
Como se detalla en la Matriz, **NO DEBEN UTILIZARSE** las siguientes afirmaciones textuales en tu informe sin realizar la debida corrección técnica (sustituyéndolas por la realidad arquitectónica del proyecto):

1. **Extensiones Docx/XML**: Cambiar por "Archivos base en formato PDF y manifiestos JSON".
2. **Uso de placeholders `{{...}}` y etiquetas `{% for %}` (Jinja)**: Cambiar por "Definición posicional (X, Y) en JSON y renderizado programático a través de JavaScript con pdf-lib".
3. **Commit inventado `fix(templates)...`**: Cambiar por el hash real existente: `5296117 — Update TMPL-18.json`.
4. **Suite T-AH01 y Commit `b37e459`**: Omitirlos totalmente del informe o reemplazarlos por una suite de regresión que sí existe (por ejemplo `mvp_acta_modular_19.regression.js`).

Al basarse únicamente en evidencias verificables, tu informe mantendrá una pureza e integridad técnica al 100%.
