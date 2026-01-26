import requests
from backend.app.core.config import settings

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
        "options": {"temperature": temperature},
    }

    r = requests.post(url, json=payload, timeout=timeout)
    r.raise_for_status()
    return r.json().get("response", "").strip()

if __name__ == "__main__":
    print(ollama_generate("Explain SAR safe harbor in one sentence."))

