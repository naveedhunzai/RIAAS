import sqlite3
from app.db.sqlite_db import DB_PATH

print("DB PATH:", DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("TABLES:", tables)

conn.close()