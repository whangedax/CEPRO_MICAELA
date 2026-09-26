# ENTORNO DE PRUEBAS AISLADO DE ASISTENCIA (M06_TEST_ENVIRONMENT)

**Base de Datos Aislada:** `CETPRO_M06_TEST_DB`  
**Base Productiva Protegida:** `CETPRO_DB`  

---

## 1. PRINCIPIO DE AISLAMIENTO Y SEPARACIÓN DE AMBIENTES

Para cumplir con la prohibición estricta de insertar datos ficticios o inventar estructuras oficiales en la base de datos de producción `CETPRO_DB`, todas las pruebas técnicas, unitarias, de integración e interactivas en interfaz web se realizan sobre una base de datos IndexedDB aislada denominada **`CETPRO_M06_TEST_DB`**.

```
┌───────────────────────────────────────────────────────────┐
│                        INTERFAZ UI                        │
│                   app/js/ui/attendance-view.js           │
└──────────────────────────────┬────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ Modo Producción ]                  [ Modo Entorno Aislado ]
   Target: CETPRO_DB                    Target: CETPRO_M06_TEST_DB
   PERIODOS = 0                         Fixtures: TEST_ONLY
   UNIDADES = 0                         Prerrequisitos: ready = true
   ASISTENCIA = 0                       Pruebas Funcionales Completas
   ESTADO: BLOQUEADO                    ESTADO: HABILITADO / DEMO
```

---

## 2. ESTRUCTURA DE FIXTURES DE PRUEBA (TEST_ONLY)

Los fixtures utilizados en `CETPRO_M06_TEST_DB` están explícitamente etiquetados para prevenir cualquier confusión con datos institucionales reales:

- **Periodo Ficticio de Prueba:** `PER-TEST-2026-1` (Denominación: `2026-I (TEST_ONLY)`)
- **Unidades Didácticas de Prueba:** `UNID-TEST-001` (`UD1 - Fundamentos Técnicos (TEST_ONLY)`), `UNID-TEST-002`, `UNID-TEST-003`.
- **Matrículas / Estudiantes de Prueba:** Mapeadas en memoria desde la lista de matrículas de `GRP-BD-001` sin escribir registros de asistencia sintéticos en `CETPRO_DB`.

---

## 3. GUÍA DE DEMOSTRACIÓN VISUAL Y PRUEBAS EN NAVEGADOR

1. Abrir la aplicación web local en `http://localhost:3000/#/registro`.
2. **Modo Producción Bloqueada:**
   - La pantalla presenta un aviso amigable y destacado indicando `ASISTENCIA — CONFIGURACIÓN ACADÉMICA PENDIENTE`.
   - Se muestran los tres prerrequisitos faltantes (Periodo, Módulo y Unidades).
   - Se constata que la base productiva mantiene `ASISTENCIA = 0`.
3. **Activar Modo Entorno Aislado:**
   - Hacer clic en el botón `🧪 Probar en Entorno Aislado (TEST_DB)`.
   - Aparecerá la cabecera amarilla de advertencia `ENTORNO DE PRUEBAS AISLADO ACTIVO (CETPRO_M06_TEST_DB)`.
   - Seleccionar el Grupo Técnico `GRP-BD-001` y la Unidad Didáctica `UD1 - Fundamentos Técnicos (TEST_ONLY)`.
   - Hacer clic en `Cargar Estudiantes` -> Seleccionar estados de asistencia (`Presente`, `Falta`, `Tardanza`, `Justificado`) -> Hacer clic en `Guardar Asistencia`.
   - Reabrir, modificar un estado y verificar el registro correspondiente en el panel de **Bitácora de Auditoría (TEST_ONLY)**.
