$DatabasePath = "C:\RIAAS\backend\data\riaas.db"

$RequiredFields = @(
    "id",
    "requirement_id",
    "action_text",
    "status",
    "owner",
    "due_date",
    "created_at",
    "source",
    "page",
    "updated_at",
    "updated_by",
    "target_date"
)

if (!(Test-Path $DatabasePath)) {
    Write-Host "Database not found at: $DatabasePath" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Checking database: $DatabasePath"
Write-Host ""

# Confirm sqlite3 exists
try {
    $null = sqlite3 --version
} catch {
    Write-Host "sqlite3 is not available in PATH. Install sqlite-tools or use the Python-based check." -ForegroundColor Red
    exit
}

$TableInfo = sqlite3 $DatabasePath "PRAGMA table_info(actions);"

if (-not $TableInfo) {
    Write-Host "'actions' table does not exist." -ForegroundColor Red
    exit
}

$ExistingColumns = @()
foreach ($line in $TableInfo) {
    $parts = $line -split "\|"
    if ($parts.Length -ge 2) { $ExistingColumns += $parts[1] }
}

Write-Host "Existing Columns in 'actions':" -ForegroundColor Cyan
Write-Host ""
$ExistingColumns | ForEach-Object { Write-Host "  - $_" }

Write-Host ""
Write-Host "Checking Required Fields:" -ForegroundColor Yellow
Write-Host ""

$Missing = @()
foreach ($field in $RequiredFields) {
    if ($ExistingColumns -contains $field) {
        Write-Host "  OK      $field" -ForegroundColor Green
    } else {
        Write-Host "  MISSING $field" -ForegroundColor Red
        $Missing += $field
    }
}

Write-Host ""
if ($Missing.Count -eq 0) {
    Write-Host "All required fields exist." -ForegroundColor Green
} else {
    Write-Host "Missing fields detected:" -ForegroundColor Yellow
    $Missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
