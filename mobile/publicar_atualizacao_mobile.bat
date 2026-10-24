@echo off
cd /d "%~dp0"
echo ======================================================================
echo   ATUALIZADOR AUTOMATICO (OTA) - NEON MOBILE
echo   Envia atualizacoes direto para todos os celulares com o app
echo   instalado, sem ninguem precisar baixar .APK de novo!
echo ======================================================================
echo.
npx.cmd eas-cli@latest update --branch preview --message "Atualizacao automatica Neon Mobile"
npx.cmd eas-cli@latest update --branch production --message "Atualizacao automatica Neon Mobile"
pause
