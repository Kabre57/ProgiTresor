# Rapport de conformite backend ProgiTresor

Date d'audit : 2026-06-17

Perimetre analyse : services `auth-service`, `gateway`, `student-service`, `transaction-service`, `order-service`, specifications fonctionnelles, conception DB, architecture microservices et documentation API.

## Synthese globale

Le backend couvre les fondations techniques principales : authentification JWT, roles, CRUD utilisateurs, CRUD et cache etudiants, import transactionnel au format JSON normalise, dedoublonnage par `reference_tresor`, generation d'ordres de traitement par Saga et synchronisation minimale entre `order-service` et `transaction-service`.

Il n'est pas encore pret pour une recette fonctionnelle complete. Les ecarts les plus bloquants concernent l'import reel Excel/CSV, les journaux d'import, les tableaux de bord, les reliquats et le workflow OT strict avec numero officiel et motif de rejet.

| Module | Score estime | Etat |
| --- | ---: | --- |
| Module A - Imports et integration | 40% | Base transactionnelle presente, import fichier absent |
| Module B - Rapprochement et regles metier | 50% | Categorie Budget/Hors Budget partielle, reliquats absents |
| Module C - Tableaux de bord et KPIs | 0% | Endpoints et agregations absents |
| Module D - Ordres de paiement | 75% | Saga et statuts presents, workflow incomplet |
| Module E - Securite et audit | 50% | JWT/RBAC presents, controles fins et audit metier incomplets |
| Global | 46% | Backend partiel, integration frontend possible seulement sur les flux deja couverts |

Legende : ✅ complet, ⚠️ partiel, ❌ absent, 🔧 a corriger.

## Module A - Gestion des imports et integration des donnees

| Fonctionnalite | Statut | Preuve actuelle | Action recommandee |
| --- | --- | --- | --- |
| Import Excel/CSV | ❌ | `POST /api/transactions/import` existe via gateway, puis `POST /import` dans `transaction-service`, mais accepte un tableau JSON deja structure. Aucun parseur `xlsx`, `csv`, `multer` ou upload fichier detecte. | Ajouter `POST /api/transactions/import-file` en multipart, parser Excel/CSV, valider le format et produire un rapport d'import. |
| Validation des colonnes | ❌ | Le schema `transactionImportSchema` valide les champs JSON attendus, pas les colonnes source `ANTENNE`, `REFERENCE`, `PRODUIT`, `MONTANT`, `DATE`, `NOM PAYEUR`, `MATRICULE`. | Ajouter une couche `importParserService` qui mappe les colonnes attendues et retourne les erreurs ligne par ligne. |
| Parsing automatique des donnees | ⚠️ | `transactionService.importTransactions()` extrait `reference_tresor`, `produit`, `montant`, `date_heure`, `nom_payeur`, `matricule_etudiant` depuis l'objet JSON. | Etendre au parsing fichier brut et gerer les formats de date/montant venant d'Excel. |
| Nettoyage des donnees | ⚠️ | Le service fait `trim()` sur reference, produit, payeur et `trim().toUpperCase()` sur matricule. Pas de normalisation antenne, pas de strategie explicite UTF-8. | Centraliser la normalisation dans `shared/` ou `transaction-service/src/utils/normalizeImportRow.ts`, couvrir antenne, espaces multiples, encodage et dates. |
| Gestion des doublons par `reference_tresor` | ✅ | Prisma impose `reference_tresor @unique`. Le service intercepte `P2002`, incremente `duplicates` et continue l'import. Test unitaire present dans `transactionService.test.ts`. | Ajouter un test d'integration avec deux lignes identiques et verifier le compteur de doublons. |
| Log d'import | ❌ | Pas de table `import_logs`, pas de stockage auteur/date/nb lignes/erreurs. Seules des metriques Prometheus existent. | Creer `ImportLog` et `ImportLogError` dans Prisma, alimentes avec `X-User-Id`, nombre total, succes, doublons et erreurs. |

Exemple actuellement supporte :

```json
[
  {
    "reference_tresor": "REF-001",
    "produit": "FRAIS ANNEXES",
    "montant": 15000,
    "date_heure": "2026-06-17T09:00:00.000Z",
    "nom_payeur": "KOUAME AWA",
    "matricule_etudiant": "ETU001"
  }
]
```

## Module B - Moteur de rapprochement et regles metier

| Fonctionnalite | Statut | Preuve actuelle | Action recommandee |
| --- | --- | --- | --- |
| Categorisation Budget / Hors Budget | ⚠️ | `transactionService` classe Hors Budget par mots cles : `ANNEXES`, `ENCADREMENT`, `VACCINATION`, `STAGE`, `BLOUSE`, `CEREMONIE`; sinon Budget. | Remplacer par une nomenclature `types_produit` administree, avec champ `categorie` fiable et seed complet. |
| Gestion des types de flux | ⚠️ | `TypeProduit` existe et est cree par upsert pendant l'import. La liste metier complete n'est pas imposee. | Ajouter CRUD ou seed de `TypeProduit`, mapping par code/libelle, tests sur scolarite, inscription, annexes et encadrement. |
| Suivi des reliquats | ❌ | Aucun endpoint `solde`, aucune vue Prisma ou requete equivalent a `vue_solde_etudiant`. | Ajouter `GET /api/students/:matricule/solde` ou `GET /api/dashboard/students/:matricule`, avec echeances/objectifs si disponibles. |
| Regroupement par antenne, niveau, type de recette | ✅ | `order-service/src/services/sagaCoordinator.ts` recupere les transactions non affectees, interroge `student-service /batch`, puis groupe par `antenneId`, `niveauId`, `productName`. | Ajouter tests de Saga couvrant plusieurs antennes/niveaux/types et documenter les criteres de regroupement dans OpenAPI. |

## Module C - Tableaux de bord et visualisation

| Fonctionnalite | Statut | Preuve actuelle | Action recommandee |
| --- | --- | --- | --- |
| Montant global collecte | ❌ | Aucun endpoint KPI. `GET /api/transactions` liste les transactions mais ne renvoie pas d'agregat. | Ajouter `GET /api/dashboard/kpis?date_debut=&date_fin=` avec somme Budget, Hors Budget et total. |
| Budget realise vs objectif | ❌ | Pas de table ou service d'objectifs detecte. | Ajouter modele `BudgetObjective` ou definir la source des objectifs avant implementation. |
| Total Hors Budget realise | ❌ | Les transactions ont une categorie, mais pas d'agregation exposee. | Ajouter agregation par `categorie = Hors Budget`, periode et antenne. |
| Filtres dynamiques | ❌ | `transaction-service` expose seulement une pagination simple. Pas de filtres par periode, antenne, filiere ou statut. | Etendre `GET /api/transactions` avec filtres, ou creer `GET /api/dashboard/collections`. |
| Analyse par etudiant | ❌ | `student-service` permet `GET /api/students/:matricule`, mais pas historique, solde ou echeances. | Ajouter `GET /api/students/:matricule/payments` et `GET /api/students/:matricule/solde`. |

Ce module releve du backend pour les vues, agregations et filtres. Le frontend ne devrait consommer que des endpoints pre-agreges ou pagines, pas recalculer toute la logique metier.

## Module D - Generation et validation des Ordres de Traitement

| Fonctionnalite | Statut | Preuve actuelle | Action recommandee |
| --- | --- | --- | --- |
| Synthese agregee des transactions non affectees | ✅ | `POST /api/orders/generate` lance une Saga : `GET transaction-service/unassigned`, `POST student-service/batch`, regroupement, creation OT. | Completer avec un endpoint de previsualisation `GET /api/orders/synthesis`. |
| Creation OT | ✅ | `OrdreTraitement` contient `code_ot`, `montant_cumule`, `nombre_flux`, `statut_ot = Brouillon`. | Remplacer la generation aleatoire par une sequence metier stable. |
| Workflow `Brouillon -> Transmis au Budget -> Valide -> Approuve -> Paye` | ⚠️ | `PUT /api/orders/:code/status` accepte les statuts Prisma. Roles verifies seulement pour `Transmis au Budget`, `Validé`, `Approuvé`; pas de machine a etats stricte. | Ajouter une matrice de transitions autorisees et refuser les sauts, par exemple `Brouillon -> Approuvé`. |
| Gel des transactions a `Transmis au Budget` | ✅ | `transaction-service/src/triggers/gel-transaction.sql` bloque update/delete si l'OT lie n'est plus `Brouillon`. `orderService` synchronise le statut miroir via `/ot-status`. | Garantir l'application du trigger par migration Prisma et ajouter test integration DB. |
| Validation Chef Comptable | ✅ | `orderService.updateOrderStatus()` exige le role `Chef Comptable` et renseigne `date_validation_chef_comptable` et `id_validateur_chef_comptable`. | Ajouter test de transition depuis `Transmis au Budget` seulement. |
| Approbation Directeur Financier | ✅ | Role `Directeur Financier`, date et auteur sont renseignes pour `Approuvé`. | Ajouter test de transition depuis `Validé` seulement. |
| Rejet OT | ⚠️ | Statut `Rejeté` supporte le delien des transactions via `unlinkTransactionsFromOrder`. Pas de motif stocke. | Ajouter `motif_rejet`, `date_rejet`, `id_rejeteur` et charge utile `{ "statut_ot": "Rejeté", "motif": "..." }`. |
| Emission avec numero officiel | ❌ | Le code actuel ressemble a `OT-${antenne}-${random}`. Pas de format officiel `OT-2024BKE-001`, pas de sequence par antenne/annee. | Ajouter champ `numero_officiel`, service de numerotation et role `Agent Budget` pour emission officielle. |

Exemple actuellement supporte :

```json
{
  "statut_ot": "Validé"
}
```

## Module E - Securite et audit

| Fonctionnalite | Statut | Preuve actuelle | Action recommandee |
| --- | --- | --- | --- |
| RBAC fin | 🔧 | Gateway protege les routes avec `authorizeRoles`. Les roles existent en seed : Administrateur, Comptable, Agent Budget, Chef Comptable, Directeur Financier, Consultant. Ecart critique : les routes `/api/users` du gateway autorisent plusieurs roles, et `auth-service` ne verifie pas de role sur create/update/delete utilisateur. | Restreindre `POST/PUT/DELETE /api/users` a `Administrateur`, cote gateway et service. Ajouter tests 403. |
| Audit logs actions sensibles | ⚠️ | `auth-service` journalise login et CRUD utilisateur. Pas de logs d'import, validation OT, rejet OT, generation OT. | Ajouter `audit_logs` ou evenement local dans `transaction-service` et `order-service`, avec acteur, action, cible et diff utile. |
| Protection endpoints sensibles | ⚠️ | Gateway injecte JWT/RBAC et headers utilisateur. Les services internes ont parfois des roles metier dans la logique, mais la protection directe est incomplete. | Standardiser un middleware interne ou imposer que tous les endpoints exposes via gateway verifient `X-User-Id` et roles attendus pour les mutations sensibles. |

## Ecarts transverses API et documentation

| Point | Statut | Detail | Action |
| --- | --- | --- | --- |
| Documentation API | 🔧 | `api-complete.json` documente des chemins singuliers comme `/api/transaction/import`, `/api/order/generate`, `/api/student/{matricule}` alors que le gateway expose plutot `/api/transactions`, `/api/orders`, `/api/students`. | Regenerer l'OpenAPI a partir de l'etat courant et fixer une convention unique. |
| Modele OT miroir | ⚠️ | Le miroir OT dans `transaction-service` permet le gel, mais il depend de `/ot-status` appele par `order-service`. | Ajouter reconciliation ou outbox/event pour eviter les incoherences si l'appel HTTP echoue. |
| Donnees de reference | ⚠️ | Antennes/niveaux/statuts existent dans `student-service`, mais CRUD public ou admin absent. | Ajouter endpoints admin pour referentiels ou formaliser qu'ils sont seulement seeds/migrations. |

## Priorisation

1. Corriger le RBAC utilisateurs : seul `Administrateur` doit creer, modifier ou supprimer des utilisateurs.
2. Implementer l'import Excel/CSV reel avec validation de colonnes, rapport d'erreurs et log d'import.
3. Verrouiller le workflow OT avec transitions strictes, motif de rejet, dates/auteurs pour tous les statuts sensibles.
4. Ajouter la numerotation officielle des OT et le role d'emission `Agent Budget`.
5. Creer les endpoints KPI et solde etudiant necessaires a l'integration frontend.
6. Fiabiliser la nomenclature `TypeProduit` pour remplacer la categorisation par mots cles.
7. Regenerer la documentation OpenAPI avec les chemins reels du gateway.

## Plan d'action technique

| Lot | Fichiers a modifier ou creer | Resultat attendu |
| --- | --- | --- |
| RBAC users | `apps/gateway/src/routes/user.routes.ts`, `apps/services/auth-service/src/routes/userRoutes.ts`, tests auth/gateway | CRUD utilisateur reserve a `Administrateur`. |
| Import fichier | `apps/services/transaction-service/src/services/importParserService.ts`, `src/routes`, `src/schemas`, Prisma `ImportLog`, tests unitaires et integration | Upload Excel/CSV, mapping colonnes, nettoyage, erreurs ligne par ligne, log complet. |
| Regles produits | Prisma `TypeProduit`, seed transaction, endpoint admin optionnel | Categorie Budget/Hors Budget fiable, sans heuristique fragile. |
| Dashboard | Nouveau `apps/services/dashboard-service` ou endpoints dans `transaction-service`, routes gateway, OpenAPI | KPIs globaux, Budget/Hors Budget, filtres periode/antenne/niveau/statut. |
| Solde etudiant | `student-service` ou `transaction-service` selon ownership, endpoint gateway | Historique versements, total paye, reste a payer, validation echeances. |
| Workflow OT | `order-service/src/services/orderService.ts`, Prisma OT, tests de transition | Machine a etats stricte, rejet motive, emission officielle, Paye trace. |
| Audit metier | Shared audit client ou tables par service, middleware acteur | Logs import, generation OT, validation, approbation, rejet, paiement. |
| Documentation | `docs/04-api-documentation/api-complete.json`, Swagger par service | Contrat frontend a jour et stable. |

## Endpoints recommandes

| Endpoint | Service | But |
| --- | --- | --- |
| `POST /api/transactions/import-file` | transaction | Import Excel/CSV multipart avec rapport detaille. |
| `GET /api/transactions/imports/:id` | transaction | Consultation du log et des erreurs d'import. |
| `GET /api/dashboard/kpis` | dashboard ou transaction | Montants Budget, Hors Budget, total, nombre de flux. |
| `GET /api/dashboard/collections` | dashboard ou transaction | Agregations par periode, antenne, niveau, type recette. |
| `GET /api/students/:matricule/solde` | student ou transaction | Solde, reste a payer, historique synthese. |
| `GET /api/students/:matricule/payments` | transaction | Historique pagine des versements et OT lies. |
| `GET /api/orders/synthesis` | order | Previsualisation des OT generables avant creation. |
| `POST /api/orders/:code/issue` | order | Emission officielle par Agent Budget avec numero sequence. |
| `POST /api/orders/:code/reject` | order | Rejet motive, delien des transactions et audit. |

## Preuves de tests existants

| Service | Tests observes | Couverture utile |
| --- | --- | --- |
| auth-service | Tests login succes/echec, API health/metrics/login validation | Authentification de base, mais pas RBAC CRUD utilisateurs. |
| student-service | Tests cache, lecture, creation, conflit, update, batch lookup, validation API | Bon socle pour lookup etudiant, manque referentiels et solde. |
| transaction-service | Tests import JSON, doublons `P2002`, pagination, link/unlink OT, validation API | Import structure et liaison OT couverts, fichier Excel/CSV non couvert. |
| order-service | Tests update statut, role interdit, rejet deliant transactions, API health/status/generate interdit | Workflow partiel couvert, transitions strictes et Saga bout en bout a renforcer. |

Derniere validation locale connue : builds backend et tests unitaires/integration des quatre services passent. Le build frontend n'a pas ete valide faute de dependance `next` installee localement.

## Conclusion

Le backend est exploitable pour une integration frontend limitee : connexion, utilisateurs, consultation/creation etudiants, import JSON de transactions et generation OT de base. Pour une recette conforme aux documents d'analyse, les priorites sont l'import Excel/CSV auditable, la securite fine des utilisateurs, le workflow OT complet, les KPIs et les soldes etudiants.
