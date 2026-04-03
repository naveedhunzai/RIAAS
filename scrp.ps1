$mainFile = ".\backend\app\main.py"
$backupDir = ".\backend\backup"

if (!(Test-Path $mainFile)) {
    Write-Host "❌ main.py not found"
    exit 1
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $mainFile "$backupDir\main_before_extract_fix_$ts.py"
Write-Host "✅ Backup created"

$content = Get-Content $mainFile -Raw

$old = '    resolved_top_k = int(resolve_param(req.top_k, runtime["max_context_chunks"]))'
$new = '    resolved_top_k = int(resolve_param(req.top_k, runtime["top_k"]))'

if (-not $content.Contains($old)) {
    Write-Host "❌ Expected line not found. Search manually in /extract-requirements."
    exit 1
}

$content = $content.Replace($old, $new)
Set-Content $mainFile $content -Encoding UTF8

Write-Host "✅ Updated /extract-requirements to use runtime['top_k']"