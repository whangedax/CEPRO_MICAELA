# Informe final — PRIORITY-PRODUCTION-MVP-08

Fecha: 2026-09-16. Alcance: candidata `CETPRO_V2_CANDIDATE`; producción `CETPRO_DB` fuera de alcance y preservada.

## A. Estudiantes

Operativos en candidata para crear, buscar, ver, editar y desactivar. Los IDs técnicos son estables y el documento se conserva como texto, incluidos formatos de 7 caracteres o alfanuméricos. El CRUD se probó únicamente con datos sintéticos en laboratorio.

## B. Matrículas

La ruta de candidata permite buscar/seleccionar estudiante y programa, usar un grupo existente o crear uno futuro, y guardar una matrícula aun cuando módulo o periodo no estén confirmados. En ese caso queda con configuración académica pendiente; no se inventan valores.

## C. Grupos

`groupId` es la autoridad. La vista muestra ficha, cantidad y procedencia, conserva los ocho `REVIEW_REQUIRED` y ofrece enlaces a matrícula, nómina y registro. Un grupo futuro recibe ID opaco; su código visible no es PK y `sourceGroupCode` no se fabrica.

## D. Nómina

`#/nominas` permite seleccionar programa/grupo, revisar contexto y obtener preview, PDF, descarga e impresión. Usa matrículas reales del `groupId` y solo datos confirmados.

## E. TMPL-01

Opera como `PREVIEW_ADMINISTRATIVE`. Acepta 0, 1 y 30 estudiantes; 31 produce `CAPACITY_EXCEEDED`. No imprime `MAT-*` como código oficial, no crea una página 2 y añade “BORRADOR ADMINISTRATIVO — DATOS ACADÉMICOS PENDIENTES” únicamente al PDF generado. La emisión oficial permanece bloqueada.

## F. Registro de matrícula

`#/registros/matricula` construye el contexto real del grupo y distingue datos conocidos de módulo/periodo pendientes. La alternativa interna genera PDF, permite imprimir y exporta CSV.

## G. TMPL-03

Permanece `REVIEW_REQUIRED`. No se habilitaron ni pintaron cajas ambiguas; no existe afirmación de documento institucional completo.

## H. TMPL-02

La ficha de matrícula conserva preview PDF, descarga e impresión en el motor documental compartido. No cambia sus bloqueos de emisión oficial.

## I. Configuración académica

`#/configuracion-academica` separa Periodo, Módulo por grupo y Unidades didácticas. Cada escritura exige confirmar fuente autorizada y registra tipo, descripción, responsable y fecha. La candidata real sigue en 0 periodos/0 unidades y sin módulos asignados por este gate.

## J. Periodo manual controlado

Puede crearse solo por interacción explícita, con denominación, año, fechas y estado. No existe prellenado oficial ni se usa la leyenda fija de un PDF como fuente.

## K. Asignación de módulo

La persona autorizada selecciona grupo y una opción del programa. No hay autoselección; servicio, transacción y auditoría revalidan pertenencia y procedencia.

## L. Reporte administrativo alternativo

Para grupos mayores a 30, el reporte interno conserva todas las filas, se rotula “REPORTE ADMINISTRATIVO INTERNO” y no altera TMPL-01. El registro alternativo no oficial ofrece PDF/CSV.

## M. Backup

La candidata muestra exportación, checksum, preflight, prebackup y lectura posterior. El round-trip fue probado en base aislada. No se ejecutó restore sobre candidata real ni producción.

## N. Offline

El flujo usa HTML/CSS/JS y librerías locales, sin CDN ni solicitudes externas. La auditoría de portabilidad documenta el trabajo restante para un paquete Windows sin Node en la PC final.

## O. Pruebas dedicadas

`PRIORITY_PRODUCTION_MVP_08`: **39/39**, `failed=0`. Incluye rutas/UX, `groupId`, 0/1/30/31, reporte completo, TMPL-01/02/03, estudiantes, matrícula, grupo futuro, configuración con procedencia, backup, offline, XSS, lectura real y preservación de candidata.

## P. Regresión global

`node scripts/verify_project.js`: **1326/1326 en 54 suites**, `failed=0`.

## Q. PDF hashes

Los 21/21 PDF canónicos conservan su SHA-256 esperado. El watermark existe solo en la salida generada.

## R. Datos reales preservados

La lectura real confirmó 269 estudiantes, 295 matrículas, 295 staging, 12 grupos, 7 programas, 14 módulos, 0 periodos y 0 unidades. El snapshot fue idéntico antes/después. No se registraron datos personales en pruebas o documentación. Producción v1 no se abrió ni migró.

## S. Procedimiento de demostración

Usar `docs/MVP_DEMO_CHECKLIST.md`: Inicio, estudiante, matrícula, grupo, nómina, registro, ficha y respaldo en menos de diez minutos, dentro de la misma candidata y sin herramientas QA.

## T. Pendiente para producción oficial

Faltan confirmación de Jefatura sobre periodo, módulos por grupo, plan/unidades y reglas posteriores; certificación geométrica de TMPL-03; reinspección física Edge; paquete Windows autocontenido; y autorización separada para ejecutar `PRODUCTION_MIGRATION_V1_TO_V2`. Asistencia, evaluación y emisión oficial siguen bloqueadas.

PRIORITY-PRODUCTION-MVP-08 COMPLETADA —
NÓMINAS, MATRÍCULAS Y REGISTROS ADMINISTRATIVOS
PREPARADOS COMO MVP OPERATIVO LOCAL,
SIN INVENTAR DATOS ACADÉMICOS NI ALTERAR PRODUCCIÓN V1

MVP_ADMIN_READY = YES
OFFICIAL_ACADEMIC_RELEASE = NO

DETENTE.
NO MIGRAR PRODUCCIÓN TODAVÍA.
