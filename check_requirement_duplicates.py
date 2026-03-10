import sqlite3

conn = sqlite3.connect(r"C:\RIAAS\backend\data\riaas.db")
rows = conn.execute("""
SELECT requirement_text, COUNT(*) as cnt
FROM requirements
GROUP BY requirement_text
HAVING COUNT(*) > 1
ORDER BY cnt DESC, requirement_text
""").fetchall()

print("Duplicate requirement texts:", len(rows))
for row in rows:
    print(row)

conn.close()
