$ErrorActionPreference = "Stop"

# Find Documents page
$file = Get-ChildItem -Path . -Recurse -Include *.js,*.jsx -File |
Where-Object {
    (Get-Content $_.FullName -Raw) -match 'Document Lifecycle'
} | Select-Object -First 1

if (-not $file) {
    Write-Host "❌ Documents page not found"
    exit 1
}

$path = $file.FullName
Write-Host "📄 Found: $path"

# Backup
$backup = "$path.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
Copy-Item $path $backup
Write-Host "🛟 Backup: $backup"

$content = Get-Content $path -Raw

# Replace Reprocess button block
$content = $content -replace '(?s)<button[^>]*>Reprocess Document</button>', @'
<button
  style={{
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    cursor: doc.status === "Valid" ? "not-allowed" : "pointer",
    opacity: doc.status === "Valid" ? 0.5 : 1
  }}
  disabled={doc.status === "Valid"}
  onClick={() => {
    if (doc.status === "Valid") return;
    reprocessDocument(doc.id);
  }}
>
  Reprocess Document
</button>
'@

Set-Content $path $content -Encoding UTF8

Write-Host "✅ Reprocess button updated"