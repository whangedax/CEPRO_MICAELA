# Recorridos para compartir y trabajar con archivos

Propuesta implementada en staging; verificación visual a cargo del coordinador.

- Entrada: dos intenciones claras, enviar o recibir; ayuda de perfil plegada.
- Enviar: información → destinatario/aulas → medio/clave → envío listo.
- Recibir: mensaje/archivo → clave y revisión → cambios y confirmación → resultado.
- Un paso principal visible a la vez; volver conserva los valores. Modificar entradas
  invalida el código generado, la revisión y su confirmación. Actor/contexto nuevos
  reinician los datos temporales; respuestas y lecturas obsoletas se descartan.
- WhatsApp ofrece mensaje completo, copia verificada y archivo alternativo. USB
  ofrece archivo para descargar. No aparece un código para copiar en la opción USB.
- Resumen: persona que envía/recibe, información, aulas y cantidades de registros
  nuevos, actualizados, sin cambios y conflictos. Ningún JSON en el panel principal.
  Se usan nombres de aulas si el contrato los entrega; no se inventan diferencias
  de valores individuales que la API no proporciona.
- Las tarjetas y controles conservan permisos del servidor, clave explícita,
  previewToken, límite de archivo de 28 MiB y destino administrativo autorizado
  del docente sin directorio; no se modifican contratos ni funciones del motor.
- TransferFlow comparte pasos, marco y tarjetas de intención con Trabajar con archivos.
  Tokens --ui existentes, Plus Jakarta Sans local, radios 10/16 px, acciones ≥44 px,
  lectura 16 px, metadatos 14 px y superficies coherentes en claro/oscuro.
- Accesibilidad: pasos con aria-current, foco al encabezado al avanzar/volver,
  nombres y estados de selección visibles, errores enfocados, copia manual si falla
  el portapapeles y confirmación separada de revisar/importar.
- QA acordado: tres perfiles, WhatsApp/USB, XLSX/JSON reales sintéticos,
  destinatario incorrecto, archivo/código inválidos, volver y editar, teclado,
  1024/1366 px, claro/oscuro y ausencia de cambios duplicados.
