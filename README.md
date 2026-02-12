# Chariot Ambulatoire - Prototype

Application de simulation pour chariot ambulatoire connecté (Projet MESPI S5).

## Fonctionnalités

-   **Authentification Infirmier** : Sécurisée par ID et mot de passe.
-   **Scan Patient** : Simulation de scan de bracelet (code-barre/QR) pour identifier les patients.
-   **Historique** :
    -   Consultation de l'historique des soins du patient.
    -   Historique personnel de l'infirmier connecté.
    -   Détails complets (Dose administée, commentaire, heure...).
-   **Administration** :
    -   Enregistrement des soins/médicaments.
    -   Saisie de la dose réelle.
-   **Bracelets Numériques** :
    -   Génération et impression de bracelets patients avec QR Code.
    -   Support du scan douchette (simulation entrée clavier).

## Installation

1.  Cloner ce dépôt.
2.  Installer les dépendances :
    ```bash
    npm install
    ```
3.  Initialiser la base de données (si nécessaire) :
    ```bash
    # Le fichier chariot.db est généré automatiquement ou via un script python si présent
    # python init_db.py
    ```

## Lancement

Démarrer le serveur Node.js :

```bash
node server.js
```

Accéder à l'interface : `http://localhost:3000`

## Comptes de démonstration

-   **Infirmier** : `INF007` / Mdp : `007`
-   **Patients** : Voir la liste via `http://localhost:3000/bracelets.html`
