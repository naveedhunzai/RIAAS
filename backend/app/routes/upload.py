from pathlib import Path
import shutil

from fastapi import APIRouter, File, UploadFile

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RAW_DOCS_DIR = PROJECT_ROOT / "backend" / "data" / "raw_docs"
RAW_DOCS_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    saved_files = []

    for file in files:
        filename = file.filename or ""
        if not filename.lower().endswith(".pdf"):
            continue

        safe_name = Path(filename).name
        destination = RAW_DOCS_DIR / safe_name

        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_files.append(safe_name)

    return {
        "message": "Files uploaded successfully.",
        "saved_files": saved_files,
        "target_folder": str(RAW_DOCS_DIR)
    }
