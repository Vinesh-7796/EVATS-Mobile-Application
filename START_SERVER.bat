@echo off
cd /d "%~dp0"
echo Starting EVATS Mobile POC...
echo.
echo ============================================
echo  EVATS Mobile - HV Power System POC
echo ============================================
echo.
echo First launch takes 1-2 minutes for bundling.
echo Scan the QR code with Expo Go app on your phone.
echo.
echo Press Ctrl+C to stop the server.
echo.
npx expo start --clear
pause
