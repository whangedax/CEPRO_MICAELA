# Auditoría de la Sincronización Actual y Justificación Modular (USB + WhatsApp)

**Fecha:** 2026-11-12  
**Archivos Auditados:** `scripts/institutional-network.cjs`, `scripts/offline-core.cjs`, `src/pages/Sincronizacion.tsx`.

---

## 1. Arquitectura Actual de Sincronización USB

El sistema implementa una topología en **estrella asimétrica**:
- **Equipo Maestro (Dirección):** Posee la clave privada de la institución (`authorityPrivate`), firma los kits de enlace y certificados, centraliza la base de datos oficial, consolida los registros de todos los docentes y secretaría, y resuelve conflictos.
- **Estación Administrativa (Secretaría):** Administra el padrón de estudiantes, matrículas oficiales, fichas de registro y certificados.
- **Nodos Satélites (Docentes):** Operan sin acceso directo a otras aulas; registran calificaciones vigesimales, asistencias e indicadores de logro pedagógicos (IL1 a IL5) de sus unidades asignadas.

### Estructura Canónica del Pendrive USB (`CEPRO_INTERCAMBIO/`)
```text
CEPRO_INTERCAMBIO/
  ├── para-direccion/           (paquetes .cetpro enviados por Docentes o Secretaría)
  ├── para-secretaria/          (paquetes .cetpro enviados por Dirección para Secretaría)
  ├── para-docentes/
  │   ├── alejandrina.ayna/     (paquetes .cetpro enviados por Dirección al Docente)
  │   ├── lucia.flores/
  │   └── ...
  └── procesados/               (paquetes ya importados con éxito, archivados con timestamp)
```

---

## 2. Hallazgos y Falencias Detectadas en la Implementación Actual

1. **Omisión de la Carpeta de Secretaría en `prepareBatchExport`:**
   - En `scripts/institutional-network.cjs` (L619–628):
     ```javascript
     const allUsers = core.users().filter((u) => u.active && u.role === 'DOCENTE');
     ```
     El código filtra estrictamente `role === 'DOCENTE'`.
   - **Consecuencia:** Cuando el Director prepara la exportación masiva para el USB, la carpeta `para-secretaria/` se crea vacía. La secretaria no recibe las configuraciones actualizadas ni las aprobaciones mediante el lote masivo.

2. **Empaquetado Monolítico (Falta de Modularización):**
   - En `offline-core.cjs` (`packageFor` y `exchangePackage`), el sistema recopila todas las operaciones no confirmadas del usuario sin distinción de dominio.
   - **Consecuencia:**
     - Si un docente ingresó 50 asistencias y corrigió 1 nota, el paquete exporta todo junto.
     - Si ocurre un conflicto de concurrencia en una nota, la importación del paquete completo puede postergarse o requerir resolución manual, bloqueando la incorporación de las asistencias que no tenían ningún conflicto.

3. **Inexistencia de un Canal Liviano para WhatsApp:**
   - En la práctica docente rural o semi-urbana (Juliaca / Puno), los docentes a menudo no disponen de una memoria USB en el momento, pero sí cuentan con sus teléfonos móviles con WhatsApp.
   - Actualmente el sistema requiere exclusivamente la presencia de archivos `.cetpro` en un sistema de archivos, sin un mecanismo alternativo para copiar y pegar un código textual corto autenticado.

---

## 3. Especificación Técnica de las Soluciones (Fases 3 y 4)

### 3.1 Sincronización Modular por Partes
Se define el selector de módulo de sincronización:
- `module = 'config'`: Exclusivo para periodos, programas, módulos curriculares y directivas institucionales.
- `module = 'enrollments'`: Padrón de estudiantes, estados de matrícula y admisiones.
- `module = 'grades'`: Calificaciones vigesimales, notas de logro e indicadores IL1–IL5.
- `module = 'attendance'`: Registros de control de asistencia de alumnos.
- `module = 'all'`: Modo completo retrocompatible.

### 3.2 Canal Dual USB + WhatsApp
1. **Archivo `.cetpro` vía WhatsApp:**
   - El docente puede hacer clic en "Exportar para WhatsApp", lo que guarda el archivo `.cetpro` en la carpeta de Descargas o Escritorio con un nombre claro:
     `SINCRONIZACION_NOTAS_DOCENTE_ALEJANDRINA_2026.cetpro`.
   - El docente lo envía como documento adjunto por WhatsApp al Director.
   - En la PC del Director, se arrastra ese archivo en la pantalla de Sincronización para importarlo con 1 clic.
2. **Código de Texto Copiable (Compact Sync Token):**
   - Para lotes de datos que no superen los 64 KB (ej. notas de una unidad o ajustes de configuración), el sistema genera un bloque de texto seguro:
     ```text
     ---INICIO-CETPRO-SYNC---
     CETPRO-SYNC:v1:<crc32>:<base64url-comprimido-brotli>
     ---FIN-CETPRO-SYNC---
     ```
   - El docente copia el código y lo pega en el chat de WhatsApp.
   - El Director lo copia de WhatsApp, entra a Sincronización, hace clic en "Pegar Código WhatsApp" y el sistema valida la firma criptográfica Ed25519 y descomprime e importa las operaciones con total transparencia.
