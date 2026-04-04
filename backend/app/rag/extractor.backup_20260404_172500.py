import json
import re
from typing import Any

from app.rag.ollama_client import ollama_generate


def _escape_control_chars_in_strings(s: str) -> str:
    result = []
    in_string = False
    escape = False

    for ch in s:
        if escape:
            result.append(ch)
            escape = False
            continue

        if ch == "\\":
            result.append(ch)
            escape = True
            continue

        if ch == '"':
            result.append(ch)
            in_string = not in_string
            continue

        if in_string:
            if ch == "\n":
                result.append("\\n")
                continue
            if ch == "\r":
                result.append("\\r")
                continue
            if ch == "\t":
                result.append("\\t")
                continue

        result.append(ch)

    return "".join(result)


def _extract_json(text: str) -> Any:
    """
    Extract the first JSON array from model output and repair simple control-character issues.
    """
    match = re.search(r"\[.*\]", text, flags=re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in model output.")

    raw_json = match.group(0)
    raw_json = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", raw_json)

    try:
        return json.loads(raw_json)
    except json.JSONDecodeError:
        repaired = _escape_control_chars_in_strings(raw_json)
        return json.loads(repaired)


ALLOWED_MODALITIES = {"MUST", "SHALL", "PROHIBITED", "SHOULD"}
ALLOWED_CATEGORIES = {"Reporting", "Recordkeeping", "Training", "Monitoring", "Governance", "Other"}

CATEGORY_MAP = {
    "Prevention": "Monitoring",
    "Detective": "Monitoring",
    "Detection": "Monitoring",
    "Controls": "Monitoring",
    "Security": "Monitoring",
    "Policy": "Governance",
    "Policies": "Governance",
    "Procedure": "Governance",
    "Procedures": "Governance",
    "Oversight": "Governance",
    "Compliance": "Governance",
    "Documentation": "Recordkeeping",
    "Records": "Recordkeeping",
    "Reporting Requirements": "Reporting",
    "Report": "Reporting",
    "Training Requirements": "Training",
}


def normalize_modality(m: str | None) -> str:
    m = (m or "").upper().strip()

    if m in {"REQUIRED", "MANDATORY"}:
        return "MUST"
    if m in {"MAY NOT", "MUST NOT"}:
        return "PROHIBITED"
    if m in {"RECOMMENDED", "ADVISORY"}:
        return "SHOULD"

    return m if m in ALLOWED_MODALITIES else "SHOULD"


def normalize_category(c: str | None) -> str:
    c = (c or "").strip()
    if not c:
        return "Other"

    c_title = c.title()
    mapped = CATEGORY_MAP.get(c_title, c_title)

    return mapped if mapped in ALLOWED_CATEGORIES else "Other"


def extract_requirements_from_context(question: str, contexts: list[str], model: str = "gemma3:1b") -> list[dict]:
    prompt = (
        "You extract compliance REQUIREMENTS from regulatory text.\n"
        "Return ONLY valid JSON as a single JSON array. No markdown. No commentary.\n\n"
        "Rules:\n"
        "- Return up to 100 objects.\n"
        "- Each requirement_text should be a clear, complete compliance statement. You may rewrite for clarity.\n"
        "- Extract ALL compliance-related statements, including obligations, expectations, controls, and procedures.\n"
        "- modality must be one of: MUST, SHALL, PROHIBITED, SHOULD.\n"
        "- category must be one of: Reporting, Recordkeeping, Training, Monitoring, Governance, Other.\n"
        "- citation_id is REQUIRED for every object.\n"
        "- citation_id must be an integer and must exactly match one source block number from SOURCES.\n"
        "- Do not invent citation_id values.\n"
        "- Always include the requirement. If citation is unclear, assign the closest matching source.\n\n"
        "JSON schema:\n"
        "[\n"
        "  {\"requirement_text\":\"Sentence.\",\"modality\":\"MUST\",\"category\":\"Governance\",\"citation_id\":1}\n"
        "]\n\n"
        f"QUESTION:\n{question}\n\n"
        "SOURCES:\n" + "\n\n".join(contexts) + "\n\n"
        "JSON:"
    )

    raw = ollama_generate(prompt, model=model)

    print("\n=== RAW REQUIREMENT EXTRACTION OUTPUT START ===")
    print(raw)
    print("=== RAW REQUIREMENT EXTRACTION OUTPUT END ===\n")

    try:
        data = _extract_json(raw)
    except Exception as e:
        print("\n=== REQUIREMENT EXTRACTION PARSE ERROR START ===")
        print(str(e))
        print("=== REQUIREMENT EXTRACTION PARSE ERROR END ===\n")
        return []

    print("\n=== PARSED REQUIREMENTS START ===")
    print(data)
    print("=== PARSED REQUIREMENTS END ===\n")

    cleaned: list[dict] = []
    seen_texts: set[str] = set()

    for item in data:
        if not isinstance(item, dict):
            continue

        rt = " ".join(str(item.get("requirement_text") or "").split()).strip()
        if not rt:
            continue

        key = rt.lower()
        if key in seen_texts:
            continue
        seen_texts.add(key)

        cid = item.get("citation_id")
        try:
            cid = int(cid) if cid is not None else None
        except (TypeError, ValueError):
            cid = None

        # 🔥 Fallback logic for missing citation_id
        if cid is None:
            best_id = None
            best_score = 0

            for idx, ctx in enumerate(contexts, start=1):
                ctx_lower = ctx.lower()
                rt_lower = rt.lower()

                # strong match
                if rt_lower in ctx_lower:
                    cid = idx
                    break

                # weak match score
                overlap = 0
                for w in rt_lower.split():
                    if w in ctx_lower:
                        overlap += 1

                if overlap > best_score:
                    best_score = overlap
                    best_id = idx

            if cid is None:
                cid = best_id if best_id else 1

        cleaned.append({
            "requirement_text": rt,
            "modality": normalize_modality(item.get("modality")),
            "category": normalize_category(item.get("category")),
            "citation_id": cid,
        })

    print("\n=== CLEANED REQUIREMENTS ===")
    print(cleaned)

    return cleaned


def extract_actions_for_requirement(requirement_text: str, model: str = "gemma3:1b") -> list[dict]:
    prompt = (
        "You convert a compliance requirement into actionable remediation tasks.\n"
        "Return ONLY valid JSON as a list. No markdown. No code fences. No commentary.\n\n"
        "Strict rules:\n"
        "- Return 1 to 3 actions only.\n"
        "- Every value must be a short single line.\n"
        "- Use plain text only.\n"
        "- Do NOT include quotation marks inside values.\n"
        "- Do NOT include line breaks tabs or carriage returns inside values.\n"
        "- priority must be exactly one of: Low, Medium, High.\n\n"
        "JSON schema:\n"
        "[\n"
        "  {\"action_text\":\"Review customer files\",\"evidence_needed\":\"Customer records\",\"owner_role\":\"Compliance Officer\",\"priority\":\"High\"}\n"
        "]\n\n"
        f"REQUIREMENT:\n{requirement_text}\n\n"
        "JSON:"
    )

    raw = ollama_generate(prompt, model=model)

    print("\n=== RAW ACTION EXTRACTION OUTPUT START ===")
    print(raw)
    print("=== RAW ACTION EXTRACTION OUTPUT END ===\n")

    try:
        data = _extract_json(raw)
    except Exception as e:
        print("\n=== ACTION EXTRACTION PARSE ERROR START ===")
        print(str(e))
        print("=== ACTION EXTRACTION PARSE ERROR END ===\n")
        return []

    print("\n=== PARSED ACTIONS START ===")
    print(data)
    print("=== PARSED ACTIONS END ===\n")

    cleaned: list[dict] = []

    for item in data:
        if not isinstance(item, dict):
            continue

        at = " ".join(str(item.get("action_text") or "").split()).strip()
        if not at:
            continue

        evidence = " ".join(str(item.get("evidence_needed") or "").split()).strip() or None
        owner = " ".join(str(item.get("owner_role") or "").split()).strip() or None
        priority = " ".join(str(item.get("priority") or "Medium").split()).strip() or "Medium"

        if priority not in {"Low", "Medium", "High"}:
            priority = "Medium"

        cleaned.append({
            "action_text": at,
            "evidence_needed": evidence,
            "owner_role": owner,
            "priority": priority,
        })

    return cleaned



