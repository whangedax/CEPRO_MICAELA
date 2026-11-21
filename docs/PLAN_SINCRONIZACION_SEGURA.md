# Sincronización segura — WhatsApp, archivos y tablas

Fecha: 2026-11-13. Estado: implementado, auditado e integrado en la copia local vigente.

## Alcance

Tres roles: Dirección, Secretaría y Docente. Dos medios de transporte para paquetes
firmados/cifrados: mensaje de WhatsApp y archivo `.cetpro` para USB o adjunto.
CSV/XLSX/JSON siguen como actualización tabular con validación y permisos propios.
Compartir datos no concede permisos nuevos ni sustituye la base de destino.

Fuente vigente: `C:/CETPRO/CETPRO_MODERNIZACION_V2`, con cambios de Antigravity que
deben conservarse. Implementación y QA primero en `dev-sandbox/sync-repair/` de este
worktree. No copiar bases reales, secretos ni artefactos previos. Integrar únicamente
archivos revisados y solo si sus versiones de origen no cambiaron entretanto.

## Diagnóstico confirmado

- WhatsApp tiene exportación docente, importación directa de dirección y controles
  ausentes en secretaría. Errores frontend buscan `message`, pero API lanza `error`.
- Exportación depende incorrectamente del rol para inferir si el equipo es satélite.
- La clave portable predeterminada no coincide con un flujo explícito de recepción.
- Importación WhatsApp carece de preview/confirmación; selección modular no incluye
  todas las dependencias de datos necesarias y acepta categorías desconocidas.
- Tablas: permisos de importación no se explican en UI; preview omite diferencias,
  avisos y filas sin cambios; lectura de archivo puede conservar contenido anterior.

## Responsables y lotes

| Lote | Responsable | Entrega y aceptación |
| --- | --- | --- |
| 1. Mapa/contratos | Explorador y arquitecto | Rutas, topología, permisos y contrato común revisados |
| 2. Motor de intercambio | Especialista backend | Capacidades, exportación, preview ligado a sesión y confirmación; usar merge existente |
| 3. Interfaz compartida | Especialista frontend | Enviar/recibir en tres roles; categorías/destinatarios, clave explícita, resumen y diferencias |
| 4. Tablas | Coordinador/implementador | Validación de formato/contenido, OCC, permisos y reimportación sin duplicar |
| 5. QA | Implementadores + auditor independiente | Equipos sintéticos, escenarios positivos/negativos y recorridos UI de tres roles |
| 6. Integración | Coordinador + documentador | Copia selectiva comprobada, build, evidencias y continuidad |

Skills: token-saver y cepro-orquestacion comunes; cepro-arquitectura/SQL para contratos
de datos, cepro-implementacion para backend, cepro-ui-design/Tailwind/React para UI,
cepro-auditoria para revisión independiente, cepro-memoria para cierre.
Máximo dos especialistas activos, sin recursión; archivos con propietario único.

## Contrato común

- `GET /api/network/sync/capabilities`: categorías y destinatarios permitidos, política.
- `POST /api/network/sync/export`: categoría, destinatario, clave y canal; devuelve
  paquete descargable, código cuando cabe y resumen de contenido real.
- `POST /api/network/sync/preview`: mensaje o paquete y clave; devuelve resumen,
  informe del motor e identificador temporal ligado a usuario, contexto y estado.
- `POST /api/network/sync/import`: confirma exclusivamente ese identificador.

No hay restauración ni reemplazo de tablas. Reutilizar firmas, cifrado, validación
de institución/alcance, recibos, revisiones, transacciones y conflictos del motor.
Los permisos de edición académica permanecen: administrativos reciben notas mediante
paquetes verificados; la edición/importación tabular de notas sigue su política.

## Criterios de aceptación

1. Tres roles ven qué pueden enviar/recibir y qué medio deben usar.
2. Dirección exporta configuración y unidades autorizadas; docente exporta su alcance.
3. Preview no aplica datos; confirmación corresponde al contenido revisado y rechaza
   un contexto/estado desactualizado. No aceptar un paquete distinto con el mismo token.
4. Mensaje/archivo repetido no duplica datos; registros ajenos permanecen intactos.
5. Cambios simultáneos o antiguos se detectan y conservan como conflictos, sin pérdida
   silenciosa de datos. Firma, clave, institución y destinatario se verifican.
6. Mensajes truncados/manipulados, formatos desconocidos y tamaños excesivos se rechazan.
7. Paquetes parciales incluyen solo las dependencias autorizadas necesarias.
8. Tablas muestran altas, cambios, ignorados, avisos y errores; el archivo equivocado,
   las revisiones antiguas y los permisos insuficientes impiden aplicar el lote.
9. Pruebas con equipos aislados y datos sintéticos; build y recorrido UI en tres roles.
10. Conservar tema, contexto académico, protocolos y funciones existentes.

WhatsApp requiere envío manual del mensaje/adjunto; no es sincronización en tiempo
real ni integración con cuentas de WhatsApp. Los resultados se reportarán como
verificados, pendientes o limitados; no se promete ausencia absoluta de errores.
