# Arquitectura objetivo

```text
Usuario
  ↓
UI (HTML/CSS/JS)
  ↓
Servicios / Casos de uso
  ↓
Dominio y validaciones
  ↓
Repositorios
  ↓
IndexedDB

Servicios paralelos:
- Importación / staging
- Auditoría
- Backups
- Motor documental
- Vista previa e impresión
```

## Pantallas principales
Inicio → Estudiantes → Matrículas → Registro Académico → Documentos

Pantallas de apoyo: Incidencias, Respaldo y Configuración.

## Dependencia
La UI nunca accede directamente a IndexedDB. Los documentos consultan datos mediante servicios, pero nunca escriben datos académicos de vuelta por su propia cuenta.
