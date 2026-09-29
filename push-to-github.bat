@echo off
setlocal enabledelayedexpansion
title Chinnodu Foods - Uploading to GitHub

echo ========================================================
echo   Chinnodu Foods - 1-Click Upload to GitHub
echo   Target Repository: https://github.com/someshadigarla-tech/chinnodufoods
echo ========================================================
echo.

set "PATH=C:\Users\somes\AppData\Local\Programs\Git\cmd;%PATH%"

echo [1/3] Adding any recent edits or new images...
git add .

echo.
echo [2/3] Checking for any pending changes...
git commit -m "Update website, dishes, photos and rates" 2>nul

echo.
echo [3/3] Uploading all individual files and photos to GitHub...
echo (If a browser window pops up, click 'Sign in with your browser' to authorize GitHub)
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo ========================================================
    echo  [!] Push encountered an issue.
    echo  If it says 'Updates were rejected', trying sync:
    echo ========================================================
    git pull origin main --rebase
    git push -u origin main
) else (
    echo.
    echo ========================================================
    echo  [SUCCESS] All files, photos, and rates are now safely 
    echo  live in your repository:
    echo  https://github.com/someshadigarla-tech/chinnodufoods
    echo ========================================================
)

echo.
echo Press any key to exit.
pause >nul
