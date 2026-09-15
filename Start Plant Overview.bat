@echo off
setlocal
title Monroe Glass Plant - Local Website

cd /d "%~dp0"

set "PLANT_HOST=127.0.0.1"
set "PLANT_PORT=4173"
set "PLANT_URL=http://%PLANT_HOST%:%PLANT_PORT%"

where node >nul 2>nul
if not errorlevel 1 goto node_ready

set "LOCAL_NODE="
for /f "delims=" %%D in ('dir /b /ad /o-n "%USERPROFILE%\Tools\nodejs\node-v*-win-x64" 2^>nul') do if not defined LOCAL_NODE set "LOCAL_NODE=%USERPROFILE%\Tools\nodejs\%%D"

if not defined LOCAL_NODE goto missing_node
set "PATH=%LOCAL_NODE%;%PATH%"

:node_ready
where npm >nul 2>nul
if errorlevel 1 goto missing_node

for /f "delims=" %%V in ('node --version') do set "NODE_VERSION=%%V"
echo.
echo Monroe Glass Plant local website
echo Using Node.js %NODE_VERSION%
echo.

if exist "%~dp0node_modules\.bin\vinext.cmd" goto dependencies_ready

echo First-time setup: installing the website dependencies...
call npm ci
if errorlevel 1 goto install_failed

:dependencies_ready
set "VITE_CACHE=%~dp0node_modules\.vite"
if not exist "%VITE_CACHE%" goto cache_ready

echo Refreshing the generated local-development cache...
rmdir /s /q "%VITE_CACHE%"
if exist "%VITE_CACHE%" goto cache_failed

:cache_ready
echo Building the optimized local website...
call npm.cmd run build
if errorlevel 1 goto build_failed

echo Opening %PLANT_URL%
echo Keep this window open while viewing or editing the website.
echo This optimized mode avoids development-server graphics slowdowns.
echo Restart this file after changing source code so it rebuilds the site.
echo The fixed address keeps browser-saved layout revisions on one local origin.
echo Press Ctrl+C when you are finished.
echo.

if not defined PLANT_NO_BROWSER start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$url='%PLANT_URL%'; for($attempt=0; $attempt -lt 120; $attempt++){ try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if($response.StatusCode -eq 200){ Start-Process $url; exit 0 } } catch {} Start-Sleep -Milliseconds 500 }"

call "%~dp0node_modules\.bin\vinext.cmd" start --hostname %PLANT_HOST% --port %PLANT_PORT%
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" exit /b 0

echo.
echo The local website stopped with error code %EXIT_CODE%.
echo If port %PLANT_PORT% is already in use, close the other local server and try again.
pause
exit /b %EXIT_CODE%

:missing_node
echo.
echo Node.js could not be found.
echo Expected either a normal Node.js installation or a per-user installation under:
echo   %USERPROFILE%\Tools\nodejs\node-v*-win-x64
echo.
echo No administrator permission is required for the per-user installation.
pause
exit /b 1

:install_failed
echo.
echo The website dependencies could not be installed.
echo Check the npm error above, then double-click this file again.
pause
exit /b 1

:build_failed
echo.
echo The optimized website build failed.
echo Review the error above, then double-click this file again.
pause
exit /b 1

:cache_failed
echo.
echo The generated Vite cache could not be refreshed.
echo Close any other Plant Overview command windows, then try again.
pause
exit /b 1
