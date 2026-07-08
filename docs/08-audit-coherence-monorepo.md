# Audit de coherence du monorepo ProgiTresor

Date d'audit : 2026-06-17

Perimetre : `auth-service`, `student-service`, `transaction-service`, `order-service`, `compta-service`, `gateway`, `shared/types`, schemas Prisma, seeds, Docker et livrables `docs/`.

References utilisees :
- document joint de cadrage : dictionnaire cible, 19 tables, 3NF, references interservices scalaires ;
- `/home/hp/Documents/Recette/docs/Schéma de Base de Données Complet et Dictionnaire de Données.md` ;
- schemas et seeds Prisma de chaque service ;
- builds Docker avec regeneration du client Prisma dans l'image.

## Synthese globale

| Indicateur | Resultat |
| --- | --- |
| Services verifies | 5 |
| Services dont le build Docker passe | 1 / 5 (`compta-service`) |
| Services bloques par incoherence schema/code | 4 / 5 (`auth`, `student`, `transaction`, `order`) |
| Schemas Prisma presents | 5 / 5 |
| Seeds presents | 5 / 5 |
| Services avec structure `tests/unit` + `tests/integration` | 4 / 5 |
| Services avec `.env.example` | 2 / 5 |
| Services exposes par le gateway | 4 / 5 (`compta-service` absent) |

Etat general : ❌ non pret pour integration/recette. Les schemas Prisma ont bien evolue vers une structure plus normalisee, mais le code applicatif, les DTO partages, les migrations, les Swagger et le gateway ne sont pas encore alignes.

## Corrections appliquees pendant l'audit

| Fichier | Correction |
| --- | --- |
| `apps/services/compta-service/Dockerfile` | Alignement des `COPY` sur `build.context: .`, ajout `openssl`, commande `CMD ["/bin/sh", "entrypoint.sh"]`, verification `dist/index.js`. |
| `docker-compose.yml` | Ajout du healthcheck `compta-service` sur `http://localhost:5005/health`. |
| `init-db.sh` | Ajout de `CREATE DATABASE progi_compta;`. Attention : sur un volume PostgreSQL deja initialise, le script init ne se relance pas automatiquement. |
| `apps/services/compta-service/src/*` | Export du schema Zod `ecritureCreateSchema`, typage Express `req.userId/req.userRole`, typage Prisma des filtres. |

Validation : `docker compose build compta-service` passe apres correction.

## Resultats de build Docker

| Service | Statut | Preuve |
| --- | --- | --- |
| `auth-service` | ❌ | Echec TypeScript apres `prisma generate` : code encore base sur `user`, `auditLog`, `nom_role`, `id_role`, alors que le schema expose `utilisateur`, `journalAudit`, `Role.code/id`. |
| `student-service` | ❌ | Echec TypeScript : `PrismaClient.student` n'existe plus avec le schema actuel ; le modele est `Etudiant`. |
| `transaction-service` | ❌ | Echec TypeScript : code base sur `reference_tresor`, `code_ot`, `id_transaction`, `typeProduit`, `ordreTraitement`, alors que le schema actuel expose `ref_tresor`, `ImportFichier`, `OrdreTraitementMiroir` et `ordre_traitement_id`. |
| `order-service` | ❌ | Echec TypeScript : repository cree/met a jour des champs `id_antenne`, `id_niveau`, `type_recette`, `statut_ot`, alors que le schema attend `antenne_id`, `niveau_id`, `type_recette_id`, `statut`, `synthese_id`, `cree_par_id`. |
| `compta-service` | ✅ | Build Docker OK, client Prisma genere, TypeScript compile, image produite. |

## Audit par service

### auth-service

| Point verifie | Statut | Constat | Recommandation |
| --- | --- | --- | --- |
| Structure dossiers | ⚠️ | `controllers`, `services`, `repositories`, `middlewares`, `utils`, tests presents. Dossier `src/routes` absent : routes definies dans `app.ts`. | Extraire les routes dans `src/routes/` pour respecter la structure cible. |
| Schema Prisma | ⚠️ | Schema cible avec `Role`, `Permission`, `RolePermission`, `Utilisateur`, `JournalAudit`. `nom` et `prenom` sont presents. | Choisir definitivement les noms Prisma (`Utilisateur`, `JournalAudit`) et aligner tout le code. |
| Migrations | ❌ | Les migrations creent encore `utilisateurs`, `roles`, `audit_logs` avec anciens champs (`id_utilisateur`, `nom_role`, etc.), differents du schema actuel (`role`, `utilisateur`, `journal_audit`). | Regenerer une migration coherente depuis le schema cible ou creer une migration de transition propre. |
| Seed | ⚠️ | `upsert` utilise. Pas de garde production. Roles seedes : `ADMIN`, `COMPTABLE`, `BUDGET`, `CONSULTATION`; roles gateway attendus : `Administrateur`, `Comptable`, `Chef Comptable`, `Directeur Financier`, `Agent Budget`, `Consultant`. | Ajouter garde production et harmoniser les roles avec le gateway et les permissions. |
| Code vs schema | ❌ | `userRepository.ts` utilise `getClient().user`, `auditLog`, `nom_role`, `id_role`. Ces entites/champs n'existent pas dans le client genere. | Refactorer repository/service vers `utilisateur`, `journalAudit`, `Role.code/libelle/id`. |
| Config racine | ✅ | `package.json`, `tsconfig.json`, `Dockerfile`, `entrypoint.sh`, `.env.example` presents. | Remplacer le `sleep 5` de l'entrypoint par une attente active PostgreSQL. |
| Tests | ⚠️ | Tests presents, mais non probants tant que le build echoue apres regeneration Prisma. | Corriger build puis relancer tests unitaires et integration. |

### student-service

| Point verifie | Statut | Constat | Recommandation |
| --- | --- | --- | --- |
| Structure dossiers | ⚠️ | Dossiers principaux presents, mais pas de `src/routes`. `.env.example` absent. | Ajouter `.env.example` et extraire les routes. |
| Schema Prisma | ⚠️ | Tables reference `Antenne`, `Niveau`, `StatutEtudiant`, `TypeFlux`, `TypeRecette`, `NomenclatureProduit`, `Etudiant`. `nom` et `prenom` presents. | Stabiliser le contrat : le schema utilise `matricule`, le code/shared utilise `matricule_etudiant`. |
| Migrations | ❌ | Migrations historiques creent `antennes`, `niveaux_etude`, `statuts_etudiant`, `etudiants` avec `nom_complet`; schema actuel mappe `antenne`, `niveau`, `statut_etudiant`, `etudiant` avec `nom/prenom`. | Regenerer les migrations ou ajouter une migration de renommage complete. |
| Seed | ⚠️ | Referentiels et exemples presents avec `upsert`. Pas de garde production. Jeu d'exemple limite. | Ajouter garde production, completer les nomenclatures et verifier les antennes des exemples. |
| Code vs schema | ❌ | Repository utilise `PrismaClient.student`, `matricule_etudiant`, `nom_complet`, `id_antenne`, `id_niveau`; client genere expose `etudiant`, `matricule`, `nom`, `prenom`, `antenne_id`, `niveau_id`. | Refactorer repository, service, controllers, DTO et Swagger. |
| Tests | ⚠️ | `tests/unit` et `tests/integration` presents. | Adapter aux nouveaux noms et relancer apres build vert. |

### transaction-service

| Point verifie | Statut | Constat | Recommandation |
| --- | --- | --- | --- |
| Structure dossiers | ⚠️ | Dossiers principaux presents, plus `src/triggers`. Pas de `src/routes`. `.env.example` absent. | Ajouter `.env.example` et extraire les routes. |
| Schema Prisma | ⚠️ | `ImportFichier`, `Transaction`, `OrdreTraitementMiroir` presents. `relationMode = "prisma"` evite les FKs physiques hors service. | Clarifier le contrat interservices : le document cite `code_ot`, le schema utilise `ordre_traitement_id`. |
| Migrations | ❌ | Migration historique cree `types_produit`, `ordres_de_traitement`, `transactions` avec `reference_tresor`, `code_ot`; schema actuel n'a plus ces tables/champs. | Regenerer migration cible et adapter trigger `gel-transaction.sql` au nouveau miroir OT. |
| Seed | ⚠️ | Import et transactions exemples presents avec `upsert`. Pas de garde production. | Ajouter garde production et exemples Budget/Hors Budget plus complets. |
| Code vs schema | ❌ | Repository/service encore bases sur `typeProduit`, `ordreTraitement`, `reference_tresor`, `id_transaction`, `code_ot`, `produit`. | Revoir import, linking OT, miroir OT et DTO selon `ImportFichier`, `ref_tresor`, `ordre_traitement_id`. |
| Tests | ⚠️ | Tests presents, mais couverts sur l'ancien modele. | Reecrire tests autour de `ImportFichier`, affectation, gel et miroir OT cible. |

### order-service

| Point verifie | Statut | Constat | Recommandation |
| --- | --- | --- | --- |
| Structure dossiers | ⚠️ | Dossiers principaux presents, mais pas de `src/routes`. `.env.example` absent. | Ajouter `.env.example` et extraire routes. |
| Schema Prisma | ⚠️ | `SyntheseOT` et `OrdreTraitement` presents, relation locale correcte. References auth/student en scalaires. | Completer les champs workflow si le modele cible conserve validation, approbation, rejet, paiement. |
| Migrations | ❌ | Migration historique cree seulement `ordres_de_traitement` avec `statut_ot`; schema actuel introduit `synthese_ot`, `synthese_id`, `statut`. | Regenerer migrations et prevoir migration de donnees depuis l'ancien OT. |
| Seed | ⚠️ | Synthese et OT exemples avec `upsert`. Pas de garde production. | Ajouter garde production et exemples pour tous statuts utiles. |
| Code vs schema | ❌ | Repository/Saga utilisent les anciens champs `id_antenne`, `id_niveau`, `type_recette`, `statut_ot`; schema attend `antenne_id`, `niveau_id`, `type_recette_id`, `statut`, `synthese_id`. | Refactorer Saga, repository, shared DTO, Swagger et logique workflow. |
| Tests | ⚠️ | Tests presents, mais cibles l'ancien modele OT. | Adapter aux nouveaux statuts et a `SyntheseOT`. |

### compta-service

| Point verifie | Statut | Constat | Recommandation |
| --- | --- | --- | --- |
| Structure dossiers | ⚠️ | `controllers`, `services`, `repositories`, `middlewares`, `utils`, `routes` presents. Tests dans `__tests__/unit` et `__tests__/integration`, pas dans `tests/unit` et `tests/integration`. | Renommer `__tests__` en `tests` ou ajuster la convention cible. |
| Schema Prisma | ⚠️ | `CompteComptable` et `EcritureComptable` presents. Relation locale compte debit/credit OK. `ordre_traitement_id` est scalaire, conforme microservices, mais le commentaire parle de reference textuelle alors que le type est `Int`. | Corriger le commentaire ou utiliser un champ `code_ot` textuel si le contrat interservices doit rester sur le code OT. |
| Migrations | ❌ | Aucun dossier `prisma/migrations`; entrypoint utilise `prisma db push --accept-data-loss`. | Creer une migration initiale et remplacer `db push --accept-data-loss` par `prisma migrate deploy`. |
| Seed | ✅ | Garde production presente, comptes comptables seedes par `upsert`, ecriture exemple conditionnelle. | Ajouter plus de comptes SYSCOHADA si besoin metier. |
| Code vs schema | ✅ | Build TypeScript OK apres correction du schema Zod et des types Express/Prisma. | Ajouter tests de compilation dans CI. |
| Docker | ✅ | Build OK, port 5005 expose, healthcheck compose ajoute. | Verifier demarrage complet avec PostgreSQL apres creation de `progi_compta`. |
| Gateway | ❌ | Aucun routeur gateway pour `compta-service`. | Ajouter `apps/gateway/src/routes/compta.routes.ts`, `COMPTA_SERVICE_URL` et l'entree dans `allRoutes`. |
| Documentation | ❌ | `src/generate-docs.ts` semble copie de `student-service` : titre et schemas Student. | Regenerer OpenAPI compta avec comptes/ecritures. |

## Ecarts interservices

| Ecart | Impact | Action |
| --- | --- | --- |
| Vocabulaire de roles incoherent | Le gateway attend des libelles francais, le seed auth cree des codes `ADMIN`, `BUDGET`, etc., et il manque plusieurs roles operationnels. | Definir une source unique : `Role.code` stable et `Role.libelle` affiche. Le JWT doit transporter la valeur que le gateway verifie. |
| DTO partages obsoletes | `shared/types` expose encore `nom_complet`, `reference_tresor`, `statut_ot`, `id_antenne`, `id_niveau`. | Mettre a jour `shared/types` apres figer les noms Prisma/API. |
| Migrations non alignees | Les conteneurs historiques executent `migrate deploy`, donc la DB peut etre creee selon l'ancien modele meme si `schema.prisma` est nouveau. | Refaire les migrations avant toute recette Docker. |
| Documentation API obsolete | Swagger et `api-complete.json` decrivent encore l'ancien contrat. | Regenerer OpenAPI apres refactor code/schema. |
| `compta-service` non expose | Le service build, mais il n'est pas joignable via `/api/...` depuis le gateway. | Ajouter route gateway dediee. |
| Docs de conception non mises a jour | Les docs repo contiennent encore `nom_complet`, `reference_tresor`, `statut_ot`. | Mettre a jour dictionnaire, Mermaid, PlantUML et API pour refleter le modele cible. |
| Bases Docker | `init-db.sh` ne creait pas `progi_compta` avant correction. | Pour une base deja initialisee, creer la DB manuellement ou recreer le volume. |

## Priorites recommandees

1. Figer le dictionnaire cible final : noms Prisma, noms SQL, noms API et noms de champs interservices.
2. Regenerer ou corriger les migrations de chaque service avant toute execution Docker.
3. Refactorer `auth-service`, puis `student-service`, puis `transaction-service`, puis `order-service` pour compiler avec le client Prisma genere.
4. Mettre a jour `shared/types` et Swagger seulement apres refactor des repositories/services.
5. Harmoniser les roles entre `auth-service`, JWT, gateway et seeds.
6. Ajouter la route gateway de `compta-service`.
7. Ajouter les gardes production dans tous les seeds.
8. Standardiser la structure `src/routes` et `tests/unit|integration`.
9. Relancer ensuite : builds Docker des 5 services, tests unitaires/integration, puis demarrage compose et healthchecks.

## Verdict

Le modele Prisma vise maintenant davantage la 3NF, mais le monorepo est dans un etat de transition : schemas, migrations, code, DTO, docs et gateway ne racontent pas encore la meme histoire. La prochaine etape ne doit pas etre la recette fonctionnelle ; elle doit etre une passe d'alignement technique schema-code-migrations, avec validation Docker service par service.
