# Phase 2 - Performance, scalabilite et renommage Filiere

## Changements principaux

- Renommage metier `Niveau` -> `Filiere` dans Prisma, shared types, student-service, gateway et frontend.
- Compatibilite transitoire : `student-service` accepte encore `niveauId` en entree et expose encore `/niveaux` comme alias legacy vers `/filieres`.
- Cache Redis des KPIs `transaction-service` avec TTL 5 minutes et invalidation apres import, modification, suppression ou fusion d'etudiants.
- Exports CSV `transaction-service` en streaming avec `Transform` et attente du signal `drain` pour gerer le backpressure.
- Circuit breaker interne sur les appels `student-service` depuis `transaction-service` et `order-service`.
- TTL Redis de 5 minutes sur les cles `saga:*`.
- Cache Redis des referentiels `antennes`, `filieres`, `promotions` avec TTL 1 heure.
- Pool PostgreSQL parametre via `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS`.

## Migrations

```bash
cd apps/services/student-service
npx prisma migrate deploy
npx prisma generate

cd ../order-service
npx prisma migrate deploy
npx prisma generate
```

Migrations ajoutees :

- `apps/services/student-service/prisma/migrations/20260625180000_rename_niveau_to_filiere/migration.sql`
- `apps/services/order-service/prisma/migrations/20260625180000_rename_niveau_to_filiere/migration.sql`

## Tests de validation

```bash
cd apps/services/student-service
npm run build

cd ../transaction-service
npm run build

cd ../order-service
npm run build

cd ../../frontend
npx tsc --noEmit
```

Scenarios fonctionnels a verifier :

- Appeler deux fois `GET /api/dashboard/kpis` avec les memes filtres : la deuxieme reponse doit inclure `X-Cache: HIT`.
- Importer ou modifier une transaction, puis rappeler les KPIs : la reponse doit repasser en `X-Cache: MISS`.
- Exporter un volume important via `GET /api/transactions/export` et `GET /api/dashboard/recettes/export` : le processus ne doit pas accumuler tout le CSV en memoire.
- Couper `student-service` pendant un appel transaction/order : le service doit retourner un fallback controle ou une liste vide selon le contexte.
- Verifier Redis : `TTL saga:<id>` doit etre positif et inferieur ou egal a 300 secondes.
- Appeler `GET /api/students/filieres` : la liste des filieres doit etre retournee.
- Naviguer dans `/students`, `/transactions`, `/dashboard/recettes`, `/admin/filieres` : les filtres et colonnes affichent `Filiere`/`Filieres`.

## Notes d'exploitation

- `opossum` n'a pas pu etre ajoute localement car l'installation npm reseau etait bloquee dans l'environnement d'execution. Le code utilise donc un circuit breaker interne parametrable par les variables `STUDENT_SERVICE_CB_TIMEOUT_MS`, `STUDENT_SERVICE_CB_ERROR_THRESHOLD`, `STUDENT_SERVICE_CB_RESET_TIMEOUT_MS`, `STUDENT_SERVICE_CB_ROLLING_TIMEOUT_MS` et `STUDENT_SERVICE_CB_MIN_SAMPLES`.
- Pour 10M+ etudiants, completer la validation par un test de charge avec donnees representatives et `EXPLAIN ANALYZE` sur les filtres les plus frequents.
