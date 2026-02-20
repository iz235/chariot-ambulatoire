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
    // Création table vitals si inexistante
    db.run(`
    CREATE TABLE IF NOT EXISTS vitals (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id      INTEGER NOT NULL,
        nurse_id        VARCHAR(50),
        temperature     REAL,
        systolic        INTEGER,
        diastolic       INTEGER,
        pulse           INTEGER,
        spo2            INTEGER,
        taken_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

    console.log("✅ Connecté à SQLite :", dbPath);

    // Création table logs connexion si inexistante
    db.run(`CREATE TABLE IF NOT EXISTS connection_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nurse_id VARCHAR(50) NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// =========================
// ROUTES API
// =========================

// ----------------------------
// Historique des connexions d'un infirmier
// ----------------------------
app.get("/logs/connections/:nurse_id", (req, res) => {
  const { nurse_id } = req.params;
  const sql = `SELECT * FROM connection_logs WHERE nurse_id = ? ORDER BY login_time DESC LIMIT 50`;

  db.all(sql, [nurse_id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL logs connexion:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    res.json(rows);
  });
});

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

    // Enregistrement log connexion
    db.run(`INSERT INTO connection_logs (nurse_id) VALUES (?)`, [row.nurse_id]);

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
// Créer un nouveau patient (génération auto ID)
// ----------------------------
app.post("/patients", (req, res) => {
  const { last_name, first_name, birth_date, sex } = req.body;

  if (!last_name || !first_name || !birth_date || !sex) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  // Générer un ID unique : H + timestamp (partiel) + random
  // Ex: H + 260217 + 123 -> H260217123
  // Plus simple : H + Date.now().toString().slice(-6)
  const hospital_id = "H" + Date.now().toString().slice(-5) + Math.floor(Math.random() * 10);

  const sql = `INSERT INTO patients (hospital_id, last_name, first_name, birth_date, sex) VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [hospital_id, last_name, first_name, birth_date, sex], function (err) {
    if (err) {
      console.error("Erreur création patient:", err.message);
      return res.status(500).json({ error: "Erreur lors de la création du patient." });
    }
    // Renvoyer le patient créé
    res.json({
      id: this.lastID,
      hospital_id,
      last_name,
      first_name,
      birth_date,
      sex
    });
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
// CLINICAL RULE ENGINE
// ----------------------------
function analyzeVitals({ temperature, systolic, diastolic, pulse, spo2 }) {
  const alerts = [];

  // Temperature
  const temp = parseFloat(temperature);
  if (!isNaN(temp)) {
    if (temp >= 40.0) alerts.push({ level: 'critical', code: 'HYPERTHERMIA', label: 'Hyperthermie sévère', detail: `Température: ${temp}°C`, suggestion: 'Refroidissement urgent + Antipyrétique IV' });
    else if (temp >= 38.5) alerts.push({ level: 'warning', code: 'FEVER', label: 'Fièvre', detail: `Température: ${temp}°C`, suggestion: 'Administrer Antipyrétique (Paracétamol 1g)' });
    else if (temp < 36.0) alerts.push({ level: 'warning', code: 'HYPOTHERMIA', label: 'Hypothermie', detail: `Température: ${temp}°C`, suggestion: 'Réchauffement, surveiller' });
  }

  // Blood pressure
  const sys = parseInt(systolic);
  const dia = parseInt(diastolic);
  if (!isNaN(sys)) {
    if (sys >= 180) alerts.push({ level: 'critical', code: 'HYPERTENSION_C', label: 'Hypertension critique', detail: `TA: ${sys}/${dia} mmHg`, suggestion: 'Contacter médecin immédiatement' });
    else if (sys >= 140) alerts.push({ level: 'warning', code: 'HYPERTENSION', label: 'Hypertension', detail: `TA: ${sys}/${dia} mmHg`, suggestion: 'Surveiller, noter dans le dossier' });
    else if (sys < 90) alerts.push({ level: 'critical', code: 'HYPOTENSION', label: 'Hypotension', detail: `TA: ${sys}/${dia} mmHg`, suggestion: 'Position allongée, appeler médecin' });
  }

  // Pulse
  const hr = parseInt(pulse);
  if (!isNaN(hr)) {
    if (hr > 120) alerts.push({ level: 'warning', code: 'TACHYCARDIA', label: 'Tachycardie', detail: `Pouls: ${hr} bpm`, suggestion: 'Surveiller, vérifier causes' });
    else if (hr < 50) alerts.push({ level: 'warning', code: 'BRADYCARDIA', label: 'Bradycardie', detail: `Pouls: ${hr} bpm`, suggestion: 'ECG recommandé, alerter médecin' });
  }

  // SpO2
  const o2 = parseInt(spo2);
  if (!isNaN(o2)) {
    if (o2 < 90) alerts.push({ level: 'critical', code: 'HYPOXIA_C', label: 'Hypoxie sévère', detail: `SpO2: ${o2}%`, suggestion: 'Oxygène urgent, appeler médecin' });
    else if (o2 < 95) alerts.push({ level: 'warning', code: 'HYPOXIA', label: 'Désaturation', detail: `SpO2: ${o2}%`, suggestion: 'Administrer O2, surveiller' });
  }

  return alerts;
}

// ----------------------------
// SAVE VITALS
// ----------------------------
app.post("/vitals", (req, res) => {
  const { patient_id, nurse_id, temperature, systolic, diastolic, pulse, spo2 } = req.body;

  if (!patient_id) return res.status(400).json({ error: "patient_id requis" });

  const sql = `
    INSERT INTO vitals (patient_id, nurse_id, temperature, systolic, diastolic, pulse, spo2)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [patient_id, nurse_id, temperature, systolic, diastolic, pulse, spo2], function (err) {
    if (err) {
      console.error("Erreur SQL Vitals:", err.message);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    // Run clinical analysis
    const alerts = analyzeVitals({ temperature, systolic, diastolic, pulse, spo2 });
    res.json({ message: "Constantes enregistrées", id: this.lastID, alerts });
  });
});

// ----------------------------
// GET VITALS (History)
// ----------------------------
app.get("/vitals/patient/:id", (req, res) => {
  const sql = `SELECT * FROM vitals WHERE patient_id = ? ORDER BY taken_at ASC`;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    res.json(rows);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur API démarré : http://localhost:${PORT}`);
  console.log(`📡 Accès réseau (Raspberry/Tablette) : http://10.10.20.22:${PORT}`);
});
