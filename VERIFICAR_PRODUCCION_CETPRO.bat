@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "CETPRO_NODE=node"
if exist "%~dp0runtime\node.exe" set "CETPRO_NODE=%~dp0runtime\node.exe"
echo Verificando la base local sin modificar alumnos, notas ni asistencias...
"%CETPRO_NODE%" scripts\production-readiness.cjs
if %ERRORLEVEL% equ 2 (
  echo.
  echo Hay datos institucionales pendientes. Consulte docs\PREPARACION_PRODUCCION.md.
  echo El detalle esta en private-data\production-readiness.json.
) else if %ERRORLEVEL% neq 0 (
  echo.
  echo La comprobacion no pudo terminar. Conserve la base y revise el mensaje anterior.
) else (
  echo.
  echo La base no tiene los pendientes detectables por esta comprobacion.
  echo Direccion debe validar los datos y los documentos antes de emitirlos.
)
pause
