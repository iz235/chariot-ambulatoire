import sqlite3

conn = sqlite3.connect('chariot.db')
cursor = conn.cursor()

try:
    cursor.execute(
        "INSERT INTO infirmiers (nurse_id, last_name, first_name, password) VALUES (?, ?, ?, ?)",
        ('ITS', 'Maasar', 'Izadine', 'Vitrygtr')
    )
    conn.commit()
    print(f"✅ Infirmier créé avec succès!")
    print(f"   ID        : ITS")
    print(f"   Nom       : Maasar")
    print(f"   Prénom    : Izadine")
    print(f"   Mot passe : Vitrygtr")
except sqlite3.IntegrityError as e:
    print(f"⚠️  Erreur : {e}")
    print("L'ID 'ITS' existe peut-être déjà.")
finally:
    conn.close()
