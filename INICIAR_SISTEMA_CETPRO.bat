@echo off
chcp 65001 >nul
title SISTEMA ACADÉMICO CETPRO — INICIO DE PRODUCCIÓN

echo ========================================================================
echo               SISTEMA ACADÉMICO CETPRO — PRODUCCIÓN LOCAL
echo ========================================================================
echo.
echo Iniciando servidor unificado de producción en puerto 8080...
echo.

cd /d "%~dp0"

set "CETPRO_NODE=node"
if exist "%~dp0runtime\node.exe" set "CETPRO_NODE=%~dp0runtime\node.exe"
"%CETPRO_NODE%" -e "if(Number(process.versions.node.split('.')[0]) < 24) process.exit(1)" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Se necesita Node.js 24 o posterior. Use el paquete que incluye runtime\node.exe.
    pause
    exit /b 1
)

echo Abriendo navegador en http://127.0.0.1:8080/ ...
start "" "http://127.0.0.1:8080/"

echo Servidor en ejecución. Para detener el sistema, cierre esta ventana.
echo ========================================================================
echo.
"%CETPRO_NODE%" scripts\server-offline.cjs

pause
