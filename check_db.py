import sqlite3

conn = sqlite3.connect("chariot.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("Tables présentes:")
for t in tables:
    print("-", t[0])

conn.close()
