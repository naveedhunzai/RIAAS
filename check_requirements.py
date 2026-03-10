import sqlite3

db = r"C:\RIAAS\backend\data\riaas.db"
conn = sqlite3.connect(db)

tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", tables)

rows = conn.execute("SELECT id, requirement_text, modality, category, source, page, citation_id, created_at FROM requirements ORDER BY id DESC").fetchall()
print("Total requirements:", len(rows))
print("-" * 100)

for row in rows:
    print(row)

conn.close()
