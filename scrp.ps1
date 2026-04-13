# fix_extract_source_param.ps1
$ErrorActionPreference = "Stop"

$File = ".\backend\app\main.py"

if (!(Test-Path $File)) {
    throw "File not found: $File"
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $File "$File.bak_$stamp" -Force
Write-Host "✅ Backup created"

$content = Get-Content $File -Raw

$pattern = 'source = getattr\(req, "source", None\)'
$replacement = 'source = source or getattr(req, "source", None)'

if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, $replacement, 1)
    Set-Content $File $content -Encoding UTF8
    Write-Host "✅ Fixed source parameter handling"
} else {
    throw "Pattern not found — no changes made"
}