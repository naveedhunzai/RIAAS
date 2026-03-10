from chromadb import PersistentClient
from backend.app.core.config import settings

def get_chroma_client():
    return PersistentClient(path=str(settings.CHROMA_PATH))

