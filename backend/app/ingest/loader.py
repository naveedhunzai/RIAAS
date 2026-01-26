from pathlib import Path
from pypdf import PdfReader

def load_pdfs(folder_path: str | Path):
    folder = Path(folder_path)
    documents = []

    for pdf_path in folder.glob("*.pdf"):
        reader = PdfReader(str(pdf_path))
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                documents.append({
                    "text": text,
                    "source": pdf_path.name,
                    "page": i + 1
                })

    return documents
