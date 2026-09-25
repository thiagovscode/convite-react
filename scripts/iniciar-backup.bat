@echo off
title Monitor de Backup Automatico - Casamento
echo ========================================================
echo   Iniciando Monitor de Backup Automatico de RSVP
echo ========================================================
echo.

node scripts/backup-on-rsvp.mjs
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Se os modulos nao estiverem instalados, execute:
    echo npm install mongodb nodemailer
    echo.
    pause
)
