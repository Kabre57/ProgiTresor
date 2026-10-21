# Manuel utilisateur ScolarPaie et ProgiTresor

Ce manuel accompagne les agents qui gèrent les étudiants, les recettes, les ordres de traitement et les ordres de paiement. Il propose aussi un parcours de recette pour vérifier les fonctionnalités avec le compte `test.recette@progitresor.online`.

Le compte de recette possède le rôle `ADMIN`, l’accès aux modules de gestion et le niveau 4 sur les périmètres Importation, Analyse, Ordres de traitement, Budget et Administration. Les opérations restent soumises aux règles métier : données obligatoires, documents PDF, cohérence des montants et transitions de statut. Un accès administrateur ne remplace pas ces prérequis.

## Se connecter et se repérer

1. Ouvrir [la page de connexion](https://progitresor.online/login).
2. Dans **Nom d’utilisateur**, saisir `test.recette@progitresor.online`.
3. Saisir le mot de passe choisi pendant la création du compte.
4. Se connecter et ouvrir le tableau de bord.

La navigation regroupe les fonctions de pilotage, les fiches étudiants, les référentiels et l’administration. Les pages ci-dessous sont également accessibles par leur adresse, en ajoutant le chemin au domaine `https://progitresor.online`.

| Fonction | Chemin |
| --- | --- |
| Tableau de bord | `/dashboard` |
| Transactions | `/transactions` |
| Synthèse des recettes | `/dashboard/recettes` |
| Synthèses et génération des OT | `/backoffice/synthese` |
| Ordres de traitement | `/orders` |
| Étudiants | `/etudiant` |
| Bordereaux comptables | `/compta/bordereaux` |
| Gestion budgétaire et lots | `/compta/lots` |
| Ordres de paiement | `/budget/ordres-paiement` |
| Contrôle OP et OT | `/compta/controle-op` |
| Utilisateurs | `/admin/users` |
| Rôles | `/admin/roles` |
| Permissions | `/admin/permissions` |
| Paramètres du compte | `/account/settings` |
| Activité du compte | `/account/activity-log` |

Après une action, lire le message affiché, puis vérifier la ligne concernée dans la liste. Une liste vide peut résulter des filtres actifs. Réinitialiser les filtres ou utiliser **Actualiser** avant de conclure qu’un enregistrement manque.

## Préparer une recette fonctionnelle

Les validations, imports et transmissions enregistrent des opérations dans la base utilisée. Pour une recette complète, utiliser une instance et des données dédiées à la recette. Dans une instance partagée, faire identifier le périmètre de test avant les opérations financières.

Préparer une antenne, une filière, une promotion, un statut étudiant, un type de flux, un type de recette et une nomenclature cohérents. Employer des références repérables, par exemple le préfixe `RECETTE-`, lorsque les règles de saisie le permettent. Conserver les références créées pour les retrouver à chaque étape.

Le compte de recette permet de parcourir les modules de gestion. Pour vérifier que chaque métier dispose uniquement des droits attendus, réaliser ensuite des essais avec les rôles métier correspondants. Le portail étudiant nécessite un compte étudiant distinct, décrit plus loin.

## Gérer les référentiels

| Référentiel | Page | Utilité |
| --- | --- | --- |
| Antennes | `/admin/antennes` | Identifier les implantations |
| Filières | `/admin/filieres` | Classer les formations |
| Promotions | `/admin/promotions` | Définir les promotions |
| Référentiel des promotions | `/etudiant/promotions` | Consulter les promotions côté étudiants |
| Statuts | `/admin/statuts` | Qualifier la situation des étudiants |
| Types de flux | `/admin/types-flux` | Classer les mouvements |
| Types de recettes | `/admin/types-recettes` | Classer les recettes |
| Nomenclatures | `/admin/nomenclatures` | Définir les produits et montants applicables |

Ouvrir le référentiel, utiliser l’action de création, remplir les champs demandés et enregistrer. Rechercher ensuite la nouvelle valeur et vérifier qu’elle peut être sélectionnée dans les formulaires qui en dépendent. Pour modifier une valeur, ouvrir son action de modification et enregistrer les changements.

La suppression peut être refusée si une valeur est déjà utilisée. Conserver les référentiels associés aux opérations enregistrées plutôt que de modifier leur sens pour réutiliser leur code.

## Créer et consulter un étudiant

1. Ouvrir **Fiches étudiants**, puis l’action de création, ou `/etudiant/create`.
2. Renseigner le matricule et l’identité, puis les champs requis du formulaire.
3. Sélectionner les rattachements proposés, notamment la filière, l’antenne et la promotion lorsque ces champs sont présentés.
4. Enregistrer et rechercher le matricule dans la liste.
5. Ouvrir la fiche pour contrôler les informations et les données financières disponibles.
6. Utiliser la modification pour corriger un champ et vérifier sa persistance après rechargement.

La fiche d’un étudiant est accessible à `/etudiant/{matricule}` et sa modification à `/etudiant/{matricule}/edit`. Utiliser les liens de l’application pour ouvrir les matricules contenant des caractères particuliers.

## Associer les informations Trésor Pay

Deux écrans couvrent des besoins distincts : **Correspondance Trésor Pay** (`/admin/tresor-mapping`) et **Mapping Matricules** (`/admin/mapping-tresor-pay`).

Ouvrir l’écran correspondant à la correspondance à traiter. Pour les matricules, rechercher l’étudiant, vérifier son identité et renseigner le matricule Trésor Pay attendu. Enregistrer, puis contrôler que la correspondance pointe vers le bon étudiant. Consulter les notifications d’étudiants temporaires lorsqu’elles sont proposées et marquer une notification comme traitée après résolution.

Une correspondance incorrecte peut rattacher une recette au mauvais étudiant. Vérifier l’identité et les deux références avant confirmation.

## Importer et contrôler les transactions

1. Ouvrir **Transactions**, à `/transactions`.
2. Choisir **Importer des transactions** et sélectionner le fichier.
3. Utiliser un format accepté par l’écran : CSV, Excel ou JSON.
4. Vérifier le nom du fichier et le nombre de transactions détectées, puis cliquer sur **Lancer l’import fichier**.
5. Lire le bilan : nombre de transactions créées et doublons ignorés.
6. Rechercher une référence importée et contrôler son montant, sa date, son étudiant, son antenne et sa nomenclature.

Pour un fichier CSV ou Excel, les en-têtes reconnus comprennent notamment `reference`, `date`, `montant`, `matricule`, `payeur`, `filiere`, `niveau`, `antenne`, `type recette` et `type flux`. Utiliser un export conforme au format métier attendu ; les libellés financiers et les rattachements doivent correspondre aux référentiels.

Les filtres permettent de rechercher par période, référence Trésor, étudiant, produit, antenne, promotion, filière, statut étudiant, type de flux, type de recette et nomenclature. Commencer par une référence précise, puis élargir la recherche.

L’écran propose également une récupération depuis Trésor Pay. Son fonctionnement dépend de la configuration de cette intégration. Après récupération, contrôler le bilan et les références comme pour un import de fichier.

Pour corriger une transaction, ouvrir sa modification, ajuster les champs autorisés et enregistrer. Vérifier les champs **Statut Traitement** et les rattachements avant une synthèse. Tester le comportement des doublons en réimportant le même fichier de recette et en comparant le bilan au premier import.

## Consulter les indicateurs et les recettes

Le tableau de bord (`/dashboard`) présente les indicateurs de pilotage. La page **Synthèse recettes** (`/dashboard/recettes`) permet une lecture des recettes selon les filtres disponibles.

Choisir une période et un périmètre cohérents avec les transactions de recette. Comparer les montants affichés avec les transactions retenues. Pour expliquer une différence, comparer les dates, les statuts, les antennes et les catégories avant de modifier les données.

## Générer une synthèse et émettre un OT

Un **OT** est un ordre de traitement. Il provient du travail de synthèse des recettes.

1. Ouvrir **Synthèses OT**, à `/backoffice/synthese`.
2. Renseigner les filtres de synthèse, notamment la période et les rattachements proposés.
3. Cliquer sur **Générer la synthèse**.
4. Contrôler les lignes produites, le nombre de flux et le montant total. Examiner les éléments signalés hors budget ou non assignés.
5. Vérifier l’aperçu du document proposé.
6. Lorsque le résultat est correct, cliquer sur **Valider la synthèse et émettre l’OT**.
7. Vérifier la présence du résultat dans l’historique des synthèses validées, puis dans **Ordres de traitement**.

Une validation produit une opération enregistrée. Si les lignes ou les montants sont incorrects, corriger les données sources et régénérer le résultat avant de valider.

## Suivre les ordres de traitement

Ouvrir `/orders`, rechercher l’OT et consulter ses détails. Vérifier la référence, le montant, le statut et le document associé avant toute action.

Les actions disponibles dépendent de l’état de l’OT et des droits du compte. L’écran propose notamment des changements de statut, la validation et la transmission vers le circuit Compta et Budget. Pour une action groupée, sélectionner les OT concernés et examiner le résultat de chaque ligne : un traitement groupé peut réussir pour certains OT et échouer pour d’autres.

Si le serveur indique qu’un PDF est obligatoire avant transmission, revenir à la synthèse correspondante et vérifier sa validation ainsi que la disponibilité du document. Pour une correction, utiliser l’action de création d’une nouvelle version lorsqu’elle est proposée, puis suivre la nouvelle référence.

## Traiter les bordereaux et les lots

### Consulter les bordereaux comptables

Ouvrir `/compta/bordereaux`. Examiner les références, les écritures, les montants et les statuts. Ouvrir un bordereau pour vérifier son contenu. L’action **Créer un lot** ouvre le formulaire de lot de traitement ; renseigner les champs demandés et confirmer avec **Créer le lot**.

### Gérer et imputer les lots

La page `/compta/lots` porte le titre **Gestion Budgétaire**.

1. Filtrer les écritures reçues en attente par antenne, recette et période selon le besoin.
2. Sélectionner les écritures à regrouper.
3. Créer le bordereau ou lot en renseignant sa référence et, si nécessaire, ses remarques.
4. Vérifier les écritures et le montant du regroupement.
5. Utiliser **Traiter / Imputer**, choisir une ligne budgétaire et confirmer avec **Traiter et imputer**.
6. Lorsque le lot est prêt, utiliser l’action **Transmettre OP**.
7. Vérifier le nouveau statut et les éléments transmis.

L’écran propose aussi la gestion d’une ligne budgétaire hors budget ainsi que des exports CSV et PDF. Vérifier les filtres actifs avant d’exporter, puis ouvrir le fichier pour comparer les références et les montants à l’écran.

## Consulter les OP et contrôler leur cohérence

Un **OP** est un ordre de paiement. Ouvrir `/budget/ordres-paiement`, filtrer les enregistrements et consulter le détail de l’OP concerné. Vérifier les lignes, les références et les montants. Utiliser **Transmettre à la Compta** lorsque l’action est disponible, puis vérifier le résultat et le statut.

Ouvrir ensuite `/compta/controle-op`. La page affiche les contrôles entre OP et OT : montant OT, montant OP, écart, nombre de lignes et statut du contrôle. Cliquer sur **Actualiser** pour recharger les résultats.

Un résultat **CONFORME** et un écart nul indiquent une concordance pour le contrôle enregistré. En présence d’un résultat **ECART**, identifier l’OP, l’OT, le lot et les montants concernés avant de poursuivre le traitement.

## Administrer les comptes et les droits

### Créer ou modifier un utilisateur

1. Ouvrir `/admin/users`, puis l’action de création.
2. Renseigner **Nom**, **Prénom**, **Nom utilisateur**, **Email**, **Mot de passe**, **Rôle** et **Service**.
3. Vérifier la case **Actif**, puis cliquer sur **Enregistrer**.
4. Retrouver le compte dans la liste et vérifier ses informations.

La connexion utilise **Nom utilisateur**. Pour une connexion par adresse e-mail, saisir la même adresse dans **Nom utilisateur** et **Email**. Un compte étudiant utilise son matricule comme nom d’utilisateur.

La modification permet notamment de changer les informations et de renseigner un nouveau mot de passe. Pour suspendre un compte, décocher **Actif**, enregistrer et vérifier que la nouvelle connexion est refusée.

### Vérifier les rôles et les permissions

Ouvrir `/admin/roles` pour gérer les rôles et leurs permissions, puis `/admin/permissions` pour consulter ou gérer les permissions. Les accès dépendent à la fois du rôle et des niveaux accordés sur les périmètres.

Le compte de recette créé par le script reçoit le rôle `ADMIN` et le niveau 4 sur les cinq périmètres existants. Pour tester une restriction métier, utiliser un compte dédié avec le rôle et les niveaux visés plutôt que de modifier le rôle administrateur partagé.

## Tester le portail étudiant

Le compte administrateur ne possède pas de profil étudiant personnel. Une vérification de **Ma scolarité**, **Mes attestations**, **Mon profil** et des notifications nécessite un autre compte.

1. Créer ou choisir une fiche étudiant de recette et noter son matricule exact.
2. Vérifier qu’un rôle de code `ETUDIANT` existe dans l’administration des rôles ; le créer s’il manque, avec le libellé **Étudiant**.
3. Créer un utilisateur actif avec ce rôle et le matricule exact comme **Nom utilisateur**.
4. Ouvrir une session distincte, par exemple une fenêtre privée, et se connecter avec ce compte.
5. Ouvrir `/etudiant/portail`, puis les pages `/etudiant/scolarite`, `/etudiant/attestations`, `/etudiant/profile`, `/etudiant/security` et `/etudiant/notifications`.
6. Vérifier que les informations, paiements et documents concernent uniquement cet étudiant.

Une réponse 404 sur `/api/etudiant/me` pour un compte étudiant demande de vérifier la correspondance entre son nom d’utilisateur et le matricule de la fiche. L’absence d’appel à cette route pour l’administrateur est attendue.

## Gérer son compte et terminer la session

Ouvrir `/account/settings` pour consulter et modifier les paramètres proposés pour le compte. Après une modification, enregistrer puis recharger la page pour vérifier les valeurs. La page `/account/activity-log` permet d’ouvrir l’écran d’activité du compte.

Utiliser la déconnexion à la fin d’une session de recette. Pour tester la fermeture de session, tenter de rouvrir une page protégée et vérifier que l’application demande une connexion.

## Parcours de recette à compléter

Inscrire pour chaque étape la date, la référence testée, le résultat observé et, en cas d’anomalie, le message exact. Les cases ci-dessous sont à cocher après exécution.

- [ ] Connexion du testeur réussie et tableau de bord accessible.
- [ ] Création et modification d’une valeur dans chaque référentiel utilisé.
- [ ] Création, recherche, consultation et modification d’un étudiant.
- [ ] Correspondance Trésor Pay associée au bon étudiant.
- [ ] Import d’un fichier de recette et contrôle de chaque ligne retenue.
- [ ] Réimport du même fichier et vérification des doublons.
- [ ] Recherche des transactions par référence, période et rattachement.
- [ ] Comparaison des totaux entre transactions et synthèse des recettes.
- [ ] Génération de synthèse, aperçu du document et validation.
- [ ] OT visible dans l’historique et la liste des ordres.
- [ ] Transmission des OT et vérification des résultats individuels.
- [ ] Bordereau et lot créés avec les écritures attendues.
- [ ] Lot imputé et transmission effectuée.
- [ ] OP consulté et transmis à la comptabilité.
- [ ] Contrôle OP et OT examiné, montants et nombres de lignes concordants.
- [ ] Exports et documents ouverts, références et montants vérifiés.
- [ ] Création et modification d’un utilisateur de recette secondaire.
- [ ] Désactivation du compte secondaire et nouvelle connexion refusée.
- [ ] Permissions métier vérifiées avec des comptes dédiés.
- [ ] Portail étudiant vérifié dans une session distincte.
- [ ] Modification du profil personnel et déconnexion vérifiées.

## Comprendre les erreurs courantes

| Situation | Vérification à effectuer |
| --- | --- |
| Identifiants refusés | Vérifier le nom d’utilisateur exact, le mot de passe et la case Actif |
| Réponse 401 | Se reconnecter et vérifier que les cookies sont autorisés |
| Réponse 403 | Vérifier le rôle, les niveaux de périmètre et les exclusions |
| Réponse 404 sur la connexion | Faire vérifier le routage Nginx de `/api/` vers la gateway |
| Réponse 404 sur le profil étudiant | Vérifier le matricule utilisé comme identifiant et l’existence de sa fiche |
| Liste vide | Réinitialiser les filtres et contrôler la période ou le statut |
| Transmission refusée pour PDF manquant | Vérifier la validation de la synthèse et le document de l’OT |
| Écart entre OP et OT | Comparer les références, lignes, montants et lots concernés |
| `ERR_BLOCKED_BY_CLIENT` sur Google Analytics | Un bloqueur côté navigateur peut bloquer la mesure d’audience ; examiner séparément les erreurs des routes `/api/` |

Pour signaler une anomalie, fournir la page, l’heure, le compte et son rôle, la référence concernée, les étapes réalisées, le résultat attendu et le message reçu. Ne pas inclure de mot de passe ou de jeton de session.
