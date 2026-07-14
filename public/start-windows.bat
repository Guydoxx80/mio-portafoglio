@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Provo ad aprire la versione a doppio click.
  start "" "Apri App.html"
  pause
  exit /b
)
node local-server.cjs 4173
pause
