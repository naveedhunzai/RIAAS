@'
# ===== CONFIGURATION =====
$DatabasePath = "data\app.db"   # Change this if needed

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

# ===== CHECK DB EXISTS =====
if (!(Test-Path $DatabasePath)) {
    Write-Host "Database not found at: $DatabasePath" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Checking database: $DatabasePath"
Write-Host ""

# ===== GET TABLE INFO =====
$TableInfo = sqlite3 $DatabasePath "PRAGMA table_info(actions);"

if (-not $TableInfo) {
    Write-Host "'actions' table does not exist." -ForegroundColor Red
    exit
}

# Extract column names (2nd field from PRAGMA output)
$ExistingColumns = @()

foreach ($line in $TableInfo) {
    $parts = $line -split "\|"
    if ($parts.Length -ge 2) {
        $ExistingColumns += $parts[1]
    }
}

Write-Host "Existing Columns in 'actions':" -ForegroundColor Cyan
Write-Host ""

foreach ($col in $ExistingColumns) {
    Write-Host "  - $col"
}

Write-Host ""
Write-Host "Checking Required Fields:" -ForegroundColor Yellow
Write-Host ""

$Missing = @()

foreach ($field in $RequiredFields) {
    if ($ExistingColumns -contains $field) {
        Write-Host "  OK  $field" -ForegroundColor Green
    }
    else {
        Write-Host "  MISSING  $field" -ForegroundColor Red
        $Missing += $field
    }
}

Write-Host ""

if ($Missing.Count -eq 0) {
    Write-Host "All required fields exist." -ForegroundColor Green
}
else {
    Write-Host "Missing fields detected:" -ForegroundColor Yellow
    foreach ($m in $Missing) {
        Write-Host "   - $m" -ForegroundColor Red
    }
}
'@ | Set-Content -Encoding UTF8 