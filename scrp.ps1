$FilePath = ".\backend\app\main.py"
$content = Get-Content $FilePath -Raw

# 1) Ensure re is imported
if ($content -notmatch '(?m)^import re$') {
    if ($content -match '(?m)^import hashlib$') {
        $content = [regex]::Replace($content, '(?m)^import hashlib$', "import hashlib`r`nimport re", 1)
        Write-Host "✅ Added import re"
    } else {
        Write-Host "❌ Could not find import anchor for adding re"
        exit 1
    }
}

# 2) Add helper before app = FastAPI(...)
if ($content -notmatch 'def _filter_contexts_by_source\(') {
    $helper = @'

def _filter_contexts_by_source(contexts: list[str], citations: list[dict], source: str | None = None):
    if not source:
        return contexts, citations

    pairs = []
    for ctx, cit in zip(contexts, citations):
        if str(cit.get("source") or "").strip() == str(source).strip():
            pairs.append((ctx, cit))

    if not pairs:
        return [], []

    filtered_contexts = []
    filtered_citations = []

    for idx, (ctx, cit) in enumerate(pairs, start=1):
        ctx_text = re.sub(r"^\[\d+\]\s*", "", str(ctx).lstrip())
        filtered_contexts.append(f"[{idx}] {ctx_text}")

        new_cit = dict(cit)
        new_cit["id"] = idx
        filtered_citations.append(new_cit)

    return filtered_contexts, filtered_citations

'@

    if ($content -match 'app = FastAPI\(title="RIAAS Backend", version="0\.1\.0"\)') {
        $content = [regex]::Replace(
            $content,
            'app = FastAPI\(title="RIAAS Backend", version="0\.1\.0"\)',
            $helper + 'app = FastAPI(title="RIAAS Backend", version="0.1.0")',
            1
        )
        Write-Host "✅ Added _filter_contexts_by_source helper"
    } else {
        Write-Host "❌ Could not find FastAPI app anchor"
        exit 1
    }
}

# 3) Filter auto extraction after ingestion
$oldAuto = @'
            contexts, citations = retrieve_context(
                  auto_topic,
                  top_k=runtime["max_context_chunks"],
              )
'@

$newAuto = @'
            contexts, citations = retrieve_context(
                  auto_topic,
                  top_k=runtime["max_context_chunks"],
              )
            contexts, citations = _filter_contexts_by_source(contexts, citations, pdf_path.name)
'@

if ($content.Contains($oldAuto)) {
    $content = $content.Replace($oldAuto, $newAuto)
    Write-Host "✅ Patched auto extraction source filtering"
} else {
    Write-Host "⚠️ Auto extraction block not found exactly; skipping that patch"
}

# 4) Add source query param to /extract-requirements signature
$content = [regex]::Replace(
    $content,
    'def extract_requirements\(req: ExtractRequirementsRequest\):',
    'def extract_requirements(req: ExtractRequirementsRequest, source: str | None = None):',
    1
)

# 5) Filter retrieve_context inside /extract-requirements
$oldExtract = '    contexts, citations = retrieve_context(topic, top_k=resolved_top_k)'
$newExtract = @'
    contexts, citations = retrieve_context(topic, top_k=resolved_top_k)
    contexts, citations = _filter_contexts_by_source(contexts, citations, source)
'@

if ($content.Contains($oldExtract)) {
    $content = $content.Replace($oldExtract, $newExtract)
    Write-Host "✅ Patched extract-requirements source filtering"
} else {
    Write-Host "❌ Could not find extract-requirements retrieve_context line"
    exit 1
}

# 6) Add source to extract response
$oldExtractResp = @'
      return {
          "topic": topic,
          "model": resolved_model,
          "top_k": resolved_top_k,
          "retrieved_citations": citations,
          "extracted_count": len(extracted),
          "saved_requirement_ids": saved_ids,
      }
'@

$newExtractResp = @'
      return {
          "topic": topic,
          "model": resolved_model,
          "top_k": resolved_top_k,
          "source": source,
          "retrieved_citations": citations,
          "extracted_count": len(extracted),
          "saved_requirement_ids": saved_ids,
      }
'@

if ($content.Contains($oldExtractResp)) {
    $content = $content.Replace($oldExtractResp, $newExtractResp)
    Write-Host "✅ Added source to extract response"
} else {
    Write-Host "⚠️ Extract response block not found exactly; skipping source response patch"
}

# 7) Add source query param to /ask signature if present
$content = [regex]::Replace(
    $content,
    'def ask\(([^)]*)\):',
    {
        param($m)
        $sig = $m.Groups[1].Value
        if ($sig -match '\bsource: str \| None = None\b') {
            return $m.Value
        }
        return "def ask($sig, source: str | None = None):"
    },
    1
)

# 8) Filter retrieve_context inside /ask if present
$oldAsk = '    contexts, citations = retrieve_context(q, top_k=resolved_top_k)'
$newAsk = @'
    contexts, citations = retrieve_context(q, top_k=resolved_top_k)
    contexts, citations = _filter_contexts_by_source(contexts, citations, source)
'@

if ($content.Contains($oldAsk)) {
    $content = $content.Replace($oldAsk, $newAsk)
    Write-Host "✅ Patched /ask source filtering"
} else {
    Write-Host "⚠️ /ask retrieve_context line not found exactly; skipping /ask patch"
}

Set-Content -Path $FilePath -Value $content -Encoding UTF8
Write-Host "✅ main.py patched"