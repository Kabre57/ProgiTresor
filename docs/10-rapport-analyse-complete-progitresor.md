# Rapport d'analyse complète - ProgiTresor

Date d'analyse : 2026-06-25  
Périmètre : `apps/frontend`, `apps/gateway`, `apps/services/auth-service`, `student-service`, `transaction-service`, `order-service`, `shared`, `docs`, Docker/Makefile.  
Objectif : évaluer la maturité de ProgiTresor / Trésor Pay pour une mise en production et prioriser les corrections.

## 1. Synthèse exécutive

**Note globale : 5,8 / 10.**  
Le projet est un **prototype avancé / socle de pré-recette**, avec de vrais choix d'architecture déjà posés : microservices, base par service, Prisma, Zod, Pino, Redis, Saga, gateway RBAC, frontend Next.js 16 avec Ecme, React Query et Zustand. Il couvre une grande partie des écrans attendus et plusieurs workflows métier sont déjà présents.

Il n'est toutefois **pas prêt pour une mise en production**. Les risques les plus forts concernent la sécurité opérationnelle, la reproductibilité des bases, la cohérence interservices OT/transactions, et des écarts de contrat entre frontend et backend sur des workflows clés.

### Forces principales

- Architecture modulaire lisible : services séparés pour auth, étudiants, transactions, ordres de traitement.
- Modélisation métier intéressante : double matricule étudiant / Trésor Pay, étudiants temporaires, OT miroir, gel de transactions, référentiels.
- Validation Zod largement présente côté backend.
- Logs Pino avec redaction dans le gateway et les services.
- Index Prisma sur les principales colonnes de recherche et rattachement.
- Bulk insert `createMany({ skipDuplicates: true })` pour les imports.
- Export transactions en streaming par curseur et batch de 5000.
- Dockerfiles multi-stage avec utilisateurs non-root.
- Tests unitaires/intégration backend présents et passants.
- Frontend fonctionnel, avec pages dashboard, transactions, étudiants, référentiels, OT, portail étudiant.

### Faiblesses bloquantes

- Secrets et mots de passe hardcodés dans `docker-compose.yml`, avec secrets JWT de fallback dans le code.
- Services internes exposés directement sur l'hôte et plusieurs routes service-level non protégées.
- Entrypoints qui exécutent `prisma db push --accept-data-loss` et seeds par défaut au démarrage.
- Migrations absentes pour `auth-service`, `transaction-service` et `order-service`.
- Synchronisation OT/transactions cassable : route `/ot-status` masquée par `/:id`, statut local mis à jour avant synchro, trigger de gel non migré.
- Bug métier dans la Saga : regroupement OT par `niveauId = etudiantId` et `typeRecetteId = nomenclatureId`.
- Contrat d'import transactions cassé entre frontend et backend.
- Statuts OT proposés par le frontend incompatibles avec les statuts validés par le backend.
- Stockage des tokens en `localStorage` et cookie JavaScript non `HttpOnly`.
- Build local de `student-service` rouge dans l'état observé.

## 2. Validation exécutée

| Vérification | Résultat |
|---|---|
| `npm run build` gateway | OK |
| `npm run build` auth-service | OK |
| `npm run build` transaction-service | OK |
| `npm run build` order-service | OK |
| `npm run build` student-service | KO : `TS2688 Cannot find type definition file for 'multer'` |
| `npm run build` frontend | OK après exécution hors sandbox ; warning ESM sur `tailwind.config.js` |
| Tests backend | 39 tests passants : auth 6, student 13, transaction 9, order 11 |
| Tests frontend | Aucun test applicatif trouvé dans `apps/frontend/src` ; pas de script `test` dans `apps/frontend/package.json` |
| CI/CD | Aucun workflow CI détecté |

## 3. Évaluation par domaine

| Domaine | Note | Justification |
|---|---:|---|
| Architecture et conception | 6,0 / 10 | Découpage cohérent et base par service, mais dépendance forte au HTTP synchrone, contrats internes fragiles, Saga incomplète, absence d'outbox/idempotence robuste. |
| Qualité du code | 6,0 / 10 | TypeScript strict et Zod sont présents, mais beaucoup de `any`, build rouge côté student-service, doublons frontend, contrats frontend/backend divergents. |
| Sécurité | 4,0 / 10 | JWT/RBAC existants, mais secrets hardcodés, tokens en `localStorage`, services exposés, CORS ouvert, rate limit trop permissif, routes internes insuffisamment protégées. |
| Performance et scalabilité | 6,5 / 10 | Index, Redis TTL, bulk insert, pagination et export streaming sont de bons points. Limites : filtres dépendants du student-service, export synthèse non streaming, pas de stratégie pool/load balancing. |
| Résilience et fiabilité | 5,0 / 10 | Healthchecks, graceful shutdown, retries Axios et métriques existent. Mais Saga non transactionnelle, synchro OT fragile, trigger non garanti, absence de circuit breaker/outbox. |
| Fonctionnalités métier | 6,0 / 10 | Beaucoup de modules sont visibles. Mais import Trésor Pay réel non branché, import UI cassé, OT regroupés incorrectement, attestations/non-redevance non finalisées. |
| Frontend Next.js | 6,0 / 10 | Bon socle Ecme/Next/React Query/Zustand et écrans nombreux. Faiblesses : RBAC route non appliqué, stockage tokens fragile, formulaires OT/import incompatibles backend, pas de tests. |
| DevOps et déploiement | 4,0 / 10 | Dockerfiles propres, compose utile localement. Bloquants : `db push --accept-data-loss`, ports internes exposés, secrets hardcodés, Makefile/docs stale, pas de CI/CD. |
| Documentation et maintenabilité | 6,0 / 10 | README, ADR, dictionnaire, OpenAPI et Postman existent. Mais des docs restent obsolètes avec `compta-service`, certains contrats OpenAPI ne reflètent pas l'état réel. |

## 4. Analyse détaillée par axe

### 4.1 Architecture et conception

Le découpage actuel est globalement cohérent :

- `auth-service` porte utilisateurs, rôles, permissions, audit et refresh tokens.
- `student-service` porte étudiants, double matricule, référentiels, promotions, cache Redis.
- `transaction-service` porte imports, rattachements, filtres, exports, KPI, OT miroir.
- `order-service` porte synthèse OT, workflow de validation et Saga.
- `gateway` centralise auth JWT, RBAC et proxy.

Le choix "base par service" est respecté dans les schémas Prisma. Les références interservices restent scalaires (`etudiantId`, `antenneId`, `nomenclatureId`, `ordreTraitementId`) dans `transaction-service` (`apps/services/transaction-service/prisma/schema.prisma:32`, `apps/services/transaction-service/prisma/schema.prisma:38`) et `order-service` (`apps/services/order-service/prisma/schema.prisma:34`).

Les principaux défauts d'architecture sont :

- Les services internes font confiance aux headers injectés par le gateway, mais les ports internes sont exposés dans Docker (`docker-compose.yml:57`, `docker-compose.yml:73`, `docker-compose.yml:91`, `docker-compose.yml:107`).
- Le middleware étudiant indique explicitement que l'absence de headers ne bloque pas la requête (`apps/services/student-service/src/middlewares/authMiddleware.ts:16`).
- Les mutations interservices ne sont pas protégées par un mécanisme service-to-service fort.
- La Saga OT n'est pas suffisamment fiable : pas d'outbox, pas de verrou métier global, état Redis sans TTL, rollback partiel.
- Le regroupement Saga contient un bug de mapping métier majeur (`apps/services/order-service/src/services/sagaCoordinator.ts:57`, `apps/services/order-service/src/services/sagaCoordinator.ts:58`, `apps/services/order-service/src/services/sagaCoordinator.ts:59`).

### 4.2 Qualité du code

Points positifs :

- TypeScript strict est activé dans plusieurs services.
- Zod est utilisé pour les DTO partagés, par exemple import transactions (`shared/types/transaction.types.ts:44`) et statuts OT (`shared/types/order.types.ts:15`).
- Les repositories isolent une partie des accès Prisma.
- Les erreurs métier personnalisées et middlewares globaux sont présents.
- Les tests backend existent en unitaires et intégration.

Points faibles :

- Usage récurrent de `any` dans les imports/filtres : `shared/types/transaction.types.ts:10`, `apps/services/transaction-service/src/utils/filterBuilder.ts:29`, `apps/services/student-service/src/services/studentService.ts:115`, `apps/frontend/src/lib/api/transactionApi.ts:16`.
- Le build `student-service` échoue localement à cause de `@types/multer` : `typeRoots` force `./node_modules/@types` (`apps/services/student-service/tsconfig.json:15`), `@types/multer` est déclaré (`apps/services/student-service/package.json:38`) mais aucun fichier n'est présent dans le dossier local observé.
- Les types frontend OT sont trop permissifs (`[key: string]: unknown`) dans `apps/frontend/src/types/order.types.ts:10`.
- Le frontend contient encore des composants Ecme génériques et anciens composants custom en parallèle, ce qui augmente la dette de maintenance.

### 4.3 Sécurité

Le socle JWT/RBAC existe : le gateway vérifie le token (`apps/gateway/src/server.ts:139`) et mappe les rôles courts vers libellés métier (`apps/gateway/src/server.ts:163`). Les services auth exposent rôles/permissions avec contrôle admin.

Mais la sécurité de production est insuffisante :

- Secrets hardcodés : PostgreSQL (`docker-compose.yml:8`, `docker-compose.yml:9`) et JWT (`docker-compose.yml:40`, `docker-compose.yml:62`).
- Secrets JWT par défaut dans le code auth (`apps/services/auth-service/src/services/authService.ts:9`, `apps/services/auth-service/src/services/authService.ts:10`, `apps/services/auth-service/src/middlewares/authMiddleware.ts:5`).
- Refresh token stocké en clair dans la base (`apps/services/auth-service/src/services/authService.ts:84`, `apps/services/auth-service/prisma/schema.prisma:78`).
- Tokens frontend stockés en `localStorage` (`apps/frontend/src/lib/store/useAuthStore.ts:54`, `apps/frontend/src/lib/store/useAuthStore.ts:71`) et copiés en cookie JavaScript non `HttpOnly` (`apps/frontend/src/lib/store/useAuthStore.ts:24`).
- Middleware Next ne vérifie que la présence du cookie (`apps/frontend/src/proxy.ts:8`, `apps/frontend/src/proxy.ts:15`).
- CORS ouvert côté gateway (`apps/gateway/src/server.ts:101`) et services.
- Rate limit très permissif : 10 000 requêtes / 15 min / IP (`apps/gateway/src/server.ts:117`).

### 4.4 Performance et scalabilité

Points positifs :

- Index sur étudiants (`apps/services/student-service/prisma/schema.prisma:72`) et transactions (`apps/services/transaction-service/prisma/schema.prisma:46`).
- Cache Redis étudiant avec TTL 600 secondes (`apps/services/student-service/src/services/studentService.ts:8`, `apps/services/student-service/src/services/studentService.ts:48`).
- Lookup batch étudiants avec `mGet` et pipeline Redis (`apps/services/student-service/src/services/studentService.ts:64`, `apps/services/student-service/src/services/studentService.ts:98`).
- Import transactions avec déduplication et `createMany` (`apps/services/transaction-service/src/services/transactionService.ts:183`).
- Export transactions en streaming HTTP par curseur (`apps/services/transaction-service/src/controllers/dashboardController.ts:180`, `apps/services/transaction-service/src/controllers/dashboardController.ts:183`, `apps/services/transaction-service/src/controllers/dashboardController.ts:261`).

Limites :

- `exportSynthese` accumule tout en mémoire puis `res.send(csvRows.join('\n'))` (`apps/services/transaction-service/src/controllers/dashboardController.ts:467`, `apps/services/transaction-service/src/controllers/dashboardController.ts:489`).
- Le streaming transactions ne gère pas le backpressure de `res.write`.
- Les filtres transactions avec étudiant/promotion dépendent d'un appel au `student-service`; si l'appel échoue, le service retourne silencieusement `in: []` (`apps/services/transaction-service/src/utils/filterBuilder.ts:123`, `apps/services/transaction-service/src/utils/filterBuilder.ts:127`).
- Pas de configuration explicite de pool PostgreSQL ou PgBouncer.
- Pas de stratégie d'éviction Redis documentée.

### 4.5 Résilience et fiabilité

Points positifs :

- Healthchecks `/health` et `/metrics` côté gateway/services.
- Graceful shutdown avec déconnexion Prisma/Redis dans les services (`apps/services/transaction-service/src/index.ts:11`, `apps/services/order-service/src/index.ts:12`, `apps/services/student-service/src/index.ts:12`).
- Retry Axios exponentiel dans `order-service` (`apps/services/order-service/src/utils/httpClient.ts:10`, `apps/services/order-service/src/utils/httpClient.ts:11`).
- État Saga persisté dans Redis (`apps/services/order-service/src/services/sagaCoordinator.ts:151`).

Limites critiques :

- La route `PUT /ot-status` de `transaction-service` est définie après `PUT /:id`, donc Express peut router `/ot-status` vers `updateTransaction` (`apps/services/transaction-service/src/app.ts:186`, `apps/services/transaction-service/src/app.ts:191`).
- `order-service` met à jour l'OT localement avant de synchroniser le miroir transaction (`apps/services/order-service/src/services/orderService.ts:76`, `apps/services/order-service/src/services/orderService.ts:78`).
- Le trigger de gel est dans un SQL séparé (`apps/services/transaction-service/src/triggers/gel-transaction.sql:40`) mais il n'est pas intégré à une migration et l'entrypoint ne l'exécute pas.
- L'état Saga Redis n'a pas de TTL (`apps/services/order-service/src/services/sagaCoordinator.ts:153`).

### 4.6 Fonctionnalités métier

Fonctionnalités présentes :

- CRUD étudiants, référentiels, promotions.
- Double matricule : interne `matricule` et `matriculeTresorPay` unique (`apps/services/student-service/prisma/schema.prisma:54`, `apps/services/student-service/prisma/schema.prisma:68`).
- Étudiants temporaires et notifications.
- Fusion / rattachement d'un étudiant temporaire vers un étudiant réel avec merge transactionnel côté `transaction-service` (`apps/services/student-service/src/services/studentService.ts:296`).
- Import transactions, rattachement étudiant, nomenclature, exports, KPI.
- Synthèse recettes et OT hors budget.
- Portail étudiant pour renseigner le matricule Trésor Pay.

Écarts métier importants :

- Le endpoint "Récupérer depuis Trésor Pay" utilise des données codées en dur (`apps/services/transaction-service/src/controllers/transactionController.ts:284`, `apps/services/transaction-service/src/controllers/transactionController.ts:304`).
- L'interface d'import transactions envoie un tableau brut (`apps/frontend/src/lib/api/transactionApi.ts:40`) alors que le backend attend `{ nomFichier, typeFichier, auteurId, items }` (`shared/types/transaction.types.ts:44`).
- La page OT propose des statuts incompatibles avec le backend : frontend `GENERE`, `VALIDE_CHEF`, etc. (`apps/frontend/src/app/(dashboard)/orders/page.tsx:20`) versus backend `Brouillon`, `Transmis`, `Validé`, etc. (`shared/types/order.types.ts:10`).
- Le rejet OT ne force ni rôle spécifique ni motif obligatoire (`apps/services/order-service/src/services/orderService.ts:21`, `shared/types/order.types.ts:17`).
- L'attestation de non-redevance n'est pas identifiée comme module finalisé : il manque un calcul officiel du solde étudiant, règles de dette, génération/traçabilité d'attestation.

### 4.7 Frontend Next.js

Points positifs :

- Next.js 16 App Router, React 19, Tailwind, Ecme, React Query, Zustand.
- Layout Ecme intégré avec `PostLoginLayout`.
- Pages métier nombreuses : dashboard, transactions, synthèse recettes, étudiants, promotions, référentiels, OT, portail étudiant.
- React Query centralisé dans les providers.
- Toasts, chargements, tableaux, filtres, exports présents.

Faiblesses :

- Pas de test frontend.
- Le garde de route ne vérifie pas le rôle. Les autorités sont déclarées (`apps/frontend/src/configs/routes.config/routes.config.ts:7`), mais `AppShell` ne contrôle que l'authentification (`apps/frontend/src/components/layout/AppShell.tsx:12`).
- La session frontend stocke tokens et refresh tokens en localStorage/cookie JS.
- Le logout frontend ne révoque pas le refresh token backend : il appelle seulement `clearSession()` (`apps/frontend/src/components/template/UserProfileDropdown.tsx:20`).
- L'intercepteur Axios rafraîchit aussi sur `403`, ce qui confond token expiré et refus RBAC (`apps/frontend/src/lib/api/client.ts:30`).
- Des textes/composants Ecme génériques subsistent dans les paramètres de compte.

### 4.8 DevOps et déploiement

Points positifs :

- Docker Compose local complet.
- Dockerfiles backend et frontend multi-stage.
- Utilisateurs non-root dans les images (`apps/services/auth-service/Dockerfile:31`, `apps/frontend/Dockerfile:27`).
- Healthchecks PostgreSQL/Redis.

Bloquants :

- Secrets et mots de passe hardcodés dans Docker Compose.
- Services internes publiés sur l'hôte.
- Entrypoints qui synchronisent le schéma au démarrage avec `db push` / `db push --accept-data-loss` (`apps/services/student-service/entrypoint.sh:18`, `apps/services/transaction-service/entrypoint.sh:18`, `apps/services/order-service/entrypoint.sh:18`, `apps/services/auth-service/entrypoint.sh:18`).
- Seeds exécutés par défaut (`apps/services/student-service/entrypoint.sh:20`, `apps/services/transaction-service/entrypoint.sh:20`, `apps/services/order-service/entrypoint.sh:20`, `apps/services/auth-service/entrypoint.sh:20`).
- Migrations Prisma absentes pour auth/transaction/order ; seules les migrations student existent.
- Makefile et scripts encore dépendants de `compta-service` supprimé (`Makefile:21`, `Makefile:28`, `Makefile:36`, `scripts/merge-apis.js:4`, `init-db.sh:8`).
- Aucun workflow CI/CD détecté.

### 4.9 Documentation et maintenabilité

Points positifs :

- README clair sur l'objectif et les services.
- Documentation fonctionnelle, conception DB, architecture, ADR, déploiement.
- OpenAPI générés par service et documentation Postman.
- Rapports précédents utiles pour suivre l'historique.

Faiblesses :

- Documentation Postman et scripts continuent de référencer `compta-service` (`docs/postman/README.md:15`, `docs/postman/README.md:140`).
- Le merge OpenAPI inclut encore `compta-service` (`scripts/merge-apis.js:4`).
- Certains rapports précédents décrivent un état obsolète.
- Les contrats OpenAPI doivent être régénérés et comparés aux schémas Zod réels.

## 5. Problèmes critiques

| Priorité | Problème | Preuve | Impact | Solution précise |
|---|---|---|---|---|
| P0 | Secrets hardcodés et fallback JWT | `docker-compose.yml:8`, `docker-compose.yml:40`, `apps/services/auth-service/src/services/authService.ts:9` | Compromission immédiate possible en production ; rotation impossible proprement. | Supprimer les secrets du compose, charger via `.env.production` non versionné ou secrets manager. Rendre `JWT_SECRET` et `REFRESH_TOKEN_SECRET` obligatoires dans `auth-service`; faire échouer le démarrage si absents. Rotater les secrets existants. |
| P0 | Services internes exposés et confiance aveugle aux headers gateway | `docker-compose.yml:57`, `docker-compose.yml:73`, `docker-compose.yml:91`, `apps/services/student-service/src/middlewares/authMiddleware.ts:16` | Un appel direct au service peut contourner le gateway et injecter/omettre les headers. | Ne publier que gateway/frontend. Retirer les `ports` des services internes et utiliser `expose`/réseau interne. Ajouter une auth service-to-service : secret signé, mTLS ou JWT interne avec audience. |
| P0 | `prisma db push --accept-data-loss` au démarrage | `apps/services/student-service/entrypoint.sh:18`, `apps/services/transaction-service/entrypoint.sh:18`, `apps/services/order-service/entrypoint.sh:18` | Risque de perte de données et schéma non auditable. | Remplacer par `prisma migrate deploy`. Créer des migrations pour auth, transaction et order. Interdire `db push` en image production. |
| P0 | Seeds exécutés par défaut en production | `apps/services/auth-service/entrypoint.sh:20`, `apps/services/order-service/entrypoint.sh:20` | Données de test/admin par défaut injectées en prod. | Inverser la logique : ne seed que si `RUN_SEED=true`. Séparer seed local/demo et seed prod minimal. |
| P0 | Route `PUT /ot-status` masquée par `PUT /:id` | `apps/services/transaction-service/src/app.ts:186`, `apps/services/transaction-service/src/app.ts:191`, `apps/services/transaction-service/src/controllers/transactionController.ts:322` | Synchronisation OT miroir cassée ; gel de transactions non fiable. | Déplacer `/ot-status` avant `/:id` ou contraindre `/:id(\\d+)`. Ajouter test d'intégration `PUT /ot-status`. |
| P0 | Regroupement OT Saga incorrect | `apps/services/order-service/src/services/sagaCoordinator.ts:57`, `apps/services/order-service/src/services/sagaCoordinator.ts:58`, `apps/services/order-service/src/services/sagaCoordinator.ts:59` | OT générés avec mauvais niveau/type recette ; synthèse comptable fausse. | Enrichir les transactions avant regroupement : récupérer `niveauId` via étudiant et `typeRecetteId` via nomenclature. Grouper par `antenneId`, `niveauId`, `typeRecetteId` réels. Ajouter tests avec plusieurs niveaux/nomenclatures. |
| P0 | Contrat import transactions frontend/backend incompatible | `apps/frontend/src/lib/api/transactionApi.ts:40`, `apps/frontend/src/app/(dashboard)/transactions/page.tsx:259`, `shared/types/transaction.types.ts:44` | Import depuis l'UI échoue ou n'est pas validé. | Faire construire par le frontend le payload `{ nomFichier, typeFichier, auteurId, items }`, mapper les colonnes CSV vers `TransactionItemSchema`, ou basculer le backend vers un endpoint multipart officiel. |
| P0 | Statuts OT frontend incompatibles backend | `apps/frontend/src/app/(dashboard)/orders/page.tsx:20`, `shared/types/order.types.ts:10` | Changement de statut OT depuis l'UI rejeté par Zod. | Remplacer les options frontend par `Transmis`, `Validé`, `Approuvé`, `Payé`, `Rejeté` selon le statut courant et le rôle utilisateur. |
| P0 | Trigger de gel non garanti en production | `apps/services/transaction-service/src/triggers/gel-transaction.sql:40`, `apps/services/transaction-service/package.json:11` | Transactions liées à un OT non brouillon potentiellement modifiables. | Intégrer le SQL dans une migration Prisma du transaction-service et l'exécuter via `migrate deploy`. Ajouter test UPDATE/DELETE refusé quand OT miroir non `Brouillon`. |
| P0 | Tokens sensibles stockés côté navigateur | `apps/frontend/src/lib/store/useAuthStore.ts:54`, `apps/frontend/src/lib/store/useAuthStore.ts:71`, `apps/frontend/src/lib/store/useAuthStore.ts:24` | XSS = vol access/refresh token. | Passer à des cookies `HttpOnly Secure SameSite` émis par un BFF/route serveur. Ne jamais stocker le refresh token en `localStorage`. |
| P1 | Statut OT local mis à jour avant synchro transaction | `apps/services/order-service/src/services/orderService.ts:76`, `apps/services/order-service/src/services/orderService.ts:78` | Incohérence durable si transaction-service échoue après update local. | Introduire outbox/retry idempotent ou statut `SYNC_PENDING`. Ne répondre succès qu'après synchro confirmée ou compenser localement. |
| P1 | Rejet OT sans rôle/motif strict | `apps/services/order-service/src/services/orderService.ts:21`, `shared/types/order.types.ts:17` | Rejets non traçables ou non autorisés selon exposition directe. | Exiger un rôle autorisé pour `Rejeté`, et `motif` obligatoire via `z.refine` quand `statut === 'Rejeté'`. |
| P1 | Build local `student-service` rouge | `apps/services/student-service/tsconfig.json:15`, `apps/services/student-service/package.json:38`, `apps/services/student-service/src/types/multer.d.ts:1` | Chaîne CI/release non reproductible. | Réinstaller/restaurer `@types/multer`, supprimer `typeRoots` si inutile, ou ajouter un type local complet. Ajouter build de chaque service en CI. |

## 6. Problèmes secondaires

| Priorité | Problème | Action recommandée |
|---|---|---|
| P2 | CORS ouvert partout | Restreindre `origin` par environnement et désactiver les credentials non nécessaires. |
| P2 | Rate limit gateway trop haut | Ajouter limites spécifiques `/auth/login`, `/auth/refresh-token`, imports et exports. |
| P2 | Refresh token stocké en clair | Stocker un hash du refresh token et comparer par hash. |
| P2 | Logout frontend ne révoque pas le refresh token backend | Appeler `/auth/logout` avant `clearSession`. |
| P2 | Intercepteur refresh sur 403 | Rafraîchir uniquement sur 401/token expiré ; afficher 403 comme refus d'accès. |
| P2 | Pas de guard RBAC route frontend | Appliquer `protectedRoutes.authority` dans `AppShell` ou un `RouteGuard`. |
| P2 | `fetchFromTresor` mocké | Remplacer par intégration Trésor Pay réelle avec client typé, retry, idempotence par `refTresor`. |
| P2 | Parsing CSV naïf | Utiliser une librairie CSV robuste côté backend et frontend. |
| P2 | Export synthèse non streaming | Streamer comme `exportTransactions` et gérer le backpressure. |
| P2 | Dépendance silencieuse au student-service dans les filtres | Retourner 502/503 ou mode dégradé explicite au lieu de `in: []`. |
| P2 | `Makefile`, `init-db.sh`, Postman et merge OpenAPI mentionnent `compta-service` | Nettoyer toutes les références ou restaurer formellement le service. |
| P2 | Absence CI/CD | Ajouter GitHub Actions/GitLab CI : install, lint, build, tests, Prisma validate, Docker build. |
| P3 | Nombreux `any` | Remplacer par types dérivés Zod/Prisma et types frontend DTO. |
| P3 | OpenAPI possiblement obsolète | Générer OpenAPI depuis schémas réels et ajouter test de drift. |
| P3 | Cache étudiant invalidation partielle | Invalider aussi la clé `matriculeTresorPay` lors des mises à jour. |
| P3 | Saga Redis sans TTL | Ajouter TTL et clé de corrélation consultable. |
| P3 | Pas de PgBouncer/pool tuning | Définir stratégie de connexions par service avant montée en charge. |
| P3 | Pas d'E2E métier | Ajouter Playwright : login, import, rattachement, génération OT, validation/rejet. |

## 7. Plan d'action priorisé

### Phase 0 - Blocage production immédiat

1. Retirer les secrets hardcodés et supprimer les fallback JWT.
2. Fermer l'accès direct aux services internes dans Docker Compose.
3. Remplacer `db push` par `migrate deploy` et créer les migrations manquantes.
4. Désactiver les seeds automatiques en production.
5. Corriger `PUT /ot-status` et ajouter test d'intégration.
6. Intégrer le trigger de gel dans une migration transaction-service.
7. Corriger le regroupement Saga OT.
8. Corriger le contrat import transactions et les statuts OT frontend.

### Phase 1 - Stabilisation sécurité et fiabilité

1. Passer l'auth frontend sur cookies `HttpOnly Secure` ou BFF.
2. Hash des refresh tokens et révocation logout effective.
3. Ajouter auth service-to-service pour routes internes.
4. Renforcer CORS/rate limits.
5. Ajouter outbox/retry idempotent pour synchro OT/transaction.
6. Rendre le rejet OT strict : rôle + motif obligatoire.

### Phase 2 - Qualité release

1. Mettre une CI : build des 5 apps, tests backend, tests frontend, Prisma validate, Docker build.
2. Corriger le build `student-service`.
3. Réduire les `any` critiques sur DTO import/filtres/OT.
4. Régénérer OpenAPI et supprimer `compta-service` des docs/scripts si le service reste supprimé.
5. Ajouter tests E2E Playwright des parcours métier.

### Phase 3 - Fonctionnel métier production

1. Brancher l'intégration réelle Trésor Pay.
2. Finaliser le module de non-redevance : solde étudiant, règles de dette, génération d'attestation, journalisation.
3. Ajouter traçabilité métier complète : import, modification transaction, rattachement, génération OT, validation/rejet/paiement.
4. Ajouter exports officiels PDF/Excel si requis par les services financiers.
5. Formaliser les règles de promotion, niveau, type recette et classification Trésor Pay.

## 8. Conclusion

ProgiTresor possède une **bonne ossature technique et métier**. Le projet a dépassé le stade de maquette : les services existent, les écrans clés sont présents, les modèles Prisma reflètent une grande partie du domaine, et les tests backend montrent une volonté de sécuriser les comportements.

La maturité actuelle reste cependant **insuffisante pour une production**. Les risques ne sont pas cosmétiques : secrets, exposition réseau, migrations, Saga, contrats frontend/backend et gel des transactions touchent directement la sécurité, l'intégrité financière et la capacité à auditer les paiements.

Recommandation finale : considérer le projet comme **prêt pour une phase de durcissement pré-production**, pas pour une ouverture utilisateur réelle. Après correction des P0, ajout d'une CI et validation E2E des parcours import -> rattachement -> synthèse -> OT -> attestation, le projet pourra raisonnablement passer en pilote contrôlé.
