from pathlib import Path
import os
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings:
    # App
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Ollama
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    MODEL: str = os.getenv("MODEL", "gemma3:1b")

    # Storage
    CHROMA_PATH: Path = BASE_DIR / os.getenv("CHROMA_PATH", "vector_db")
    SQLITE_PATH: Path = BASE_DIR / os.getenv("SQLITE_PATH", "data/riaas.db")

settings = Settings()
