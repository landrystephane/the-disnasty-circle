@echo off
title THE DISNASTY CIRCLE — Serveur Web
echo ========================================================
echo   THE DISNASTY CIRCLE -- Demarrage du Serveur
echo ========================================================
echo.
echo Page publique : http://localhost:3000
echo Bal Masque    : http://localhost:3000/soirees/bal-masque
echo Espace Staff  : http://localhost:3000/staff/login
echo.
echo Identifiants Staff par defaut :
echo   Email    : admin@disnastycircle.com
echo   Password : DisnastyAdmin2026!
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo ========================================================
echo.
npm run dev
pause
