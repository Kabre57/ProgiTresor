# Convention de noms ProgiTresor

Date : 2026-06-17

Objectif : fixer un vocabulaire unique entre Prisma, SQL, DTO partages et API. Les noms Prisma restent en `camelCase`. Les noms SQL restent en `snake_case` via `@map` et `@@map`. Les DTO et reponses API suivent les noms Prisma, sauf champ source metier conserve explicitement.

## Regles globales

| Couche | Convention |
| --- | --- |
| Prisma model | PascalCase : `Utilisateur`, `Etudiant`, `OrdreTraitement` |
| Prisma field | camelCase : `motDePasseHash`, `roleId`, `dateCreation` |
| SQL table | snake_case singulier : `utilisateur`, `ordre_traitement`, `journal_audit` |
| SQL column | snake_case : `mot_de_passe_hash`, `role_id`, `date_creation` |
| DTO/API | camelCase, identique aux champs metier Prisma exposes |
| Reference interservice | champ scalaire, pas de FK physique entre bases |

## Auth

### Role

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Role` | `role` | `RoleDto` |
| Identifiant | `id` | `id` | `id` |
| Code stable | `code` | `code` | `code` |
| Libelle | `libelle` | `libelle` | `libelle` |
| Description | `description` | `description` | `description` |

### Permission

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Permission` | `permission` | `PermissionDto` |
| Identifiant | `id` | `id` | `id` |
| Code stable | `code` | `code` | `code` |
| Libelle | `libelle` | `libelle` | `libelle` |
| Module | `module` | `module` | `module` |

### Utilisateur

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Utilisateur` | `utilisateur` | `UtilisateurDto` |
| Identifiant | `id` | `id` | `id` |
| Login | `username` | `username` | `username` |
| Nom | `nom` | `nom` | `nom` |
| Prenom | `prenom` | `prenom` | `prenom` |
| Email | `email` | `email` | `email` |
| Mot de passe hash | `motDePasseHash` | `mot_de_passe_hash` | non expose |
| Role | `roleId` | `role_id` | `roleCode`, `roleLibelle` |
| Service | `service` | `service` | `service` |
| Actif | `actif` | `actif` | `actif` |
| Creation | `dateCreation` | `date_creation` | `dateCreation` |
| Derniere connexion | `derniereConnexion` | `derniere_connexion` | `derniereConnexion` |

### JournalAudit

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `JournalAudit` | `journal_audit` | `JournalAuditDto` |
| Identifiant | `id` | `id` | `id` |
| Utilisateur | `utilisateurId` | `utilisateur_id` | `utilisateurId` |
| Action | `action` | `action` | `action` |
| Entite | `entite` | `entite` | `entite` |
| Entite cible | `entiteId` | `entite_id` | `entiteId` |
| Date | `dateHeure` | `date_heure` | `dateHeure` |
| IP | `adresseIp` | `adresse_ip` | `adresseIp` |
| Details | `details` | `details` | `details` |

## Student

### Antenne

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Antenne` | `antenne` | `AntenneDto` |
| Identifiant | `id` | `id` | `id` |
| Code | `code` | `code` | `code` |
| Nom | `nom` | `nom` | `nom` |
| Ville | `ville` | `ville` | `ville` |
| Actif | `actif` | `actif` | `actif` |

### Filiere

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Filiere` | `filiere` | `FiliereDto` |
| Identifiant | `id` | `id` | `id` |
| Code | `code` | `code` | `code` |
| Libelle | `libelle` | `libelle` | `libelle` |
| Cycle | `cycle` | `cycle` | `cycle` |
| Annee | `anneeEtude` | `annee_etude` | `anneeEtude` |

### StatutEtudiant

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `StatutEtudiant` | `statut_etudiant` | `StatutEtudiantDto` |
| Identifiant | `id` | `id` | `id` |
| Code | `code` | `code` | `code` |
| Libelle | `libelle` | `libelle` | `libelle` |

### Etudiant

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Etudiant` | `etudiant` | `EtudiantDto` |
| Identifiant | `id` | `id` | `id` |
| Matricule | `matricule` | `matricule` | `matricule` |
| Nom | `nom` | `nom` | `nom` |
| Prenom | `prenom` | `prenom` | `prenom` |
| Prefixe matricule | `prefixeMatricule` | `prefixe_matricule` | `prefixeMatricule` |
| Antenne | `antenneId` | `antenne_id` | `antenneId` |
| Filiere | `filiereId` | `filiere_id` | `filiereId` |
| Statut | `statutId` | `statut_id` | `statutId` |
| Creation | `dateCreation` | `date_creation` | `dateCreation` |

## Recettes et nomenclature

### TypeFlux

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `TypeFlux` | `type_flux` | `TypeFluxDto` |
| Identifiant | `id` | `id` | `id` |
| Code | `code` | `code` | `code` |
| Libelle | `libelle` | `libelle` | `libelle` |

### TypeRecette

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `TypeRecette` | `type_recette` | `TypeRecetteDto` |
| Identifiant | `id` | `id` | `id` |
| Code | `code` | `code` | `code` |
| Libelle | `libelle` | `libelle` | `libelle` |
| Flux | `typeFluxId` | `type_flux_id` | `typeFluxId` |

### NomenclatureProduit

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `NomenclatureProduit` | `nomenclature_produit` | `NomenclatureProduitDto` |
| Identifiant | `id` | `id` | `id` |
| Libelle brut | `libelleBrut` | `libelle_brut` | `libelleBrut` |
| Code produit | `codeProduit` | `code_produit` | `codeProduit` |
| Libelle standard | `libelleStandard` | `libelle_standard` | `libelleStandard` |
| Type recette | `typeRecetteId` | `type_recette_id` | `typeRecetteId` |
| Filiere | `filiereId` | `filiere_id` | `filiereId` |
| Statut | `statutId` | `statut_id` | `statutId` |
| Versement | `numVersement` | `num_versement` | `numVersement` |
| Actif | `actif` | `actif` | `actif` |

## Transaction

### ImportFichier

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `ImportFichier` | `import_fichier` | `ImportFichierDto` |
| Identifiant | `id` | `id` | `id` |
| Nom fichier | `nomFichier` | `nom_fichier` | `nomFichier` |
| Type fichier | `typeFichier` | `type_fichier` | `typeFichier` |
| Auteur auth | `auteurId` | `auteur_id` | `auteurId` |
| Date import | `dateImport` | `date_import` | `dateImport` |
| Periode debut | `periodeDebut` | `periode_debut` | `periodeDebut` |
| Periode fin | `periodeFin` | `periode_fin` | `periodeFin` |
| Lignes lues | `nbLignesLues` | `nb_lignes_lues` | `nbLignesLues` |
| Lignes traitees | `nbLignesTraitees` | `nb_lignes_traitees` | `nbLignesTraitees` |
| Erreurs | `nbErreurs` | `nb_erreurs` | `nbErreurs` |
| Statut | `statut` | `statut` | `statut` |
| Logs erreurs | `logsErreurs` | `logs_erreurs` | `logsErreurs` |

### Transaction

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `Transaction` | `transaction` | `TransactionDto` |
| Identifiant | `id` | `id` | `id` |
| Reference Tresor | `refTresor` | `ref_tresor` | `refTresor` |
| Date heure | `dateHeure` | `date_heure` | `dateHeure` |
| Montant | `montant` | `montant` | `montant` |
| Etudiant | `etudiantId` | `etudiant_id` | `etudiantId` |
| Antenne | `antenneId` | `antenne_id` | `antenneId` |
| Nomenclature | `nomenclatureId` | `nomenclature_id` | `nomenclatureId` |
| Type flux | `typeFluxId` | `type_flux_id` | `typeFluxId` |
| Import | `importId` | `import_id` | `importId` |
| OT | `ordreTraitementId` | `ordre_traitement_id` | `ordreTraitementId` |
| Mois | `mois` | `mois` | `mois` |
| Payeur brut | `nomPayeurBrut` | `nom_payeur_brut` | `nomPayeurBrut` |
| Produit brut | `libelleProduitBrut` | `libelle_produit_brut` | `libelleProduitBrut` |
| Traitement | `statutTraitement` | `statut_traitement` | `statutTraitement` |
| Gel | `gele` | `gele` | `gele` |
| Creation | `dateCreation` | `date_creation` | `dateCreation` |

### OrdreTraitementMiroir

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `OrdreTraitementMiroir` | `ordre_traitement_miroir` | interne |
| Identifiant OT | `id` | `id` | `ordreTraitementId` |
| Code OT | `codeOt` | `code_ot` | `codeOt` |
| Statut OT | `statut` | `statut` | `statut` |
| Mise a jour | `updatedAt` | `updated_at` | `updatedAt` |

## Order

### SyntheseOT

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `SyntheseOT` | `synthese_ot` | `SyntheseOTDto` |
| Identifiant | `id` | `id` | `id` |
| Reference | `reference` | `reference` | `reference` |
| Periode debut | `periodeDebut` | `periode_debut` | `periodeDebut` |
| Periode fin | `periodeFin` | `periode_fin` | `periodeFin` |
| Flux | `typeFluxId` | `type_flux_id` | `typeFluxId` |
| Statut | `statut` | `statut` | `statut` |
| Auteur | `auteurId` | `auteur_id` | `auteurId` |
| Transmis par | `transmisParId` | `transmis_par_id` | `transmisParId` |
| Montant total | `montantTotal` | `montant_total` | `montantTotal` |
| Nombre transactions | `nbTransactions` | `nb_transactions` | `nbTransactions` |
| Generation | `dateGeneration` | `date_generation` | `dateGeneration` |
| Transmission | `dateTransmission` | `date_transmission` | `dateTransmission` |

### OrdreTraitement

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `OrdreTraitement` | `ordre_traitement` | `OrdreTraitementDto` |
| Identifiant | `id` | `id` | `id` |
| Code OT | `codeOt` | `code_ot` | `codeOt` |
| Synthese | `syntheseId` | `synthese_id` | `syntheseId` |
| Antenne | `antenneId` | `antenne_id` | `antenneId` |
| Filiere | `filiereId` | `filiere_id` | `filiereId` |
| Type recette | `typeRecetteId` | `type_recette_id` | `typeRecetteId` |
| Montant cumule | `montantCumule` | `montant_cumule` | `montantCumule` |
| Nombre flux | `nombreFlux` | `nombre_flux` | `nombreFlux` |
| Statut | `statut` | `statut` | `statut` |
| Createur | `creeParId` | `cree_par_id` | `creeParId` |
| Validateur | `valideParId` | `valide_par_id` | `valideParId` |
| Creation | `dateCreation` | `date_creation` | `dateCreation` |
| Emission | `dateEmission` | `date_emission` | `dateEmission` |

## Compta

### CompteComptable

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `CompteComptable` | `compte_comptable` | `CompteComptableDto` |
| Numero | `numero` | `numero` | `numero` |
| Libelle | `libelle` | `libelle` | `libelle` |
| Classe | `classe` | `classe` | `classe` |

### EcritureComptable

| Sens | Prisma | SQL | DTO/API |
| --- | --- | --- | --- |
| Table | `EcritureComptable` | `ecriture_comptable` | `EcritureComptableDto` |
| Identifiant | `id` | `id` | `id` |
| OT | `ordreTraitementId` | `ordre_traitement_id` | `ordreTraitementId` |
| Debit | `compteDebitNum` | `compte_debit_num` | `compteDebitNum` |
| Credit | `compteCreditNum` | `compte_credit_num` | `compteCreditNum` |
| Montant | `montant` | `montant` | `montant` |
| Libelle | `libelle` | `libelle` | `libelle` |
| Date ecriture | `dateEcriture` | `date_ecriture` | `dateEcriture` |
| Creation | `createdAt` | `created_at` | `createdAt` |
