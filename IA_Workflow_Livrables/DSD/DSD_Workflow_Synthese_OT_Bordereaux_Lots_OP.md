# DSD - Workflow Synthese Recettes vers OT, Bordereaux, Lots et OP

Date : 2026-07-09  
Projet : ProgiTresor

## Probleme

### Description
Le workflow financier hors budget etait partiellement implemente, mais la transmission depuis la synthese ne permettait pas de selectionner des lignes precises ni de constituer des vagues successives. La validation envoyait toutes les lignes disponibles vers les OT, ce qui empechait un traitement progressif par lots.

### Localisation
- Frontend : `apps/frontend/src/app/(dashboard)/backoffice/synthese/page.tsx`
- Analyse Service : `apps/services/analyse-service/src/services/analyse.service.ts`
- Order Service : `apps/services/order-service/src/services/orderService.ts`
- Compta Service : `apps/services/compta-service/src/services/lotTraitement.service.ts`
- Types partages : `shared/types/order.types.ts`, `shared/types/compta.types.ts`

### Impact
- Risque de transmission massive non souhaitee.
- Pas de tracabilite explicite de la vague utilisateur.
- Lots de traitement difficilement exploitables a volume important sans filtres/pagination.
- Difficultes de controle entre synthese, OT, bordereau, lot et OP.

## Solution

### Approche technique
- Ajouter la selection de lignes dans la page Synthese hors budget.
- Transmettre uniquement les lignes selectionnees a `POST /api/analyse/validate-synthesis`.
- Propager `titre`, `description` et `referenceVague` vers `order-service`.
- Enregistrer ces metadonnees sur chaque OT cree et dans une table d'historique `ot_transmission_history`.
- Ajouter filtres, tri et pagination backend sur `GET /api/compta/lots`.
- Ajouter filtres et exports CSV/PDF imprimable dans l'ecran Lots de traitement.

## Exigences

1. L'utilisateur peut selectionner une ou plusieurs lignes de synthese.
2. Une transmission ne traite que les lignes selectionnees ; sans selection, le comportement reste compatible et transmet les lignes affichees.
3. Chaque vague possede une reference technique unique, un titre et une description facultative.
4. Les OT crees conservent `titre`, `description`, `referenceVague`, `transmisParId` et `dateTransmissionSynthese`.
5. Chaque OT cree genere une entree dans `ot_transmission_history`.
6. Les lots sont consultables avec filtres par periode, OT, statut et recherche rapide.
7. Les lots supportent pagination et export CSV/PDF imprimable.
8. Les schemas Zod valident les nouveaux payloads.
9. Les changements ne doivent pas introduire de `any` dans les fichiers touches.
10. Les fichiers principaux restent sous 500 lignes.

## Criteres d'acceptation

- Generer une synthese hors budget affiche une colonne de selection.
- Selectionner 2 lignes puis valider cree uniquement les OT correspondant a ces 2 lignes.
- Une nouvelle ligne existe dans `ot_transmission_history` pour chaque OT cree.
- Les transactions selectionnees restent verrouillees par l'outbox existante.
- Les bordereaux continuent de recevoir les OT transmis via le flux existant.
- `GET /api/compta/lots?statut=TRAITE&page=1&limit=20` renvoie `{ items, total, page, limit }`.
- Les filtres de la page Lots modifient la requete et rechargent les donnees.
- Les exports CSV et PDF imprimable contiennent les lots visibles.
- `npm run build` des services touches et du frontend passe.

## Fichiers concernes

### Crees
- `apps/services/order-service/prisma/migrations/20260709100000_ot_wave_metadata/migration.sql`
- `IA_Workflow_Livrables/DSD/DSD_Workflow_Synthese_OT_Bordereaux_Lots_OP.md`

### Modifies
- `apps/services/order-service/prisma/schema.prisma`
- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/analyse-service/src/services/analyse.service.ts`
- `apps/services/analyse-service/src/controllers/analyseController.ts`
- `apps/services/compta-service/src/services/lotTraitement.service.ts`
- `apps/services/compta-service/src/controllers/budgetWorkflow.controller.ts`
- `shared/types/order.types.ts`
- `shared/types/compta.types.ts`
- `apps/frontend/src/types/analyse.types.ts`
- `apps/frontend/src/types/compta-budget.types.ts`
- `apps/frontend/src/lib/api/comptaWorkflowApi.ts`
- `apps/frontend/src/lib/hooks/useOperationsQueries.ts`
- `apps/frontend/src/app/(dashboard)/backoffice/synthese/page.tsx`
- `apps/frontend/src/app/(dashboard)/compta/lots/page.tsx`
