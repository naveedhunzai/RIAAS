import sqlite3
from app.core.config import settings

def connect():
    return sqlite3.connect(str(settings.SQLITE_PATH))


