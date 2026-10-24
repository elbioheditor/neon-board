@echo off
cd /d "%~dp0"
echo ======================================================================
echo   GERADOR DE INSTALADOR NATIVO ANDROID (.APK) - NEON MOBILE
echo   Isso criara um link e um arquivo .APK independente que qualquer
echo   pessoa pode baixar e instalar no celular sem precisar do Expo Go!
echo ======================================================================
echo.
npx.cmd eas-cli@latest build -p android --profile preview
pause
