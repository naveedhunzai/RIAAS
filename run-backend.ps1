Set-Location C:\RIAAS

# Always use backend venv's python
$py = ".\backend\venv\Scripts\python.exe"
if (!(Test-Path $py)) {
  Write-Host "ERROR: venv python not found at $py" -ForegroundColor Red
  exit 1
}

& $py -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
