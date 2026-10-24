@echo off
cd /d "%~dp0"
echo ======================================================
echo   NEON MOBILE (React Native + Expo - MODO TUNEL)
echo   Escaneie o QR Code no app Expo Go (Android / iOS)
echo ======================================================
npx.cmd expo start --tunnel
pause
