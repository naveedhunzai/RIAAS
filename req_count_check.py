import sqlite3, json

db = r'''/Users/aaronnaveed/RIAAS/backend/data/riaas.db'''
conn = sqlite3.connect(db)
cur = conn.cursor()

out = {}

cur.execute("select count(*) from requirements")
out["db_count"] = cur.fetchone()[0]

cur.execute("select id, requirement_text from requirements order by id desc limit 5")
out["latest_5"] = cur.fetchall()

conn.close()
print(json.dumps(out, indent=2))
