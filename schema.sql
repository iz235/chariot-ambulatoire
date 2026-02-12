-- ==========================
--   Schéma base de données
--   Chariot ambulatoire
-- ==========================

-- Activer les clés étrangères (utile pour SQLite)
PRAGMA foreign_keys = ON;

-- ==========================
-- TABLE : patients
-- ==========================
CREATE TABLE IF NOT EXISTS patients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    hospital_id     VARCHAR(50) UNIQUE NOT NULL,    -- ID du SIH / code-barres
    last_name       VARCHAR(100) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    birth_date      DATE NOT NULL,
    sex             VARCHAR(10),                    -- 'M', 'F', 'Autre'
    room_number     VARCHAR(20),                    -- chambre / lit
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_lastname ON patients(last_name);


-- ==========================
-- TABLE : prescriptions
-- (OPTIONNEL MAIS UTILE)
-- ==========================
CREATE TABLE IF NOT EXISTS prescriptions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id          INTEGER NOT NULL,
    medication_code     VARCHAR(100) NOT NULL,      -- code médicament / CIP
    medication_label    VARCHAR(255),               -- nom lisible
    dosage              VARCHAR(100),               -- ex : "500 mg"
    route               VARCHAR(50),                -- ex : "IV", "orale"
    frequency           VARCHAR(100),               -- ex : "3x/jour"
    start_date          DATETIME NOT NULL,
    end_date            DATETIME,
    status              VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / STOPPED
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) 
        REFERENCES patients(id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id 
ON prescriptions(patient_id);


-- ==========================
-- TABLE : administrations
-- (OPTIONNEL MAIS TRES BIEN POUR DEMO)
-- ==========================
CREATE TABLE IF NOT EXISTS administrations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id          INTEGER NOT NULL,
    prescription_id     INTEGER,
    admin_time          DATETIME NOT NULL,          -- heure d’administration
    administered_dose   VARCHAR(100),               -- dose réellement donnée
    nurse_id            VARCHAR(50),               -- ID badge infirmier
    status              VARCHAR(20) DEFAULT 'GIVEN', -- GIVEN / MISSED / DELAYED
    comment             TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) 
        REFERENCES patients(id) 
        ON DELETE CASCADE,

    FOREIGN KEY (prescription_id) 
        REFERENCES prescriptions(id) 
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_patient_id 
ON administrations(patient_id);

CREATE INDEX IF NOT EXISTS idx_admin_prescription_id 
ON administrations(prescription_id);


-- ==========================
-- TABLE : logs
-- ==========================
CREATE TABLE IF NOT EXISTS logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    log_time        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level           VARCHAR(10) NOT NULL,           -- INFO / WARN / ERROR
    source          VARCHAR(50),                    -- UI, BACKEND, HL7, SCANNER...
    message         TEXT NOT NULL,
    details         TEXT                            -- stacktrace, payload HL7, etc.
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);


-- ==========================
-- TABLE : infirmiers
-- ==========================
CREATE TABLE IF NOT EXISTS infirmiers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nurse_id        VARCHAR(50) UNIQUE NOT NULL,   -- ID badge ou identifiant
    last_name       VARCHAR(100) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    password        VARCHAR(255) NOT NULL,         -- hash du mot de passe
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_infirmiers_nurse_id ON infirmiers(nurse_id);

-- ==========================
-- Exemple de données (optionnel pour tests)
-- ==========================

INSERT OR IGNORE INTO patients (hospital_id, last_name, first_name, birth_date, sex, room_number)
VALUES 
('H00123', 'DUPONT', 'Jean', '1980-01-15', 'M', '101A'),
('H00124', 'MARTIN', 'Claire', '1975-06-02', 'F', '102B');

-- Ajout d'un infirmier de test avec mot de passe (en clair pour démo, à hacher en prod)
INSERT OR IGNORE INTO infirmiers (nurse_id, last_name, first_name, password)
VALUES ('INF007', 'Bond', 'James', '007');

INSERT OR IGNORE INTO logs (level, source, message)
VALUES 
('INFO', 'SYSTEM', 'Initialisation de la base Mespi OK');
