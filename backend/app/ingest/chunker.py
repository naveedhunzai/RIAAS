def clean_text(s: str) -> str:
    if not s:
        return ""
    # common PDF encoding artifacts
    return (s.replace("â€™", "'")
             .replace("â€œ", '"')
             .replace("â€", '"')
             .replace("â€“", "-")
             .replace("â€”", "-")
             .replace("\u00a0", " ")
             .strip())

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150):
    if chunk_size <= overlap:
        raise ValueError("chunk_size must be greater than overlap")

    chunks = []
    start = 0
    n = len(text)

    while start < n:
        end = min(start + chunk_size, n)
        chunks.append(text[start:end])
        start += (chunk_size - overlap)

    return chunks


def chunk_documents(docs: list[dict], chunk_size: int = 800, overlap: int = 150):
    all_chunks = []
    for d in docs:
        text = clean_text(d["text"])
        for c in chunk_text(text, chunk_size=chunk_size, overlap=overlap):
            all_chunks.append({
                "text": c,
                "source": d["source"],
                "page": d["page"],
            })
    return all_chunks
