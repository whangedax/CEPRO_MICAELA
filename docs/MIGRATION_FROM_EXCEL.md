# Qué se conserva y qué se reemplaza del paquete Excel/VBA

## Se conserva conceptualmente
- 16 entidades lógicas.
- Separación estudiante/matrícula.
- Flujo de secretaria.
- Módulos M00–M15 como puertas de construcción.
- Auditoría, respaldo, validación preimpresión y trazabilidad.
- Las 21 plantillas como salidas institucionales.
- Regla de no inventar datos ni reglas académicas.

## Se reemplaza
| Antes | Ahora |
|---|---|
| Libro `.xlsm` | Aplicación web local |
| Hojas visibles | Pantallas |
| Tablas estructuradas Excel | Object stores/índices IndexedDB |
| VBA | Servicios y controladores JavaScript |
| Fórmulas Excel | Funciones de dominio JavaScript documentadas |
| Copias de plantillas Excel | Plantillas HTML/CSS/SVG/PDF derivadas de originales, una vez recibidos |
| Macros públicas | Casos de uso/servicios con contratos equivalentes |

El paquete histórico se conserva en `sources/legacy/` únicamente como referencia y trazabilidad. Sus instrucciones de "construir .xlsm" no gobiernan el nuevo repositorio.
