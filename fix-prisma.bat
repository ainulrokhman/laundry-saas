@echo off
echo ========================================
echo Prisma Generate Fix Script
echo ========================================
echo.
echo Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo Node processes stopped successfully.
) else (
    echo No Node processes found or already stopped.
)
echo.
timeout /t 2 /nobreak >nul
echo Deleting generated Prisma folder...
if exist "src\generated\prisma" (
    rmdir /s /q "src\generated\prisma"
    echo Generated folder deleted.
) else (
    echo Generated folder not found.
)
echo.
echo Running Prisma generate...
call npm run prisma:generate
echo.
if %errorlevel% equ 0 (
    echo ========================================
    echo Prisma generate completed successfully!
    echo ========================================
) else (
    echo ========================================
    echo Prisma generate failed. Check errors above.
    echo ========================================
)
echo.
pause
