# Sistema Académico CETPRO — paquete para Google Antigravity

## Operación local por cuentas individuales — 5 de octubre de 2026

El inicio actual usa un servicio local con SQLite, usuario/contraseña, permisos por rol y asignación, y sincronización cifrada por USB. Ejecutar `INICIAR_SISTEMA_CETPRO.bat`; la primera pantalla crea dirección o vincula este equipo. El paquete de distribución incluye Node.js; el repositorio requiere Node.js 24 o posterior. Los datos anteriores se conservan y pueden incorporarse desde respaldo o navegador.

Consultar [guía de uso y recuperación](docs/GUIA_SISTEMA_OFFLINE.md). Verificar con `npm run test:offline` y `npm run test:offline-ui`. Los PDF de esta entrega son borradores con marca; las condiciones de emisión oficial y el transporte automático por LAN requieren validación/trabajo adicional. Las secciones siguientes documentan el sistema histórico.

Este repositorio prepara la migración del proyecto CETPRO desde la especificación histórica basada en Excel/VBA hacia una aplicación local construida con HTML, CSS y JavaScript puro.

## Principios no negociables

- Funciona localmente y sin conexión a Internet en operación normal.
- Tecnologías principales: HTML5, CSS3, JavaScript ES6+ e IndexedDB.
- Sin React, Vue, Angular, Bootstrap, Firebase, Supabase, CDNs ni servicios web obligatorios.
- Los archivos de `sources/raw/` son fuentes y no se modifican.
- No inventar DNI, fechas, módulos, notas, reglas académicas, firmas, créditos, horas ni equivalencias.
- Separar Persona/Estudiante de Matrícula. Una persona puede tener varias matrículas.
- Los documentos institucionales se generan desde datos validados; las plantillas no son base de datos.
- Cada módulo debe incluir implementación, pruebas, evidencia y actualización de `docs/PROJECT_STATE.md`.

## Cómo empezar en Antigravity

1. Extrae este ZIP en una carpeta nueva, por ejemplo `C:\CETPRO\SISTEMA_CETPRO`.
2. Abre esa carpeta como **Project** en Google Antigravity.
3. Verifica que Antigravity reconozca `.agents/rules/` y `.agents/skills/`.
4. Inicializa Git ejecutando `scripts/INICIALIZAR_GIT.bat` o manualmente.
5. Abre `00_INICIAR_ANTIGRAVITY.md` y pega el prompt indicado en una conversación del proyecto.
6. Ejecuta únicamente **M00**. No programes M01 hasta que los contratos de M00 queden revisados.

## Estado inicial

- Fuentes disponibles: `BD.zip`, `CARRERAS.jpeg`, especificaciones y paquete maestro histórico.
- El paquete histórico indica 12 Excel y 300 filas a reauditar; no son 300 personas únicas confirmadas.
- Las 21 plantillas institucionales fueron integradas en `sources/templates/originals/xlsx/`, junto con 21 vistas previas, auditoría e hashes SHA-256.
- El paquete recibido no contiene una plantilla de asistencia UD7; este faltante aparente debe respetarse y no completarse por suposición.
- No hay reglas académicas oficiales completas para notas, asistencia, EFSRT, cierre, certificado y título.

Consulta `sources/templates/CATALOGO_PLANTILLAS.md` para el inventario documental y `docs/PROJECT_STATE.md` para el estado vigente.

## Entorno de Trabajo Colaborativo

- **Repositorio Oficial:** [whangedax/CEPRO_MICAELA](https://github.com/whangedax/CEPRO_MICAELA)
- **Ramas de Trabajo:**
  - `main`: Versión estable institucional.
  - `dev-gonzalo`: Rama activa de desarrollo y pruebas de Gonzalo.

