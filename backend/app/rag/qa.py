from .retriever import get_collection

def retrieve(question: str, top_k: int = 5):
    """Raw Chroma results (kept for debugging)."""
    collection = get_collection()
    return collection.query(query_texts=[question], n_results=top_k)

def retrieve_clean(question: str, top_k: int = 5):
    """Clean list of results for API responses."""
    r = retrieve(question, top_k=top_k)

    docs = r.get("documents", [[]])[0]
    metas = r.get("metadatas", [[]])[0]

    cleaned = []
    for doc, meta in zip(docs, metas):
        cleaned.append({
            "source": meta.get("source"),
            "page": meta.get("page"),
            "snippet": (doc or "")[:350]
        })
    return cleaned

def retrieve_context(question: str, top_k: int = 5):
    """Context blocks + citations for LLM prompting (deduped by source+page)."""
    r = retrieve(question, top_k=top_k)

    docs = r.get("documents", [[]])[0]
    metas = r.get("metadatas", [[]])[0]

    seen = set()
    contexts = []
    citations = []

    for doc, meta in zip(docs, metas):
        source = meta.get("source")
        page = meta.get("page")
        key = (source, page)

        if key in seen:
            continue
        seen.add(key)

        text = (doc or "").strip()

        contexts.append(
            f"[{len(contexts)+1}] SOURCE: {source} | PAGE: {page}\n{text}"
        )
        citations.append(
            {"id": len(citations)+1, "source": source, "page": page}
        )

    return contexts, citations

def retrieve_context_for_source(question: str, source: str, top_k: int = 5):
    """Context blocks + citations for one specific document source only."""
    collection = get_collection()
    r = collection.query(
        query_texts=[question],
        n_results=top_k,
        where={"source": source},
    )

    docs = r.get("documents", [[]])[0]
    metas = r.get("metadatas", [[]])[0]

    seen = set()
    contexts = []
    citations = []

    for doc, meta in zip(docs, metas):
        src = meta.get("source")
        page = meta.get("page")
        key = (src, page)

        if key in seen:
            continue
        seen.add(key)

        text = (doc or "").strip()

        contexts.append(
            f"[{len(contexts)+1}] SOURCE: {src} | PAGE: {page}\n{text}"
        )
        citations.append(
            {"id": len(citations)+1, "source": src, "page": page}
        )

    return contexts, citations

