# Mapeo de Fuentes de Verdad de Unidades Didácticas (UDs), Criterios IL1–IL5 y EFSRT

**Fecha:** 2026-11-12  
**Componentes Analizados:** Catálogo curricular, base de datos SQLite, plantillas oficiales MINEDU y componentes frontend.

---

## 1. Mapeo de Fuentes de Verdad Actuales de Unidades Didácticas

Hoy en el sistema coexisten 5 puntos donde se definen o consumen las Unidades Didácticas:

1. **Catálogo Curricular Estático:**
   - `scripts/reference-defaults.cjs` y `scripts/cepro-bd-catalog.cjs`.
   - Contiene la definición oficial de los 14 módulos formativos de las 7 carreras técnicas del CETPRO Micaela Bastidas.
2. **Base de Datos SQLite (`records('modules')` y `records('groups')`):**
   - Tabla `modules`: campo `units` almacenado como JSON con objetos `{ code, name, hours, credits, fechaInicio, fechaFin }`.
   - Tabla `groups`: campo `units` con el arreglo de códigos activos en esa sección (ej. `['UD1', 'UD2', 'UD3', 'UD4', 'EFSRT']`).
3. **Persistencia de Parámetros Pedagógicos (`records('documentSettings')`):**
   - Scope `unitCurriculum:<moduleId>:<unitCode>`: Horas, créditos y fechas de esa unidad.
   - Scope `unit:<groupId>:<unitCode>`: Indicadores de logro IL1, IL2, IL3, IL4, IL5 redactados por el docente.
   - Scope `practice:<groupId>:EFSRT`: Horas de práctica, empresa/centro de práctica, docente supervisor y criterios de evaluación 1 al 9.
4. **Plantillas Oficiales MINEDU (TMPL-01 a TMPL-21):**
   - `sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/`.
   - Formatos como TMPL-05 (Nómina), TMPL-06/07 (Actas de Evaluación), TMPL-17 (Módulo II Peluquería 7 UDs), TMPL-18 (EFSRT).
5. **Selector Visual Frontend:**
   - `src/components/academic/AcademicWorkflowModal.tsx` y `Topbar.tsx`: Lista de unidades mostradas en la interfaz para selección rápida.

---

## 2. Problemática: Variación en la Cantidad de UDs por Carrera

En la educación técnico-productiva reglamentada por MINEDU (RVM N° 188-2020-MINEDU / RVM N° 277-2019-MINEDU):
- Algunas carreras tienen **4 unidades didácticas por módulo** (ej. Computación: Ofimática, Redes, etc.).
- Otras carreras tienen **5 o 6 unidades didácticas**.
- La carrera de **Peluquería y Barbería (Módulo II: Tratamiento Capilar y Peinados)** tiene **7 unidades didácticas específicas** más las prácticas formativas (EFSRT).

### Reglas Imperativas de Flexibilidad Curricular (Fase 6):
1. **Permitir agregar y retirar unidades didácticas:**
   - La institución debe poder agregar una UD adicional o ajustar la cantidad de UDs de un módulo formativo según su Plan de Estudios aprobado por la UGEL.
2. **Garantía Inviolable de Preservación de Notas (Archivo Lógico):**
   - **NUNCA BORRAR FÍSICAMENTE UNA UD QUE YA TENGA NOTAS REGISTRADAS.**
   - Si una UD ya tiene notas asignadas a estudiantes en la tabla `grades`, retirar la unidad implica marcarla como:
     ```javascript
     unit.archived = true;
     unit.active = false;
     ```
   - Las calificaciones históricas del estudiante permanecen intactas en la base de datos y en los archivos de respaldo para auditoría de UGEL.
3. **Ajuste Proporcional de Horas y Créditos:**
   - La suma de horas de las UDs + horas de EFSRT debe converger exactamente con el total normado del módulo (ej. 1,056 horas para Módulos de 44 créditos).
   - El sistema debe validar que al agregar o modificar una UD, el total de horas y créditos sea consistente.

---

## 3. Especificación de Indicadores de Logro (IL1 a IL5)

En cada Unidad Didáctica, el docente califica el rendimiento pedagógico en base a indicadores de logro formativos:
- Cada UD posee hasta 5 indicadores de logro: `IL1`, `IL2`, `IL3`, `IL4`, `IL5`.
- Cada indicador cuenta con:
  - `code`: Identificador (ej. `IL1`).
  - `name` / `description`: Descripción de la competencia o habilidad evaluada.
  - `weight`: Ponderación (por defecto uniforme, escala 1–20).
- **Persistencia:** Se almacena en `documentSettings` con clave:
  `unit:<groupId>:<unitCode>`
  Campos:
  ```json
  {
    "indicator1": "Aplica técnicas de higiene y preparación capilar según normas de bioseguridad",
    "indicator2": "Identifica la estructura del cabello y diagnóstico tricológico",
    "indicator3": "Ejecuta procedimientos de ondulación y alisado permanente",
    "indicator4": "Evalúa los resultados obtenidos y aplica tratamiento post-químico",
    "indicator5": "Demuestra responsabilidad y puntualidad en el taller"
  }
  ```
- **Sincronización:** Cuando el docente edita estos indicadores, se sincronizan hacia el Director en el módulo de notas (`module: 'grades'`), permitiendo que el informe de evaluación oficial los imprima con absoluta fidelidad.

---

## 4. Especificación de Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT)

Las EFSRT son el componente práctico obligatorio de inserción laboral o práctica comunitaria del estudiante:
- **Criterios de Evaluación 1 al 9:**
  - Nueve competencias actitudinales y operativas evaluadas por la empresa o CETPRO (Puntualidad, Trabajo en equipo, Calidad técnica, etc.).
- **Parámetros configurables en `documentSettings` (scope `practice:<groupId>:EFSRT`):**
  - Horas de práctica (ej. 192 horas, 6 créditos).
  - Fecha de inicio y fin de las prácticas.
  - Centro de práctica / Empresa receptora.
  - RUC y Representante Legal de la empresa.
  - Docente supervisor institucional.
  - Calificación final vigesimal de las prácticas (escala 0 a 20, nota mínima aprobatoria 13).
