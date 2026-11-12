# Simulación Técnica de Clonación Anual a 2027 y Puntos de Ruptura

**Fecha:** 2026-11-12  
**Componente Analizado:** `scripts/academic-config.cjs` (`cloneYear`) y su interacción con `cepro-bd-catalog.cjs` y las 21 plantillas MINEDU.

---

## 1. Análisis del Comportamiento Actual de `cloneYear`

En `scripts/academic-config.cjs`, la función `cloneYear(core, actor, sourceYear, targetYear)` realiza los siguientes pasos:
1. Verifica que `sourceYear` exista y que `targetYear` no exista previamente.
2. Clona el registro `academic_years` de `sourceYear` hacia `targetYear`.
3. Clona los periodos: reemplaza el prefijo `2026-` por `2027-` (ej. `2027-I`, `2027-II`).
4. Clona los módulos formativos asociados a los programas.
5. Clona los `documentSettings` globales de la institución.

### El Defecto Crítico de Generación de Identificadores (P0 Multi-Año)
Observemos cómo genera los IDs de los módulos clonados en el código actual:
```javascript
const newModuleId = `MOD-${targetYear}-${crypto.randomUUID().slice(0, 8)}`;
```
Esto produce identificadores como:
`MOD-2027-a1b2c3d4`

### ¿Por qué esto rompe el sistema en 2027?
1. **Catálogo Canónico Oficial:**
   - En `scripts/cepro-bd-catalog.cjs` y `scripts/reference-defaults.cjs`, los módulos formativos oficiales están indexados de forma fija con códigos canónicos de MINEDU:
     `MOD-001`, `MOD-002`, `MOD-003`, ..., `MOD-014`.
   - Por ejemplo:
     - `MOD-001`: Módulo I de Computación (Ofimática e Internet).
     - `MOD-009`: Módulo I de Peluquería y Barbería (Corte de Cabello y Peinados).
2. **Motor de Generación de 21 Plantillas Oficiales MINEDU:**
   - Las 21 plantillas oficiales (TMPL-01 a TMPL-21) vinculan las mallas curriculares, números de créditos, horas lectivas y formatos de actas evaluativas utilizando el código canónico del módulo o mapeos estructurados.
   - Si el módulo de 2027 se llama `MOD-2027-a1b2c3d4`, el generador documental no encuentra la correspondencia en el catálogo canónico:
     - Falla la resolución de horas y créditos mínimos normados.
     - `Preflight Complete` pasa a `false`.
     - Se generan campos faltantes (`missingFields`) en las actas.
     - Puede requerir forzar marcas de borrador (`isDraft = true`), violando la directiva institucional.

---

## 2. Estrategia Canónica de Clonación para 2027+ (Fase 5)

Para que el sistema funcione a perpetuidad (2027, 2028, 2029...) sin fallas documentales ni colisiones de datos, la clonación debe implementar:

### 2.1 Preservación del Código Canónico y Vinculación Causal
Cada módulo clonado para un nuevo año debe conservar su metadata canónica:
```javascript
const clonedModule = {
  id: `MOD-${targetYear}-${canonicalCode}`, // Ej: MOD-2027-MOD-001
  canonicalCode: sourceModule.canonicalCode || sourceModule.id, // MOD-001
  programId: sourceModule.programId,
  name: sourceModule.name,
  periodId: newPeriodId, // 2027-I
  units: sourceModule.units.map(u => ({ ...u })), // Malla curricular preservada
  year: targetYear
};
```

### 2.2 Reutilización Limpia sin Arrastre de Historial
- **Lo que SÍ se clona:**
  - Estructura curricular (programas, módulos, unidades didácticas, horas, créditos).
  - Valores de referencia de institución, fechas base calculadas sumando 1 año al calendario.
  - Asignaciones de cargos y especialidades de los docentes (sin arrastrar notas ni asistencias).
- **Lo que NUNCA se clona:**
  - Matrículas de estudiantes (`enrollments`). Cada año comienza con padrón limpio.
  - Calificaciones y notas vigesimales (`grades`).
  - Asistencias diarias y mensuales (`attendance`).
  - Entregas documentales archivadas (`documentSubmissions`).
  - Actas consolidadas firmadas del año anterior.

### 2.3 Congelación en Solo Lectura de Años Históricos
Cuando el Director active el año 2027 como periodo lectivo corriente:
- El año 2026 y sus registros pasan a modo `isClosed: true` / `readOnly: true`.
- Queda estrictamente prohibido alterar notas de 2026 sin un procedimiento explícito de "Apertura Excepcional de Rectificación de Actas" autorizado por Dirección con firma en `audit`.
- Se previene que un error accidental en 2027 altere el historial académico oficial ya reportado a la UGEL San Román.
