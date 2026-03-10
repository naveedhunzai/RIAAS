import sqlite3

conn = sqlite3.connect(r"C:\RIAAS\backend\data\riaas.db")
rows = conn.execute("SELECT id, file_name, is_active FROM ingested_documents ORDER BY id").fetchall()

print("Total ingested docs:", len(rows))
for row in rows:
    print(row)

conn.close()
