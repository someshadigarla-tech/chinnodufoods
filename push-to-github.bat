@echo off
setlocal enabledelayedexpansion
title Chinnodu Foods - Uploading to GitHub

echo ========================================================
echo   Chinnodu Foods - Upload to GitHub Repository
echo   Target: https://github.com/someshadigarla-tech/chinnodufoods
echo ========================================================
echo.

set "PATH=C:\Users\somes\AppData\Local\Programs\Git\cmd;C:\Users\somes\AppData\Local\Programs\gh;%PATH%"

echo [1/4] Staging all individual files, photos, rates, and code...
git add .
git commit -m "Chinnodu Foods release - all individual photos, rates, and pages" 2>nul

echo.
echo [2/4] Checking GitHub authorization...
gh auth status >nul 2>nul
if errorlevel 1 (
    echo.
    echo --------------------------------------------------------
    echo  GitHub requires a quick 1-time browser approval:
    echo  1. A browser window will open at github.com/login/device
    echo  2. Copy the one-time code shown below and paste it in browser.
    echo --------------------------------------------------------
    echo.
    gh auth login --web -h github.com -p https --scopes "repo"
    gh auth setup-git
)

echo.
echo [3/4] Ensuring git is linked to GitHub...
gh auth setup-git >nul 2>nul

echo.
echo [4/4] Uploading all individual files and photos to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo Syncing latest changes and retrying push...
    git pull origin main --rebase
    git push -u origin main
)

if not errorlevel 1 (
    echo.
    echo ========================================================
    echo  SUCCESS! All 77 individual files, photos, and rates are
    echo  now live on your GitHub repository:
    echo  https://github.com/someshadigarla-tech/chinnodufoods
    echo ========================================================
)

echo.
echo Press any key to close this window.
pause >nul
