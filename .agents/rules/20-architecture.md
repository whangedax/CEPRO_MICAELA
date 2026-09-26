# Regla CETPRO — arquitectura web local

## Capas
1. `app/ui/`: renderizado, formularios y navegación.
2. `app/domain/`: reglas del dominio sin acceso directo al DOM.
3. `app/data/`: IndexedDB, repositorios, migraciones y transacciones.
4. `app/services/`: casos de uso orquestados.
5. `app/documents/`: preparación de documentos e impresión.
6. `app/shared/`: validación, IDs, fechas, logging y utilidades puras.

No colocar lógica académica compleja dentro de listeners del DOM.
No acceder directamente a IndexedDB desde componentes de UI.

## Persistencia
- Definir versión del esquema y migraciones explícitas.
- Operaciones multi-entidad deben usar transacciones de IndexedDB.
- Backups exportables a JSON versionado con checksum/metadatos.
- Restauración debe validar versión y permitir cancelar antes de reemplazar datos.

## Offline
La aplicación no puede requerir Internet para abrir, consultar, registrar, respaldar o imprimir.
No introducir `fetch()` a servicios externos en el flujo productivo.

## Compatibilidad
Objetivo inicial: Windows 10/11 con navegadores Chromium actuales. La interfaz debe ser responsive para Android en la misma red local cuando se habilite el servidor local.
