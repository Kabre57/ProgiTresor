# Gestion Dynamique des Recettes et Flux Financiers

Date : 4 juillet 2026

## Objectif

La classification des paiements Trésor Pay ne doit plus dépendre de règles codées en dur dans le `transaction-service`. Les recettes, flux financiers et tarifs sont désormais pilotés par les référentiels de base de données :

- `TypeFlux`
- `TypeRecette`
- `NomenclatureProduit`

## API référentiels

Les routes historiques restent disponibles sous `/api/etudiant/...`.

Des alias REST directs ont été ajoutés dans le Gateway :

- `GET|POST|PUT|DELETE /api/type-flux`
- `GET|POST|PUT|DELETE /api/type-recette`
- `GET|POST|PUT|DELETE /api/nomenclature-produit`

Les écritures restent réservées aux administrateurs côté `etudiant-service`.

## NomenclatureProduit

Le modèle contient maintenant un champ optionnel :

- `regexPattern` : regex utilisée quand aucune correspondance exacte n'est trouvée sur `libelleBrut`, `libelleStandard` ou `codeProduit`.

Migration :

```bash
cd apps/services/etudiant-service
npx prisma migrate deploy
```

## Import des transactions

Au début de l'import, `transaction-service` charge les nomenclatures actives via :

```http
GET /nomenclatures?actif=true
```

La résolution se fait dans cet ordre :

1. correspondance par `nomenclatureId` si fourni ;
2. correspondance exacte normalisée sur le libellé ;
3. correspondance regex via `regexPattern`.

Si aucune nomenclature active ne correspond, la transaction est conservée avec :

- `statutTraitement = NON_CLASSIFIE`
- `nomenclatureId = null`
- `typeFluxId = null`

## Totaux et synthèses

Les totaux Budget / Hors Budget ne reposent plus sur les IDs `1` et `2`. Le backend résout le type de flux depuis les codes/libellés du référentiel `TypeFlux`.

Les montants sans classification sont exposés séparément :

- `totalNonClassifie` dans les KPIs ;
- `montantNonClassifie` dans les regroupements et exports de synthèse.

## Validation

Commandes exécutées :

```bash
npm test -- --runInBand tests/unit/importParserService.test.ts tests/unit/transactionService.test.ts
npm run build # transaction-service
npm run build # analyse-service
npm run build # gateway
npm run build # frontend
```

Note : le build local de `etudiant-service` nécessite ses dépendances (`node_modules`) qui ne sont pas présentes dans ce workspace. Le schéma Prisma `etudiant-service` a été validé avec succès.
