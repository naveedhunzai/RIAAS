$DatabasePath = "C:\RIAAS\backend\data\riaas.db"

if (!(Test-Path $DatabasePath)) {
  Write-Host "Database not found at: $DatabasePath" -ForegroundColor Red
  exit 1
}

$py = @"
import sqlite3, json

db = r"$DatabasePath"
con = sqlite3.connect(db)
cur = con.cursor()

def q(sql, params=()):
    cur.execute(sql, params)
    return cur.fetchall()

print("DB:", db)

# 1) List tables
tables = [r[0] for r in q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")]
print("\nTABLES (" + str(len(tables)) + "):")
for t in tables:
    print("  -", t)

# 2) For each table, list columns (PRAGMA table_info)
def table_info(t):
    rows = q(f"PRAGMA table_info({t});")
    # cid, name, type, notnull, dflt_value, pk
    return rows

def table_sql(t):
    row = q("SELECT sql FROM sqlite_master WHERE type='table' AND name=?;", (t,))
    return row[0][0] if row and row[0] else None

# 3) Print schema details for actions + any update-like tables
targets = []
for t in tables:
    name = t.lower()
    if t == "actions" or "action" in name or "update" in name or "history" in name or "log" in name:
        targets.append(t)

if "actions" not in targets and "actions" in tables:
    targets.insert(0, "actions")

print("\nSCHEMA DETAILS (focused):")
if not targets:
    print("  (No actions/update-like tables found)")
else:
    for t in targets:
        print("\n==", t, "==")
        cols = table_info(t)
        if not cols:
            print("  (no columns found)")
            continue
        print("  Columns:")
        for cid, name, ctype, notnull, dflt, pk in cols:
            print(f"   - {name} {ctype or ''}".rstrip() + (" NOT NULL" if notnull else "") + (f" DEFAULT {dflt}" if dflt is not None else "") + (" PK" if pk else ""))

        # indexes
        idx = q(f"PRAGMA index_list({t});")  # seq, name, unique, origin, partial
        if idx:
            print("  Indexes:")
            for seq, iname, unique, origin, partial in idx:
                print(f"   - {iname} (unique={unique}, origin={origin}, partial={partial})")
                icols = q(f"PRAGMA index_info({iname});")  # seqno, cid, name
                if icols:
                    print("     cols:", ", ".join([r[2] for r in icols]))

        # create SQL (first ~500 chars)
        sql = table_sql(t)
        if sql:
            s = sql.replace("\n"," ").strip()
            print("  Create SQL:", (s[:500] + ("..." if len(s) > 500 else "")))

# 4) Show a sample row from actions (keys only + a few values)
if "actions" in tables:
    print("\nACTIONS SAMPLE ROW:")
    try:
        row = q("SELECT * FROM actions LIMIT 1;")
        if not row:
            print("  (actions table has 0 rows)")
        else:
            cols = [r[1] for r in table_info("actions")]
            data = dict(zip(cols, row[0]))
            # print only first 25 keys for readability
            keys = list(data.keys())
            print("  Columns count:", len(keys))
            for k in keys[:25]:
                print(f"   - {k}: {data.get(k)}")
            if len(keys) > 25:
                print("   ... (more columns not shown)")
    except Exception as e:
        print("  ERROR reading sample row:", e)

# 5) Heuristic: see if there is a separate update/history table linked to actions
print("\nRELATIONSHIP HINTS:")
candidates = [t for t in tables if "update" in t.lower() or "history" in t.lower() or "log" in t.lower()]
if candidates:
    for t in candidates:
        cols = [r[1].lower() for r in table_info(t)]
        link_cols = [c for c in cols if "action" in c and ("id" in c or c.endswith("_id"))]
        if link_cols:
            print(f"  {t} likely links to actions via: {', '.join(link_cols)}")
else:
    print("  No obvious update/history tables found.")

con.close()
"@

python -c $py
