from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]   # ...\backend
DATA_DIR = BASE_DIR / "data"
RAW_DOCS_DIR = DATA_DIR / "raw_docs"
VECTOR_DB_DIR = DATA_DIR / "vector_db"

RAW_DOCS_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
