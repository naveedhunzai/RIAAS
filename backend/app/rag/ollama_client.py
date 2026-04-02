import requests
from app.core.config import settings

def ollama_generate(
    prompt: str,
    model: str | None = None,
    timeout: int = 120,
    temperature: float = 0.2
) -> str:
    url = f"{settings.OLLAMA_HOST}/api/generate"

    payload = {
        "model": model or settings.MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature
        }
    }

    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()

    data = response.json()
    return data.get("response", "").strip()


