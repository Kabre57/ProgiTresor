# Guide des Gabarits d'Importation Excel & CSV — ProgiTrésor

Ce guide documente les gabarits, en-têtes de colonnes acceptés et exemples concrets pour chacun des **10 types d'importation** pris en charge par le système.

> [!NOTE]
> Le système est flexible : les en-têtes sont **insensibles à la casse**, et les référentiels liés (filières, flux, recettes, niveaux, statuts) peuvent être saisis par leur **Code technique** ou par leur **Libellé textuel** lisible.

---

## Sommaire des Gabarits

### 1. Promotions
* **Endpoint** : `POST /api/etudiant/import-referential/promotions`
* **Description** : Déclare les années académiques ou promotions.

| nom | ordre |
| :--- | :--- |
| Promotion 2025-2026 | 1 |
| Promotion 2026-2027 | 2 |

---

### 2. Antennes
* **Endpoint** : `POST /api/etudiant/import-referential/antennes`
* **Description** : Liste des antennes INFAS régionales.

| code | nom | ville |
| :--- | :--- | :--- |
| ABJ | Antenne Abidjan | Abidjan |
| DKO | Antenne Daloa | Daloa |
| BYO | Antenne Bouaké | Bouaké |

---

### 3. Filières
* **Endpoint** : `POST /api/etudiant/import-referential/filieres`
* **Description** : Déclare les filières d'étude.

| code | libelle |
| :--- | :--- |
| INF | Infirmier d'État |
| SFA | Sage-Femme / Maïeuticien |
| TBM | Technicien Biologie Médicale |

---

### 4. Niveaux
* **Endpoint** : `POST /api/etudiant/import-referential/niveaux`
* **Description** : Déclare les classes/niveaux liés aux filières.
* **Résolution** : La colonne **filiere** accepte soit le code (ex: `INF`) soit le libellé complet (ex: `Infirmier d'État`).

| code | libelle | cycle | anneeetude | filiere |
| :--- | :--- | :--- | :--- | :--- |
| L1-INF | Licence 1 Infirmier | LICENCE | 1 | Infirmier d'État |
| L2-INF | Licence 2 Infirmier | LICENCE | 2 | INF |
| L1-SFA | Licence 1 Sage-Femme | LICENCE | 1 | Sage-Femme / Maïeuticien |

---

### 5. Statuts Étudiants
* **Endpoint** : `POST /api/etudiant/import-referential/statuts`
* **Description** : Déclare les statuts de prise en charge financière.

| code | libelle |
| :--- | :--- |
| PUBLIC | Étudiant de l'État (Public) |
| PRIVE | Étudiant Privé (Frais propres) |

---

### 6. Types de Flux
* **Endpoint** : `POST /api/etudiant/import-referential/types-flux`
* **Description** : Catégories majeures de flux budgétaires.

| code | libelle |
| :--- | :--- |
| CLASSE | Recette de Scolarité / Inscription |
| HORS-BUDGET | Synthèse Hors-Budget |

---

### 7. Types de Recettes
* **Endpoint** : `POST /api/etudiant/import-referential/types-recettes`
* **Description** : Sous-catégories de recettes rattachées aux flux.
* **Résolution** : La colonne **flux** accepte le code ou le libellé du flux parent (ex: `CLASSE` ou `Recette de Scolarité / Inscription`).

| code | libelle | flux |
| :--- | :--- | :--- |
| FRAIS-SCOLARITE-L1 | Frais de Scolarité Licence 1 | Scolarité / Inscription |
| INSCRIPTION-SCOLARITE | Inscription Annuelle | CLASSE |

---

### 8. Nomenclatures de Produits
* **Endpoint** : `POST /api/etudiant/import-referential/nomenclatures`
* **Description** : Table de mapping pour capturer et catégoriser les libellés bancaires.
* **Résolution** : Les colonnes de lien (`type recette`, `niveau`, `statut`) acceptent indifféremment le code ou le libellé textuel.

| libellebrut | codeproduit | libellestandard | type recette | niveau | statut | montant | numversement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VERSEMENT SCOL LICENCE 1 | SCOL-L1 | SCOLARITE L1 STANDARD | Frais de Scolarité Licence 1 | L1-INF | PUBLIC | 100000 | 1 |
| INSCRIPTION LICENCE 1 | INSC-L1 | INSCRIPTION STANDARD | Inscription Annuelle | Licence 1 Infirmier | PUBLIC | 15000 | 1 |

---

### 9. Fiches Étudiants
* **Endpoint** : `POST /api/etudiant/import`
* **Description** : Base de données des élèves.
* **Résolution** : L'antenne, le niveau et le statut peuvent être renseignés par nom/libellé ou par code.

| matricule | nom | prenom | antenne | niveau | statut | promotion |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| INF-2026-001 | KOFFI | Kouame Jean | Antenne Abidjan | Licence 1 Infirmier | Public | Promotion 2025-2026 |
| INF-2026-002 | KONE | Fatoumata | ABJ | L1-INF | PRIVE | Promotion 2025-2026 |

---

### 10. Transactions Bancaires (Relevés Trésor Pay)
* **Endpoint** : `POST /api/transactions/import-file`
* **Description** : Relevés périodiques d'encaissements bruts.

| reference | date | montant | matricule | payeur | produit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TR-98837190 | 08/07/2026 14:15:20 | 100000 | INF-2026-001 | KOFFI KOUAME | 1ER VERSEMENT SCOLARITE |
| TR-98837191 | 08/07/2026 14:18:10 | 15000 | INF-2026-002 | KONE ALASSANE | INSCRIPTION SCOLARITE |
