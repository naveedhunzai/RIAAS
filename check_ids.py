import sqlite3, json

db = r'''/Users/aaronnaveed/RIAAS/backend/data/riaas.db'''
conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute("SELECT id FROM requirements ORDER BY id")
ids = [row[0] for row in cur.fetchall()]

total = len(ids)
min_id = min(ids) if ids else None
max_id = max(ids) if ids else None

gaps = []
for i in range(len(ids) - 1):
    if ids[i+1] != ids[i] + 1:
        gaps.append((ids[i], ids[i+1]))

cur.execute("SELECT id, requirement_text FROM requirements ORDER BY id LIMIT 10")
sample_start = cur.fetchall()

cur.execute("SELECT id, requirement_text FROM requirements ORDER BY id DESC LIMIT 10")
sample_end = cur.fetchall()

out = {
    "total_requirements": total,
    "min_id": min_id,
    "max_id": max_id,
    "expected_if_continuous": (max_id - min_id + 1) if max_id else 0,
    "gap_count": len(gaps),
    "gaps": gaps[:10],
    "sample_start": sample_start,
    "sample_end": sample_end
}

print(json.dumps(out, indent=2))

conn.close()
