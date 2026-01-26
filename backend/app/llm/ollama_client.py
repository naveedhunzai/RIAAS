import requests
from backend.app.core.config import settings

def generate(prompt: str, timeout: int = 120) -> str:
    url = f"{settings.OLLAMA_HOST}/api/generate"
    payload = {"model": settings.MODEL, "prompt": prompt, "stream": False}
    r = requests.post(url, json=payload, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    return data.get("response", "")

