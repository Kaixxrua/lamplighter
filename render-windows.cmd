@echo off
rem LAMPLIGHTER: the whole film in 4K on this PC's NVIDIA GPU, in one click.
rem Installs Git, Node.js and FFmpeg with winget when they are missing, clones the film (or brings it
rem up to date), then hands over to engine\tools\windows.mjs. Run it again at any time: it carries on
rem where it stopped.
rem   render-windows.cmd          everything: the checks, the 4K picture, the sound, the masters
rem   render-windows.cmd --test   only the checks and the timing (about 10 minutes)

rem The update below may rewrite this very file, which cmd is still reading: run from a copy instead.
if "%LL_FROM_COPY%"=="1" goto from_copy
set "LL_FILM_DIR=%~dp0"
set "LL_FROM_COPY=1"
copy /y "%~f0" "%TEMP%\lamplighter-render.cmd" >nul
"%TEMP%\lamplighter-render.cmd" %*
:from_copy
set "LL_FROM_COPY="
setlocal EnableExtensions
title LAMPLIGHTER 4K

set "REPO=https://github.com/Kaixxrua/lamplighter.git"
set "BRANCH=main"

rem the film: the folder this file is in when that is the film, otherwise a "lamplighter" folder next to
rem this file (so put this file on a disk with room for the renders, about 80 GB)
set "FILM=%LL_FILM_DIR%"
if exist "%FILM%engine\tools\windows.mjs" goto have_dir
set "FILM=%LL_FILM_DIR%lamplighter\"
:have_dir
set "DIR=%FILM:~0,-1%"

where winget >nul 2>nul
if errorlevel 1 goto no_winget

call :need git Git.Git
call :need node OpenJS.NodeJS.LTS
call :need ffmpeg Gyan.FFmpeg
call :refresh_path
where git >nul 2>nul
if errorlevel 1 goto reopen
where node >nul 2>nul
if errorlevel 1 goto reopen
where ffmpeg >nul 2>nul
if errorlevel 1 goto reopen

if exist "%FILM%.git" goto update
rem a copy without git (a ZIP from GitHub): use it as it is
if exist "%FILM%engine\tools\windows.mjs" goto start
echo.
echo Downloading the film into %DIR% ...
git clone --branch %BRANCH% "%REPO%" "%DIR%"
if errorlevel 1 goto failed
goto start
:update
echo.
echo Updating the film in %DIR% ...
git -C "%DIR%" fetch origin %BRANCH%
if errorlevel 1 goto failed
git -C "%DIR%" reset --hard origin/%BRANCH%
if errorlevel 1 goto failed

:start
node "%FILM%engine\tools\windows.mjs" %*
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" echo Finished.
if not "%RC%"=="0" echo Stopped (code %RC%). The log is %FILM%renders\windows.log
pause
exit /b %RC%

:need
where %1 >nul 2>nul
if not errorlevel 1 exit /b 0
echo.
echo Installing %2 ...
winget install --id %2 -e --source winget --accept-package-agreements --accept-source-agreements
exit /b 0

:refresh_path
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%P"
exit /b 0

:no_winget
echo.
echo winget is missing. Install "App Installer" from the Microsoft Store (or update Windows), then run this again.
pause
exit /b 1

:reopen
echo.
echo Git, Node.js and FFmpeg are installed now. Close this window and run render-windows.cmd again.
pause
exit /b 1

:failed
echo.
echo Could not get the film from GitHub. Check the network, then run this again.
pause
exit /b 1
