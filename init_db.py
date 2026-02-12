import sqlite3

with open("schema.sql", "r", encoding="utf-8") as f:
    sql = f.read()

conn = sqlite3.connect("chariot.db")
cursor = conn.cursor()
cursor.executescript(sql)
conn.commit()
conn.close()

print("Base SQLite créée ")
