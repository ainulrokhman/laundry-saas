# Fixing Prisma Generate EPERM Error on Windows

## Problem
```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp' -> 'query_engine-windows.dll.node'
```

This error occurs when Prisma tries to replace the query engine DLL file, but it's locked by another process.

## Solutions (Try in Order)

### Solution 1: Stop All Node Processes
1. **Stop the Next.js dev server** (if running):
   - Press `Ctrl+C` in the terminal where `npm run dev` is running
   - Or close the terminal

2. **Close VS Code/Cursor** (if using):
   - Save all files
   - Close the IDE completely
   - Reopen after generating

3. **Kill all Node processes**:
   ```powershell
   # In PowerShell or Command Prompt
   taskkill /F /IM node.exe
   ```

4. **Then run Prisma generate**:
   ```bash
   npm run prisma:generate
   ```

### Solution 2: Use Prisma Generate with Force Flag
```bash
npx prisma generate --force
```

### Solution 3: Delete Generated Folder Manually
1. Close all Node processes and IDE
2. Delete the generated folder:
   ```powershell
   # In PowerShell
   Remove-Item -Recurse -Force "src\generated\prisma"
   ```
3. Run generate:
   ```bash
   npm run prisma:generate
   ```

### Solution 4: Change Prisma Output Location (Temporary)
If the issue persists, you can temporarily change the output location in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}
```

Then run:
```bash
npm run prisma:generate
```

**Note**: After this, update imports from `@/generated/prisma` to `@prisma/client` in your code.

### Solution 5: Run as Administrator
1. Right-click on Command Prompt or PowerShell
2. Select "Run as administrator"
3. Navigate to project directory
4. Run: `npm run prisma:generate`

## Prevention

1. **Always stop the dev server** before running `prisma generate`
2. **Use a separate terminal** for Prisma commands
3. **Close TypeScript/ESLint servers** in your IDE before generating

## Quick Fix Script

Create a batch file `fix-prisma.bat`:

```batch
@echo off
echo Stopping Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Deleting generated folder...
if exist "src\generated\prisma" rmdir /s /q "src\generated\prisma"
echo Running Prisma generate...
call npm run prisma:generate
echo Done!
pause
```

Run it when you encounter the error.
