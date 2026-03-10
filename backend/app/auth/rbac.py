from __future__ import annotations

import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional, List, Dict, Any

import jwt
from passlib.context import CryptContext


# ----------------------------
# Config (env-driven)
# ----------------------------
SQLITE_PATH = os.getenv("SQLITE_PATH", "./data/riaas.db")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-env")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "480"))  # 8 hours default

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ----------------------------
# DB helpers
# ----------------------------
def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_auth_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE,
              full_name TEXT,
              password_hash TEXT NOT NULL,
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS roles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS user_roles (
              user_id INTEGER NOT NULL,
              role_id INTEGER NOT NULL,
              PRIMARY KEY (user_id, role_id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            );
            """
        )

        # seed base roles
        for r in ["admin", "reviewer", "analyst", "viewer"]:
            conn.execute("INSERT OR IGNORE INTO roles(name) VALUES (?)", (r,))
        conn.commit()


# ----------------------------
# Core RBAC operations
# ----------------------------
def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_ctx.verify(password, password_hash)


def create_user(email: str, password: str, full_name: str = "", is_active: bool = True) -> int:
    init_auth_db()
    now = datetime.now(timezone.utc).isoformat()
    ph = hash_password(password)
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO users(email, full_name, password_hash, is_active, created_at) VALUES (?,?,?,?,?)",
            (email.lower().strip(), full_name.strip(), ph, 1 if is_active else 0, now),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    init_auth_db()
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
        return dict(row) if row else None


def get_user_roles(user_id: int) -> List[str]:
    init_auth_db()
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT r.name
            FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
            ORDER BY r.name
            """,
            (user_id,),
        ).fetchall()
        return [str(r["name"]) for r in rows]


def assign_roles(email: str, roles: Iterable[str]) -> None:
    init_auth_db()
    u = get_user_by_email(email)
    if not u:
        raise ValueError(f"User not found: {email}")

    roles_clean = sorted({r.strip().lower() for r in roles if r and r.strip()})
    if not roles_clean:
        return

    with _connect() as conn:
        # ensure roles exist
        for r in roles_clean:
            conn.execute("INSERT OR IGNORE INTO roles(name) VALUES (?)", (r,))

        # attach
        for r in roles_clean:
            role_row = conn.execute("SELECT id FROM roles WHERE name=?", (r,)).fetchone()
            if not role_row:
                continue
            conn.execute(
                "INSERT OR IGNORE INTO user_roles(user_id, role_id) VALUES (?,?)",
                (u["id"], role_row["id"]),
            )
        conn.commit()


def authenticate(email: str, password: str) -> Optional[Dict[str, Any]]:
    u = get_user_by_email(email)
    if not u:
        return None
    if int(u["is_active"]) != 1:
        return None
    if not verify_password(password, u["password_hash"]):
        return None
    roles = get_user_roles(int(u["id"]))
    return {"id": int(u["id"]), "email": u["email"], "full_name": u.get("full_name") or "", "roles": roles}


# ----------------------------
# JWT
# ----------------------------
def create_access_token(sub: str, roles: List[str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,  # typically email
        "roles": roles,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MIN)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
