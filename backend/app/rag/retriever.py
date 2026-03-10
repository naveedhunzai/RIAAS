from chromadb import PersistentClient
from backend.app.config import VECTOR_DB_DIR

def get_collection():
    client = PersistentClient(path=str(VECTOR_DB_DIR))
    return client.get_or_create_collection("riaas_documents")

def upsert_chunks(collection, chunks, embeddings):
    ids = []
    docs = []
    metas = []

    for i, chunk in enumerate(chunks):
        ids.append(f"{chunk['source']}_{chunk['page']}_{i}")
        docs.append(chunk["text"])
        metas.append({
            "source": chunk["source"],
            "page": chunk["page"]
        })

    collection.upsert(
        ids=ids,
        documents=docs,
        embeddings=embeddings,
        metadatas=metas
    )

def delete_by_source(collection, source_name):
    results = collection.get(
        where={"source": source_name}
    )

    if results and results.get("ids"):
        collection.delete(ids=results["ids"])
