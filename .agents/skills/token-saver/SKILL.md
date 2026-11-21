---
name: token-saver
description: Reduce contexto en trabajo CEPRO mediante búsquedas acotadas, delegación breve y logs filtrados sin perder evidencia.
---
# Eficiencia de contexto

- Localiza con `rg -n`; lee bloques de hasta 120 líneas. Un archivo pequeño puede leerse completo.
- Lee el índice activo, no todo el historial. No releas contenido sin cambio o duda concreta.
- Carga solo la skill del rol y la referencia del problema actual; no todos los catálogos.
- El coordinador entrega contexto verificado, rutas y criterios; no el chat entero.
- Un mapa compartido por lote. El auditor inspecciona independientemente áreas críticas.
- Retorna 15–25 líneas con resultado, archivos, evidencia y bloqueos; detalle en artefactos.
- Guarda logs fuera del contexto; devuelve resumen y ruta. Conserva el código de salida.
- Máximo dos intentos con la misma estrategia fallida; después replantea con evidencia.
- Omite especialistas innecesarios; no reduce criterios de aceptación por ahorrar tokens.
- Los presupuestos son orientativos, no límites del servicio ni mediciones de facturación.

En PowerShell, ejemplo para un comando largo (ajusta nombre y comando al lote):
```powershell
$taskLog = Join-Path $env:TEMP 'cepro-build.log'
npm run build *> $taskLog
$taskExit = $LASTEXITCODE
if ($taskExit -eq 0) { Get-Content -LiteralPath $taskLog -Tail 8 }
else { Get-Content -LiteralPath $taskLog -Tail 30 }
Write-Output "exit=$taskExit log=$taskLog"
```
No reutilizar el mismo log entre procesos concurrentes. No guardar secretos en logs.
