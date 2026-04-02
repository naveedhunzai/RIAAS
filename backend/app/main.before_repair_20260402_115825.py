from .routes import upload
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .rag.qa import retrieve_context
from pathlib import Path
import hashlib
from app.rag.ollama_client import ollama_generate
from app.db.sqlite_db import (
    init_db,
    insert_requirement,
    list_requirements,
    get_requirement,
    insert_action,
    list_actions,
    update_action_status,
    is_document_ingested,
    insert_ingested_document,
    list_ingested_documents,
    get_ingested_document_by_path,
    mark_document_inactive,
    reactivate_document,
)
from app.rag.extractor import extract_requirements_from_context, extract_actions_for_requirement

from app.config import RAW_DOCS_DIR
from app.ingest.loader import load_pdf_files
from app.ingest.chunker import chunk_documents
from app.ingest.embedder import embed_chunks
from app.rag.retriever import get_collection, upsert_chunks
from app.rag.retriever import delete_by_source
from app.rag.qa import retrieve_clean

app = FastAPI(title="RIAAS Backend", version="0.1.0")


app.include_router(upload.router)
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
init_db()


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
    status: str


def compute_file_hash(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()


@app.post("/ingest")
def ingest():
    folder = Path(RAW_DOCS_DIR)
    pdf_files = list(folder.glob("*.pdf"))

    if not pdf_files:
        raise HTTPException(
            status_code=400,
            detail="No PDFs found in backend/data/raw_docs/"
        )

    current_paths = {str(p) for p in pdf_files}
    tracked_docs = list_ingested_documents(limit=5000)

    missing_files = []
    for doc in tracked_docs:
        tracked_path = doc["file_path"]
        if doc.get("is_active", 1) == 1 and tracked_path not in current_paths:
            mark_document_inactive(tracked_path)
            missing_files.append(tracked_path)

    new_files = []
    skipped_files = []
    changed_files = []

    for pdf_path in pdf_files:
        file_hash = compute_file_hash(pdf_path)
        existing = get_ingested_document_by_path(str(pdf_path))

        if existing is None:
            new_files.append(pdf_path)
            continue

        if existing["file_hash"] == file_hash:
            reactivate_document(str(pdf_path))
            skipped_files.append(pdf_path.name)
        else:
            new_files.append(pdf_path)
            changed_files.append(pdf_path.name)

    if not new_files:
    # === AUTO REQUIREMENT EXTRACTION ===
    try:
        should_extract = bool(new_files or changed_files)

        if should_extract:
            extract_result = extract_requirements(
                topic="all compliance requirements in the document including governance, monitoring, reporting, internal controls, CIP, and BSA program obligations",
                top_k=50,
                model="gemma3:4b"
            )
            print("✅ Requirements extracted automatically after ingestion:", extract_result)
        else:
            print("ℹ️ No new or changed files. Automatic extraction skipped.")

    except Exception as e:
        print(f"⚠️ Requirement extraction failed after ingestion: {e}")

        return {
            "message": "No new or changed PDFs found. Existing indexed files were skipped.",
            "loaded_pages": 0,
            "total_chunks": 0,
            "new_files": [],
            "changed_files": changed_files,
            "skipped_files": skipped_files,
            "missing_files": missing_files,
        }

    docs = load_pdf_files(new_files)
    if not docs:
        raise HTTPException(
            status_code=400,
            detail="No readable PDF text found in new or changed files."
        )

    chunks = chunk_documents(docs, chunk_size=800, overlap=150)
    embeddings = embed_chunks(chunks)

    collection = get_collection()

    # Remove vectors for changed files
    for fname in changed_files:
        delete_by_source(collection, fname)
    upsert_chunks(collection, chunks, embeddings)

    for pdf_path in new_files:
        insert_ingested_document(
            file_name=pdf_path.name,
            file_path=str(pdf_path),
            file_hash=compute_file_hash(pdf_path),
            last_modified=str(pdf_path.stat().st_mtime),
        )

    return {
        "message": "Incremental ingestion completed.",
        "loaded_pages": len(docs),
        "total_chunks": len(chunks),
        "new_files": [p.name for p in new_files if p.name not in changed_files],
        "changed_files": changed_files,
        "skipped_files": skipped_files,
        "missing_files": missing_files,
    }


@app.get("/ingested-documents")
def ingested_documents(limit: int = 200):
    return {"items": list_ingested_documents(limit=limit)}


@app.get("/ask")
def ask(question: str, top_k: int = 5):
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    return {
        "question": question,
        "top_k": top_k,
        "results": retrieve_clean(question, top_k=top_k)
    }


@app.post("/answer")
def answer(req: AnswerRequest):
    q = (req.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    contexts, citations = retrieve_context(q, top_k=req.top_k)
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
        "top_k": req.top_k,
        "answer": response_text,
        "citations": citations,
        "sources": sources
    }


@app.post("/extract-requirements")
def extract_requirements(req: ExtractRequirementsRequest):
    topic = (req.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="topic cannot be empty")

    contexts, citations = retrieve_context(topic, top_k=req.top_k)
    if not contexts:
        raise HTTPException(status_code=404, detail="No context retrieved. Run /ingest first.")

    extracted = extract_requirements_from_context(topic, contexts, model=req.model)

    cite_map = {c["id"]: (c["source"], c["page"]) for c in citations}

    saved_ids = []
    for r in extracted:
        cid = r.get("citation_id")
        source, page = (None, None)
        if cid in cite_map:
            source, page = cite_map[cid]
        elif citations:
            source = citations[0].get("source")
            page = citations[0].get("page")

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
        "saved_requirement_ids": saved_ids
    }


@app.get("/requirements")
def requirements(limit: int = 100, offset: int = 0):
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

    action_ids = []
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
    return {"items": list_actions(req_id=req_id, status=status, limit=limit)}


@app.patch("/actions/{action_id}")
def set_action_status(action_id: int, body: UpdateActionStatusRequest):
    s = (body.status or "").strip()
    allowed = {"Open", "In Progress", "Done"}
    if s not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of: {sorted(allowed)}")

    update_action_status(action_id, s)
    return {"action_id": action_id, "status": s}






from .db.sqlite_db import (
    get_ingested_document_by_id,
    list_requirement_ids_by_source,
    delete_actions_by_requirement_ids,
    delete_requirements_by_source,
    delete_ingested_document_by_id,
)
from .rag.retriever import get_collection
import os
@app.delete("/ingested-documents/{doc_id}")
def delete_ingested_document(doc_id: int):
    doc = get_ingested_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Ingested document not found")

    file_name = doc.get("file_name")
    file_path = doc.get("file_path")

    requirement_ids = list_requirement_ids_by_source(file_name)
    deleted_actions = delete_actions_by_requirement_ids(requirement_ids)
    deleted_requirements = delete_requirements_by_source(file_name)

    deleted_vectors = 0
    vector_error = None
    try:
        collection = get_collection()
        before = collection.count()
        collection.delete(where={"source": file_name})
        after = collection.count()
        deleted_vectors = max(0, before - after)
    except Exception as e:
        vector_error = str(e)

    deleted_file = False
    file_delete_error = None
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            deleted_file = True
    except Exception as e:
        file_delete_error = str(e)

    deleted_document = delete_ingested_document_by_id(doc_id)

    return {
        "deleted_document_id": doc_id,
        "file_name": file_name,
        "deleted_document_rows": deleted_document,
        "deleted_requirements": deleted_requirements,
        "deleted_actions": deleted_actions,
        "deleted_vectors": deleted_vectors,
        "deleted_file": deleted_file,
        "vector_error": vector_error,
        "file_delete_error": file_delete_error,
    }




