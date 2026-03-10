# diagnose.ps1
# Run from anywhere: powershell -ExecutionPolicy Bypass -File C:\RIAAS\frontend\diagnose.ps1

$ErrorActionPreference = "Stop"

$ProjectPath = "C:\RIAAS\frontend"

Write-Host "=== RIAAS Frontend Diagnostic ===" -ForegroundColor Cyan

if (!(Test-Path $ProjectPath)) {
  Write-Host "ERROR: Project path not found: $ProjectPath" -ForegroundColor Red
  exit 1
}

Set-Location $ProjectPath
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Green

# 1) Check package.json
if (!(Test-Path ".\package.json")) {
  Write-Host "ERROR: package.json not found in $ProjectPath" -ForegroundColor Red
  Write-Host "Make sure you're pointing to the Vite project folder." -ForegroundColor Yellow
  exit 1
}
Write-Host "OK: package.json found" -ForegroundColor Green

# 2) Show Node + npm versions
Write-Host "`n--- Versions ---" -ForegroundColor Cyan
try { Write-Host ("Node: " + (node -v)) } catch { Write-Host "ERROR: Node not found in PATH" -ForegroundColor Red; exit 1 }
try { Write-Host ("npm : " + (npm -v)) } catch { Write-Host "ERROR: npm not found" -ForegroundColor Red; exit 1 }

# 3) Quick dependency sanity
Write-Host "`n--- Key deps (npm list) ---" -ForegroundColor Cyan
npm list vite --depth=0
npm list @vitejs/plugin-react --depth=0

# 4) Install if needed
Write-Host "`n--- Install check ---" -ForegroundColor Cyan
if (!(Test-Path ".\node_modules")) {
  Write-Host "node_modules missing -> running npm install..." -ForegroundColor Yellow
  npm install
} else {
  Write-Host "node_modules exists" -ForegroundColor Green
}

# 5) Run a build to catch syntax errors (best signal)
Write-Host "`n--- Build diagnostic (npx vite build) ---" -ForegroundColor Cyan
try {
  npx vite build
  Write-Host "OK: Build succeeded" -ForegroundColor Green
} catch {
  Write-Host "BUILD FAILED (this usually shows the real error location)" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "`nTip: open the file/line shown above and fix the syntax error (often bad quotes/backslashes)." -ForegroundColor Yellow
  exit 1
}

# 6) Start dev server
Write-Host "`n--- Starting dev server ---" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
npm run dev