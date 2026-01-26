from sentence_transformers import SentenceTransformer

_MODEL = None

def get_model(model_name: str = "all-MiniLM-L6-v2"):
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(model_name)
    return _MODEL


def embed_chunks(chunks: list[dict], model_name: str = "all-MiniLM-L6-v2"):
    model = get_model(model_name)
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    return embeddings
