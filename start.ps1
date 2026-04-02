# ==========================================
# SIMPLE RIAAS START SCRIPT
# Starts Ollama, Backend, Frontend
# No cleanup, no killing
# ==========================================

$Root = "/Users/aaronnaveed/RIAAS"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "🚀 Starting RIAAS..." -ForegroundColor Cyan

# Start Ollama
Write-Host "Starting Ollama..."
Start-Process pwsh -ArgumentList @(
    "-NoExit",
    "-Command",
    "ollama serve"
)

Start-Sleep -Seconds 3

# Start Backend
Write-Host "Starting Backend..."
Start-Process pwsh -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$Backend'; python -m uvicorn app.main:app --reload"
)

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend..."
Start-Process pwsh -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$Frontend'; npm run dev"
)

Write-Host ""
Write-Host "✅ RIAAS started" -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Docs:     http://127.0.0.1:8000/docs"
Write-Host "Frontend: http://localhost:5173"