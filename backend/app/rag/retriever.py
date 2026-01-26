from pathlib import Path
import chromadb
from chromadb.config import Settings

from app.config import VECTOR_DB_DIR

def get_collection(name: str = "riaas_docs"):
    db_path = str(Path(VECTOR_DB_DIR))
    client = chromadb.PersistentClient(path=db_path, settings=Settings(anonymized_telemetry=False))

    # get_or_create_collection is safer when you rerun
    return client.get_or_create_collection(name=name)

def upsert_chunks(collection, chunks: list[dict], embeddings):
    ids = [f"{c['source']}::p{c['page']}::i{i}" for i, c in enumerate(chunks)]
    documents = [c["text"] for c in chunks]
    metadatas = [{"source": c["source"], "page": c["page"]} for c in chunks]

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings.tolist() if hasattr(embeddings, "tolist") else embeddings
    )
