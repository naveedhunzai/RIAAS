from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.app.core.validate_env import validate_settings
from backend.app.core.config import settings

from backend.app.rag.qa import retrieve_context, retrieve_clean
from backend.app.rag.ollama_client import ollama_generate
from backend.app.rag.extractor import extract_requirements_from_context, extract_actions_for_requirement

from backend.app.db.sqlite_db import (
    init_db,
    insert_requirement,
    list_requirements,
    get_requirement,
    insert_action,
    list_actions,
    update_action_status,
)

from backend.app.config import RAW_DOCS_DIR
from backend.app.ingest.loader import load_pdfs
from backend.app.ingest.chunker import chunk_documents
from backend.app.ingest.embedder import embed_chunks
from backend.app.rag.retriever import get_collection, upsert_chunks


# -------------------------
# App init
# -------------------------
validate_settings()

app = FastAPI(
    title="RIAAS Backend",
    version="0.1.0",
    debug=(settings.APP_ENV == "dev"),
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Run DB init on startup (reload-safe)
@app.on_event("startup")
def _startup():
    init_db()


# -------------------------
# Schemas
# -------------------------
class IngestResponse(BaseModel):
    loaded_pages: int
    total_chunks: int


class AnswerRequest(BaseModel):
    question: str
    top_k: int = 5
    model: str = "gemma3:1b"


class AskResponse(BaseModel):
    question: str
    top_k: int
    results: list[dict]


class ExtractRequirementsRequest(BaseModel):
    topic: str
    top_k: int = 8
    model: str = "gemma3:1b"


class CreateActionsRequest(BaseModel):
    model: str = "gemma3:1b"


class UpdateActionStatusRequest(BaseModel):
    status: str  # Open / In Progress / Done


# -------------------------
# Endpoints
# -------------------------
@app.post("/ingest", response_model=IngestResponse)
def ingest():
    docs = load_pdfs(RAW_DOCS_DIR)
    if not docs:
        raise HTTPException(
            status_code=400,
            detail="No PDF text loaded. Put PDFs in backend/data/raw_docs/",
        )

    chunks = chunk_documents(docs, chunk_size=800, overlap=150)
    embeddings = embed_chunks(chunks)

    collection = get_collection()
    upsert_chunks(collection, chunks, embeddings)

    return IngestResponse(loaded_pages=len(docs), total_chunks=len(chunks))


@app.get("/ask", response_model=AskResponse)
def ask(question: str, top_k: int = 5):
    q = (question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    top_k = max(1, min(top_k, 20))

    return AskResponse(
        question=q,
        top_k=top_k,
        results=retrieve_clean(q, top_k=top_k),
    )


@app.post("/answer")
def answer(req: AnswerRequest):
    q = (req.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    top_k = max(1, min(req.top_k, 20))

    contexts, citations = retrieve_context(q, top_k=top_k)
    if not contexts:
        raise HTTPException(status_code=404, detail="No context retrieved. Run /ingest first.")

    prompt = (
        "You are a compliance assistant.\n"
        "IMPORTANT: Use ONLY the sources provided. Do NOT add any external facts.\n"
        "If a detail is not explicitly stated in the sources, say: Not found in provided documents.\n"
        "Do not mention CTRs or thresholds unless they appear in the sources.\n\n"
        "1) Summary: 2-3 sentences.\n"
        "2) Key points: 3 bullets max.\n"
        "3) Sources used: list citation IDs only, like [1], [2].\n\n"
        f"QUESTION:\n{q}\n\n"
        "SOURCES:\n" + "\n\n".join(contexts) + "\n\n"
        "ANSWER:"
    )

    response_text = ollama_generate(prompt, model=req.model)
    sources = [f"{c['source']} p{c['page']} ([{c['id']}])" for c in citations]

    return {
        "question": q,
        "model": req.model,
        "top_k": top_k,
        "answer": response_text,
        "citations": citations,
        "sources": sources,
    }


@app.post("/extract-requirements")
def extract_requirements(req: ExtractRequirementsRequest):
    topic = (req.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="topic cannot be empty")

    top_k = max(1, min(req.top_k, 30))

    # Retrieve context from vector DB
    contexts, citations = retrieve_context(topic, top_k=top_k)
    if not contexts:
        raise HTTPException(status_code=404, detail="No context retrieved. Run /ingest first.")

    # LLM extraction
    extracted = extract_requirements_from_context(topic, contexts, model=req.model)

    # Map citation_id -> (source,page)
    cite_map = {c["id"]: (c["source"], c["page"]) for c in citations}

    saved_ids: list[int] = []
    for r in extracted:
        cid = r.get("citation_id")
        source, page = (None, None)
        if cid in cite_map:
            source, page = cite_map[cid]

        new_id = insert_requirement(
            requirement_text=r["requirement_text"],
            modality=r.get("modality"),
            category=r.get("category"),
            source=source,
            page=page,
            citation_id=cid,
        )
        saved_ids.append(new_id)

    return {
        "topic": topic,
        "retrieved_citations": citations,
        "extracted_count": len(extracted),
        "saved_requirement_ids": saved_ids,
    }


@app.get("/requirements")
def requirements(limit: int = 100, offset: int = 0):
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    return {"items": list_requirements(limit=limit, offset=offset)}


@app.get("/requirements/{req_id}")
def requirement(req_id: int):
    r = get_requirement(req_id)
    if not r:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return r


@app.post("/requirements/{req_id}/actions")
def requirement_to_actions(req_id: int, req_body: CreateActionsRequest):
    r = get_requirement(req_id)
    if not r:
        raise HTTPException(status_code=404, detail="Requirement not found")

    actions = extract_actions_for_requirement(r["requirement_text"], model=req_body.model)

    action_ids: list[int] = []
    for a in actions:
        aid = insert_action(
            requirement_id=req_id,
            action_text=a["action_text"],
            evidence_needed=a.get("evidence_needed"),
            owner_role=a.get("owner_role"),
            priority=a.get("priority"),
        )
        action_ids.append(aid)

    return {"requirement_id": req_id, "created_action_ids": action_ids, "count": len(action_ids)}


@app.get("/actions")
def actions(req_id: int | None = None, status: str | None = None, limit: int = 200):
    limit = max(1, min(limit, 500))
    return {"items": list_actions(req_id=req_id, status=status, limit=limit)}


@app.patch("/actions/{action_id}")
def set_action_status(action_id: int, body: UpdateActionStatusRequest):
    s = (body.status or "").strip()
    allowed = {"Open", "In Progress", "Done"}
    if s not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of: {sorted(allowed)}")

    update_action_status(action_id, s)
    return {"action_id": action_id, "status": s}
