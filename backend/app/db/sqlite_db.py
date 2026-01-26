import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, Any

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "riaas.db"  # backend/data/riaas.db


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        cur = conn.cursor()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requirement_text TEXT NOT NULL,
            modality TEXT,                 -- MUST/SHALL/PROHIBITED/SHOULD
            category TEXT,                 -- Reporting/Recordkeeping/Training/etc.
            source TEXT,
            page INTEGER,
            citation_id INTEGER,           -- [1], [2] etc from retrieve_context
            created_at TEXT NOT NULL
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requirement_id INTEGER NOT NULL,
            action_text TEXT NOT NULL,
            evidence_needed TEXT,
            owner_role TEXT,
            priority TEXT,                 -- Low/Medium/High
            status TEXT NOT NULL,           -- Open/In Progress/Done
            created_at TEXT NOT NULL,
            FOREIGN KEY(requirement_id) REFERENCES requirements(id)
        )
        """)

        conn.commit()


def insert_requirement(
    requirement_text: str,
    modality: Optional[str],
    category: Optional[str],
    source: Optional[str],
    page: Optional[int],
    citation_id: Optional[int],
) -> int:
    with get_conn() as conn:
        cur = conn.cursor()

        # 🔎 Check for duplicate (same text + source + page)
        row = cur.execute("""
            SELECT id FROM requirements
            WHERE requirement_text = ?
              AND source IS ?
              AND page IS ?
        """, (
            requirement_text.strip(),
            source,
            page,
        )).fetchone()

        if row:
            # Duplicate found → return existing ID
            return int(row["id"])

        # ➕ Insert new requirement
        cur.execute("""
            INSERT INTO requirements (
                requirement_text, modality, category, source, page, citation_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            requirement_text.strip(),
            modality,
            category,
            source,
            page,
            citation_id,
            datetime.utcnow().isoformat(),
        ))

        conn.commit()
        return int(cur.lastrowid)

def list_requirements(limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM requirements
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """, (limit, offset)).fetchall()
        return [dict(r) for r in rows]


def get_requirement(req_id: int) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM requirements WHERE id = ?", (req_id,)).fetchone()
        return dict(row) if row else None


def insert_action(
    requirement_id: int,
    action_text: str,
    evidence_needed: Optional[str],
    owner_role: Optional[str],
    priority: Optional[str],
) -> int:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO actions (requirement_id, action_text, evidence_needed, owner_role, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'Open', ?)
        """, (
            requirement_id,
            action_text.strip(),
            evidence_needed,
            owner_role,
            priority,
            datetime.utcnow().isoformat(),
        ))
        conn.commit()
        return int(cur.lastrowid)


def list_actions(req_id: Optional[int] = None, status: Optional[str] = None, limit: int = 200) -> list[dict[str, Any]]:
    q = "SELECT * FROM actions WHERE 1=1"
    params = []
    if req_id is not None:
        q += " AND requirement_id = ?"
        params.append(req_id)
    if status is not None:
        q += " AND status = ?"
        params.append(status)
    q += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    with get_conn() as conn:
        rows = conn.execute(q, tuple(params)).fetchall()
        return [dict(r) for r in rows]


def update_action_status(action_id: int, status: str) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE actions SET status = ? WHERE id = ?", (status, action_id))
        conn.commit()
