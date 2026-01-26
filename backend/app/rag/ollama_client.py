import requests

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

def ollama_generate(prompt: str, model: str = "gemma3:1b") -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2}
    }
    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    return r.json().get("response", "").strip()
