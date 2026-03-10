import os

def validate_settings() -> None:
    # Keep it minimal and portable; add required env keys later.
    required = []
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
