from pydantic import BaseModel


class SettingsPayload(BaseModel):
    model: str = "gemma3:1b"
    temperature: float = 0.2
    top_k: int = 10
    max_context_chunks: int = 25
    chunk_size: int = 800
    chunk_overlap: int = 100
    auto_extract: bool = True
    confirm_generate_actions: bool = True
    show_citations: bool = True
    compact_mode: bool = False
from pathlib import Path
import json

SETTINGS_FILE = Path("backend/data/settings.json")


def load_settings():
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "model": "gemma3:1b",
        "temperature": 0.2,
        "top_k": 10,
        "max_context_chunks": 25,
        "chunk_size": 800,
        "chunk_overlap": 100,
        "auto_extract": True,
        "confirm_generate_actions": True,
        "show_citations": True,
        "compact_mode": False,
    }


def save_settings(data):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_runtime_settings():
    raw = load_settings() or {}
    return {
        "model": raw.get("model", "gemma3:1b"),
        "temperature": raw.get("temperature", 0.2),
        "top_k": int(raw.get("top_k", 10)),
        "max_context_chunks": int(raw.get("max_context_chunks", 25)),
        "chunk_size": int(raw.get("chunk_size", 800)),
        "chunk_overlap": int(raw.get("chunk_overlap", 100)),
        "auto_extract": bool(raw.get("auto_extract", True)),
        "confirm_generate_actions": bool(raw.get("confirm_generate_actions", True)),
        "show_citations": bool(raw.get("show_citations", True)),
        "compact_mode": bool(raw.get("compact_mode", False)),
    }


def resolve_param(request_value, settings_value):
    return settings_value if request_value is None else request_value

