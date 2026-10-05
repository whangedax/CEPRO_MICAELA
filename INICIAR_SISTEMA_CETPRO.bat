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

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no se encuentra instalado o no está en el PATH del sistema.
    echo Por favor instale Node.js para ejecutar el Sistema Académico CETPRO.
    pause
    exit /b 1
)

echo Abriendo navegador en http://127.0.0.1:8080/ ...
start "" "http://127.0.0.1:8080/"

echo Servidor en ejecución. Para detener el sistema, cierre esta ventana.
echo ========================================================================
echo.
node scripts\server.js

pause
