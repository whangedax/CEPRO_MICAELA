@echo off
setlocal
cd /d "%~dp0.."

start "CETPRO produccion v1 - 8080" cmd /k node scripts\dev-server.js
start "CETPRO candidata v2 - 8081" cmd /k node scripts\v2-candidate-server.js

timeout /t 2 /nobreak >nul
start "" msedge.exe "http://127.0.0.1:8080/"
start "" msedge.exe "http://127.0.0.1:8081/"
start "" msedge.exe "http://127.0.0.1:8081/#/demo"
start "" msedge.exe "http://127.0.0.1:8081/tools/document-renderer-qa.html"

echo.
echo Se iniciaron dos servidores locales separados.
echo Cierre las dos ventanas de consola al terminar la aceptacion.
endlocal
