from __future__ import annotations

from typing import List, Callable, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.rbac import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> Dict[str, Any]:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid/expired token")

    return {
        "email": payload.get("sub", ""),
        "roles": payload.get("roles", []) or [],
    }


def require_roles(*allowed: str) -> Callable:
    allowed_set = {a.strip().lower() for a in allowed if a and a.strip()}

    def _dep(user=Depends(get_current_user)):
        roles = {r.strip().lower() for r in (user.get("roles") or [])}
        if not roles.intersection(allowed_set):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _dep


