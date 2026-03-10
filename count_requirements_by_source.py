import sqlite3

conn = sqlite3.connect(r"C:\RIAAS\backend\data\riaas.db")
rows = conn.execute("""
SELECT COALESCE(source, 'NULL') as source, COUNT(*) as cnt
FROM requirements
GROUP BY COALESCE(source, 'NULL')
ORDER BY cnt DESC
""").fetchall()

for row in rows:
    print(row)

conn.close()
