@echo off
setlocal enabledelayedexpansion
title Push Chinnodu Foods to GitHub

echo ========================================================
echo   Chinnodu Foods - One-Click GitHub Uploader
echo ========================================================
echo.

set "PATH=C:\Users\somes\AppData\Local\Programs\Git\cmd;%PATH%"

where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not found in PATH.
    pause
    exit /b 1
)

echo [INFO] Checking Git repository status...
git status >nul 2>nul
if errorlevel 1 (
    git init
    git branch -M main
)

echo.
echo [1/3] Staging all files, photos, products, and rates...
git add .

echo.
echo [2/3] Creating commit (preserving all photos and data)...
git commit -m "Chinnodu Foods complete upload - all photos, rates, and features" 2>nul

echo.
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo Enter your GitHub repository URL:
    echo Example: https://github.com/your-username/chinnodu-foods.git
    echo.
    set /p REPO_URL="Repository URL: "
    if "!REPO_URL!"=="" (
        echo [ERROR] No URL provided. Aborting.
        pause
        exit /b 1
    )
    git remote add origin !REPO_URL!
) else (
    for /f "delims=" %%u in ('git remote get-url origin') do set CURRENT_URL=%%u
    echo Current remote repository: !CURRENT_URL!
    set /p CHANGE_URL="Do you want to change it? (y/N): "
    if /i "!CHANGE_URL!"=="y" (
        set /p NEW_URL="Enter new Repository URL: "
        git remote set-url origin !NEW_URL!
    )
)

echo.
echo [3/3] Uploading all files to GitHub (main branch)...
git push -u origin main

if errorlevel 1 (
    echo.
    echo --------------------------------------------------------
    echo [!] If Git asked for login, please sign in or use a GitHub Personal Access Token.
    echo If GitHub rejected because of existing README/license, run:
    echo git pull origin main --rebase
    echo git push -u origin main
    echo --------------------------------------------------------
) else (
    echo.
    echo ========================================================
    echo  SUCCESS! All individual files, photos, and rates are now
    echo  safely live on your GitHub repository!
    echo ========================================================
)

echo.
pause
