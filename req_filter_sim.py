import sqlite3, json

db = r'''/Users/aaronnaveed/RIAAS/backend/data/riaas.db'''
conn = sqlite3.connect(db)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("select * from requirements order by id desc")
rows = [dict(r) for r in cur.fetchall()]

def to_id(r):
    return r.get("id") or r.get("req_id") or r.get("reqId")

def to_requirement_text(r):
    return r.get("requirement_text") or r.get("requirement") or r.get("text") or r.get("summary") or r.get("title") or ""

def to_category(r):
    return r.get("category") or r.get("reg_category") or r.get("domain") or r.get("type") or ""

def to_modality(r):
    return r.get("modality") or r.get("mode") or r.get("channel") or ""

def to_status(r):
    return r.get("status") or r.get("state") or ""

mapped = []
for r in rows:
    mapped.append({
        **r,
        "__id": to_id(r),
        "__text": to_requirement_text(r),
        "__category": to_category(r),
        "__modality": to_modality(r),
        "__status": to_status(r),
    })

# Simulate default UI state:
# category = "All", modality = "All", status = "All", query = ""
filtered = []
for r in mapped:
    if "All" != "All" and str(r["__category"]) != "All":
        continue
    if "All" != "All" and str(r["__modality"]) != "All":
        continue
    if "All" != "All" and str(r["__status"]) != "All":
        continue

    haystack = " ".join([
        str(r.get("__id") or ""),
        str(r.get("__text") or ""),
        str(r.get("__category") or ""),
        str(r.get("__modality") or ""),
        str(r.get("__status") or ""),
        str(r.get("source") or ""),
        str(r.get("page") or ""),
    ]).lower()

    query = ""
    if query and query not in haystack:
        continue

    filtered.append(r)

out = {
    "db_rows": len(rows),
    "filtered_default_ui_rows": len(filtered),
    "first_5_ids": [r["__id"] for r in filtered[:5]],
    "last_5_ids": [r["__id"] for r in filtered[-5:]],
}
print(json.dumps(out, indent=2))
conn.close()
