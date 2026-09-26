@echo off
setlocal
where git >nul 2>nul
if errorlevel 1 (
  echo Git no esta instalado o no esta en PATH.
  echo Instala Git for Windows y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
cd /d "%~dp0.."
if exist .git (
  echo El repositorio Git ya existe.
) else (
  git init
  git add .
  git commit -m "chore: preparar proyecto CETPRO para Antigravity"
)
echo.
git status
pause
