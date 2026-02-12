// ================================
// API Backend - Chariot Ambulatoire
// ================================

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ➤ Servir les fichiers statiques du dossier "public" (UI)
const publicPath = path.join(__dirname, "public");
console.log("📁 Dossier public :", publicPath);
app.use(express.static(publicPath));

// =========================
// Connexion base SQLite
// =========================
const dbPath = path.join(__dirname, "chariot.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Erreur connexion SQLite :", err.message);
  } else {
    console.log("✅ Connecté à SQLite :", dbPath);
  }
});

// =========================
// ROUTES API
// =========================

// ----------------------------
// Historique des prescriptions reçues par un patient
// ----------------------------
app.get("/historique/patient/:patient_id", (req, res) => {
  const { patient_id } = req.params;
  if (!patient_id) return res.status(400).json({ error: "patient_id obligatoire" });
  // On suppose que la table administrations enregistre les actes reçus par le patient
  const sql = `
    SELECT a.id, a.admin_time, a.status, a.nurse_id, i.last_name as nurse_last_name, i.first_name as nurse_first_name,
           a.prescription_id, pr.medication_label, pr.dosage, pr.route, pr.frequency,
           a.administered_dose, a.comment
    FROM administrations a
    LEFT JOIN infirmiers i ON a.nurse_id = i.nurse_id
    LEFT JOIN prescriptions pr ON a.prescription_id = pr.id
    WHERE a.patient_id = ?
    ORDER BY a.admin_time DESC
  `;
  db.all(sql, [patient_id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL historique patient:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.json(rows);
  });
});

// ----------------------------
// Historique des prescriptions faites par un infirmier
// ----------------------------
app.get("/historique/infirmier/:nurse_id", (req, res) => {
  const { nurse_id } = req.params;
  if (!nurse_id) return res.status(400).json({ error: "nurse_id obligatoire" });
  // On suppose que la table administrations enregistre les actes faits par l'infirmier
  const sql = `
    SELECT a.id, a.admin_time, a.status, a.patient_id, p.last_name as patient_last_name, p.first_name as patient_first_name,
           a.prescription_id, pr.medication_label, pr.dosage, pr.route, pr.frequency,
           a.administered_dose, a.comment
    FROM administrations a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN prescriptions pr ON a.prescription_id = pr.id
    WHERE a.nurse_id = ?
    ORDER BY a.admin_time DESC
  `;
  db.all(sql, [nurse_id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL historique infirmier:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.json(rows);
  });
});

// ----------------------------
// Authentification infirmier (connexion par nurse_id + password)
// ----------------------------
app.post("/login", (req, res) => {
  const { nurse_id, password } = req.body;

  if (!nurse_id || !password) {
    return res.status(400).json({ error: "ID et mot de passe obligatoires" });
  }

  const sql = `SELECT nurse_id, last_name, first_name, password FROM infirmiers WHERE nurse_id = ?`;

  db.get(sql, [nurse_id], (err, row) => {
    if (err) {
      console.error("Erreur SQL infirmiers:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    if (!row) {
      return res.status(401).json({ error: "ID ou mot de passe incorrect" });
    }

    // Vérification mot de passe (en clair pour ce prototype)
    if (String(row.password) !== String(password)) {
      return res.status(401).json({ error: "ID ou mot de passe incorrect" });
    }

    // Auth OK, renvoyer infos (sans le mot de passe)
    return res.json({
      nurse_id: row.nurse_id,
      last_name: row.last_name,
      first_name: row.first_name
    });
  });
});

// ➤ Route test backend (JSON)
app.get("/", (req, res) => {
  res.json({ message: "API MESPI Chariot ambulatoire opérationnelle v2 🏥🚗" });
});

// ➤ Route pour l'interface utilisateur (UI)
app.get("/ui", (req, res) => {
  console.log("➡️  GET /ui");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ----------------------------
// GET un patient via hospital_id
// ----------------------------
app.get("/patients/:hospitalId", (req, res) => {
  const { hospitalId } = req.params;

  const sql = `
    SELECT * FROM patients
    WHERE hospital_id = ?
  `;

  db.get(sql, [hospitalId], (err, row) => {
    if (err) {
      console.error("Erreur SQL patients:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    if (!row) return res.status(404).json({ error: "Patient non trouvé" });

    return res.json(row);
  });
});

// ----------------------------
// Récupérer la liste de tous les patients (pour generation QR codes)
// ----------------------------
app.get("/patients", (req, res) => {
  const sql = "SELECT * FROM patients ORDER BY last_name, first_name";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erreur SQL patients list:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    return res.json(rows);
  });
});

// ----------------------------
// Enregistrer une administration
// ----------------------------
app.post("/administrations", (req, res) => {
  const {
    patient_id,
    prescription_id = null,
    administered_dose = null,
    nurse_id = null,
    status = "GIVEN",
    comment = null,
  } = req.body;

  if (!patient_id)
    return res.status(400).json({ error: "patient_id obligatoire" });

  const sql = `
    INSERT INTO administrations (
      patient_id, prescription_id, admin_time,
      administered_dose, nurse_id, status, comment
    )
    VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      patient_id,
      prescription_id,
      administered_dose,
      nurse_id,
      status,
      comment,
    ],
    function (err) {
      if (err) {
        console.error("Erreur SQL administrations:", err.message);
        return res.status(500).json({ error: "Erreur serveur" });
      }

      return res.status(201).json({
        message: "Administration enregistrée 👍",
        id: this.lastID,
      });
    }
  );
});

// ----------------------------
// Récupérer les administrations d’un patient
// ----------------------------
app.get("/administrations/patient/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT * FROM administrations
    WHERE patient_id = ?
    ORDER BY admin_time DESC
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL administrations:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    return res.json(rows);
  });
});

// ----------------------------
// Ajouter un log
// ----------------------------
app.post("/logs", (req, res) => {
  const { level = "INFO", source = null, message, details = null } = req.body;

  if (!message) return res.status(400).json({ error: "Message obligatoire" });

  const sql = `
    INSERT INTO logs (level, source, message, details)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [level, source, message, details], function (err) {
    if (err) {
      console.error("Erreur SQL logs:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    return res.status(201).json({
      message: "Log enregistré 🤖",
      id: this.lastID,
    });
  });
});

// ----------------------------
// Derniers logs
// ----------------------------
app.get("/logs", (req, res) => {
  const sql = `
    SELECT * FROM logs
    ORDER BY log_time DESC
    LIMIT 50
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erreur SQL logs:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    res.json(rows);
  });
});

// =========================
// Lancement serveur
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Serveur API démarré : http://localhost:${PORT}`);
});
