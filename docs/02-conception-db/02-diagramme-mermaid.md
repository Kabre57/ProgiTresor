# 02 - Diagramme ER (Relations d'Entités)

Ce diagramme illustre le modèle relationnel cible 3NF de ProgiTresor. Dans le monorepo microservices, certaines relations inter-services sont portées comme références logiques sans FK physique entre bases, notamment `transactions.code_ot`.

```mermaid
erDiagram
    antennes {
        int id_antenne PK
        varchar nom_antenne UK
    }

    filieres {
        int id_filiere PK
        varchar libelle_filiere UK
    }

    statuts_etudiant {
        int id_statut PK
        varchar libelle_statut UK
    }

    types_produit {
        varchar code_produit PK
        varchar libelle_standard
        varchar type_flux
        boolean hors_budget
    }

    etudiants {
        varchar matricule_etudiant PK
        varchar nom_complet
        int id_antenne FK
        int id_filiere FK
        int id_statut FK
        timestamp date_creation
        timestamp date_modification
    }

    utilisateurs {
        int id_utilisateur PK
        varchar nom_utilisateur UK
        varchar mot_de_passe_hash
        varchar role
        int id_antenne_affectation FK
        timestamp date_creation
        timestamp date_derniere_connexion
    }

    ordres_de_traitement {
        varchar code_ot PK
        int id_antenne FK
        int id_filiere FK
        varchar type_recette
        decimal montant_cumule
        int nombre_flux
        varchar statut_ot
        timestamp date_creation
        timestamp date_validation_chef_comptable
        int id_validateur_chef_comptable FK
        timestamp date_transmission_budget
        timestamp date_approbation_directeur_financier
        int id_approbateur_directeur_financier FK
    }

    transactions {
        int id_transaction PK
        varchar reference_tresor UK
        timestamp date_heure
        decimal montant
        varchar nom_payeur
        varchar matricule_etudiant FK
        varchar code_produit FK
        varchar reference_source
        timestamp date_import
        varchar code_ot FK
    }

    audit_logs {
        int id_log PK
        timestamp date_heure_action
        int id_utilisateur FK
        varchar type_action
        text description
        jsonb details_json
    }

    antennes ||--o{ etudiants : "possede"
    antennes ||--o{ utilisateurs : "affecte_a"
    antennes ||--o{ ordres_de_traitement : "associe_a"
    filieres ||--o{ etudiants : "appartient_a"
    filieres ||--o{ ordres_de_traitement : "concerne"
    statuts_etudiant ||--o{ etudiants : "definit"
    types_produit ||--o{ transactions : "concerne"
    etudiants ||--o{ transactions : "effectue"
    utilisateurs ||--o{ audit_logs : "genere"
    utilisateurs ||--o{ ordres_de_traitement : "valide"
    utilisateurs ||--o{ ordres_de_traitement : "approuve"
    ordres_de_traitement ||--o{ transactions : "regroupe"
```
