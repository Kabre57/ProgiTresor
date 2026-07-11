# DSD AER - Transmission des OT vers le service Budget

Date : 11 juillet 2026  
Projet : ProgiTresor  
Perimetre : `/orders` -> Order-Service -> Compta-Service/Budget workflow  
Mode : Analyse uniquement, sans correction de code

## 1. Resume du probleme

La page Frontend `/orders` plante lors du chargement ou apres une action de transmission des Ordres de Traitement selectionnes. Le navigateur affiche :

- `Application error: a client-side exception has occurred`
- `Uncaught TypeError: eC.filter is not a function`
- interruptions SSE sur `/api/analyse/stream`
- messages secondaires `Empty string passed to getElementById()`

Cote metier, la transmission des OT selectionnes continue a generer et telecharger des fichiers CSV pivot. Cette logique ne correspond plus au workflow cible : les OT transmis doivent alimenter le module Compta/Budget, notamment la liste des ecritures d'OT recues en attente, puis les bordereaux, lots de traitement et ordres de paiement.

## 2. Cause racine

La cause racine est double.

### 2.1. Rupture de contrat Frontend/API

Le composant `/orders` suppose que `useOrders()` retourne toujours un tableau. Il execute directement `allOrders.filter(...)`. Si l'API renvoie un objet pagine, une enveloppe `{ items, total }`, une reponse d'erreur normalisee, ou une forme differente apres evolution backend, le composant appelle `.filter` sur un non-tableau et provoque le crash client.

Localisation principale :

- `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- `apps/frontend/src/lib/api/orderApi.ts`
- `apps/frontend/src/lib/hooks/useOperationsQueries.ts`

### 2.2. Workflow metier herite encore actif

Le workflow de transmission OT utilise encore les endpoints et retours historiques bases sur la generation de CSV pivot :

- `POST /api/ots/:code/transmettre-budget`
- `POST /api/orders/validate-and-transmit`
- `GET /api/ots/download-pivot/:filename`

Le service Order cree pourtant deja un message Outbox `CREATE_COMPTA_BORDEREAU` vers le Compta-Service. Le CSV devient donc un effet de bord heredite, visible par l'utilisateur, et peut donner l'impression que la transmission est un export fichier plutot qu'une integration fiable dans le workflow Budget/Compta.

## 3. Analyse technique

### 3.1. Frontend

Fichier principal : `apps/frontend/src/app/(dashboard)/orders/page.tsx`

Constats :

- `const allOrders = ordersQuery.data ?? [];`
- `allOrders.filter(...)` est appele sans garde de type.
- Les actions de transmission utilisent `downloadUrl` pour telecharger automatiquement un CSV.
- Le traitement groupé filtre le resultat par `results.filter(...)`, avec des `any`, et suppose que l'API retourne toujours un tableau.
- Les statuts selectionnables sont `EN_ATTENTE_BUDGET` et `Transmis`, ce qui peut diverger des statuts backend reels (`Validé`, `TRANSMIS_AU_BUDGET`, etc.).

Composants React concernes :

- Page `/orders` : `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- Composants utilises indirectement : `DataTable`, boutons d'action, barre d'actions groupees, toasts

Hooks concernes :

- `useOrders`
- `useUpdateOrderStatus`
- `useCreateOrderCorrection`
- Hooks Budget/Compta deja presents : `usePendingEcritures`, `useBordereaux`, `useLotsTraitement`

APIs Frontend concernees :

- `apps/frontend/src/lib/api/orderApi.ts`
- `apps/frontend/src/lib/api/comptaWorkflowApi.ts`

### 3.2. Backend Order-Service

Fichiers concernes :

- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/order-service/src/app.ts`
- `apps/services/order-service/src/services/outboxService.ts`

Constats :

- `transmettreBudget` exige un OT au statut `Validé`.
- La methode appelle `transaction-service /ot/:code/transmettre`.
- Elle met ensuite l'OT au statut `TRANSMIS_AU_BUDGET`.
- Elle enregistre un message Outbox `CREATE_COMPTA_BORDEREAU`.
- Elle genere ensuite un CSV pivot local et retourne `downloadUrl`.
- `validateAndTransmitMultiple` valide puis transmet les OT un par un, retourne un tableau de resultats avec `downloadUrl`.

Risque important : l'Outbox peut etre creee, mais la generation CSV peut echouer ensuite. L'utilisateur voit alors une erreur alors que l'intention de transmission peut deja etre en file de traitement. Cela cree une zone de confusion et un risque de relance/doublon.

### 3.3. Compta-Service / Budget workflow

Fichiers concernes :

- `apps/services/compta-service/src/app.ts`
- `apps/services/compta-service/src/controllers/budgetWorkflow.controller.ts`
- `apps/services/compta-service/src/services/bordereau.service.ts`
- `apps/services/compta-service/prisma/schema.prisma`

Routes deja presentes :

- `POST /bordereaux/from-ots`
- `GET /bordereaux`
- `GET /bordereaux/:id`
- `GET /bordereaux/:id/ecritures`
- `GET /ecritures/pending`
- `POST /lots`
- `GET /lots`
- `POST /lots/:id/traiter`
- `POST /lots/:id/transmettre-budget`

Constats :

- Le Compta-Service sait deja recevoir des OT depuis l'Order-Service.
- `listPendingEcritures` retourne les ecritures `EN_ATTENTE`.
- Le Frontend possede deja un client `comptaWorkflowApi.listPendingEcritures`, mais la page `/orders` ne l'utilise pas comme confirmation de transmission.

### 3.4. Gateway et permissions

Fichiers concernes :

- `apps/gateway/src/routes/order.routes.ts`
- `apps/gateway/src/routes/compta.routes.ts`
- `apps/gateway/src/middlewares/permission.middleware.ts`

Routes Gateway :

- `/api/orders` -> Order-Service
- `/api/ots` -> Order-Service `/ots`
- `/api/compta/ecritures/pending` -> Compta-Service `/ecritures/pending`
- `/api/compta/bordereaux` -> Compta-Service `/bordereaux`
- `/api/compta/lots` -> Compta-Service `/lots`

Risque de permission : un role peut etre autorise a transmettre un OT via Order-Service mais ne pas avoir `BUDGET >= 1` pour consulter les ecritures en attente. Cela donne l'impression que la transmission a echoue alors que l'ecriture existe cote Compta.

## 4. Fichiers a modifier par l'agent AGC

Frontend :

- `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- `apps/frontend/src/lib/api/orderApi.ts`
- `apps/frontend/src/lib/hooks/useOperationsQueries.ts`
- `apps/frontend/src/lib/api/comptaWorkflowApi.ts`
- Eventuellement les composants de tableau ou de barre d'actions groupees utilises par `/orders`

Backend Order-Service :

- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/order-service/src/app.ts`
- `apps/services/order-service/src/services/outboxService.ts`

Backend Compta-Service :

- `apps/services/compta-service/src/controllers/budgetWorkflow.controller.ts`
- `apps/services/compta-service/src/services/bordereau.service.ts`
- `apps/services/compta-service/src/app.ts`

Gateway :

- `apps/gateway/src/routes/order.routes.ts`
- `apps/gateway/src/routes/compta.routes.ts`
- `apps/gateway/src/middlewares/permission.middleware.ts`

Types partages :

- `shared/types` si un contrat commun OT/transmission/bordereau existe ou doit etre stabilise.

## 5. Fichiers a creer si necessaire

A determiner par AGC, mais les besoins probables sont :

- un type de reponse normalise pour la transmission OT sans dependance CSV ;
- un type Frontend pour les ecritures d'OT en attente ;
- un composant de confirmation de transmission base sur l'etat Compta/Budget, pas sur un telechargement fichier ;
- des tests d'integration pour la chaine OT -> Outbox -> Bordereau -> Ecritures en attente.

## 6. Impacts sur la base de donnees

Modeles Prisma concernes :

Order-Service :

- `OrdreTraitement` -> table `ordre_traitement`
- `OutboxMessage` -> table `outbox_message`
- `OtTransmissionHistory` -> table `ot_transmission_history`
- `SyntheseOT` -> table `synthese_ot`

Compta-Service :

- `Bordereau` -> table `bordereau`
- `EcritureBudgetaire` -> table `ecriture_budgetaire`
- `LotTraitement` -> table `lot_traitement`
- `LotTraitementEcriture` -> table `lot_traitement_ecriture`
- `ImputationBudgetaire` -> table `imputation_budgetaire`
- `ControleOpOt` -> table `controle_op_ot`

Transaction-Service :

- `Transaction` -> table `transaction`
- `OrdreTraitementMiroir` -> table `ordre_traitement_miroir`

Impact attendu : aucune migration n'est forcement requise pour corriger le crash Frontend. Une migration ne devient necessaire que si AGC decide d'ajouter un suivi explicite de batch/transmission ou d'enrichir le statut Outbox expose a l'UI.

## 7. Impacts sur les API

APIs impactees :

- `GET /api/orders`
- `POST /api/orders/validate-and-transmit`
- `POST /api/ots/:code/transmettre-budget`
- `GET /api/ots/download-pivot/:filename`
- `GET /api/compta/ecritures/pending`
- `POST /api/compta/bordereaux/from-ots`
- `GET /api/compta/bordereaux`
- `GET /api/compta/lots`

Points a stabiliser :

- contrat de `GET /api/orders` : tableau ou enveloppe paginee, mais pas ambigu ;
- contrat de transmission : resultat metier avec statut, codes OT, reference bordereau/outbox, nombre d'ecritures ;
- le CSV pivot ne doit pas etre le signal principal de succes ;
- l'API doit clairement differencier succes de validation, succes de transmission, et succes d'integration Compta.

## 8. Impacts sur le Frontend

Impacts directs :

- eviter le crash quand `ordersQuery.data` n'est pas un tableau ;
- afficher une erreur controlee si le contrat API est invalide ;
- remplacer l'experience utilisateur centree sur le CSV par une confirmation de transmission vers Compta/Budget ;
- rafraichir les donnees liees : orders, bordereaux, ecritures en attente, lots ;
- traiter les statuts partiels dans les actions groupees.

Impacts UX :

- l'utilisateur doit voir combien d'OT ont ete transmis ;
- l'utilisateur doit voir combien d'ecritures Budget/Compta sont en attente ;
- si l'Outbox est encore en attente, l'interface doit indiquer un etat de traitement en cours ;
- les telechargements CSV ne doivent plus se declencher automatiquement lors de la transmission metier.

## 9. Impacts sur les tests

Tests a prevoir par AGC :

- test unitaire Frontend : `useOrders` ou `orderApi.list` normalise une reponse tableau et une reponse enveloppee ;
- test composant : `/orders` ne plante pas si l'API renvoie une forme inattendue ;
- test API Order : transmission d'un OT valide cree un message Outbox ;
- test integration Order -> Compta : le message `CREATE_COMPTA_BORDEREAU` cree un bordereau et des ecritures `EN_ATTENTE` ;
- test droits : role autorise a transmettre, role autorise a consulter les ecritures ;
- test idempotence : relancer la meme transmission ne cree pas de doublons ;
- test non-regression : ancien endpoint CSV reste eventuellement disponible uniquement comme export explicite, pas comme effet automatique.

## 10. Plan de correction detaille pour AGC

1. Stabiliser le contrat de `GET /api/orders`.
   - Decider si la reponse canonique est un tableau ou une enveloppe paginee.
   - Normaliser la reponse dans la couche API Frontend.
   - Ajouter une garde de type avant tout `.filter`.

2. Corriger le crash de `/orders`.
   - Ne jamais executer `.filter`, `.slice`, `.reduce` sur une valeur non-tableau.
   - Afficher un etat d'erreur explicite si le backend renvoie une forme invalide.

3. Clarifier la transmission metier OT.
   - La transmission selectionnee doit etre consideree reussie quand l'intention est enregistree et/ou que le bordereau Compta est cree.
   - Le `downloadUrl` CSV ne doit plus etre la preuve de succes.

4. Decoupler l'export CSV du workflow de transmission.
   - Garder le CSV uniquement comme export manuel si le metier en a encore besoin.
   - Eviter le telechargement automatique apres validation/transmission.

5. Aligner Order-Service et Compta-Service.
   - Verifier que chaque OT transmis cree un message Outbox `CREATE_COMPTA_BORDEREAU`.
   - Verifier que le Compta-Service cree les `EcritureBudgetaire` attendues.
   - Exposer ou restituer une reference permettant au Frontend de suivre l'integration.

6. Aligner les permissions.
   - Verifier que les roles qui transmettent des OT peuvent aussi voir les ecritures en attente si cela fait partie de leur parcours.
   - Harmoniser roles `CHEF_COMPTABLE`, `DF`, `ADMIN`, `Agent Budget` avec les perimetres `OT` et `BUDGET`.

7. Ajouter les validations et tests.
   - Tester la transmission unitaire.
   - Tester la transmission groupee.
   - Tester l'idempotence et les echecs partiels.
   - Tester l'affichage des ecritures en attente cote Compta/Budget.

## 11. Risques et regressions possibles

Risques :

- doublons de bordereaux si l'utilisateur relance une transmission apres une erreur CSV ;
- statut OT transmis alors que l'integration Compta echoue ensuite ;
- donnees incompletes si `transaction-service /ot/:code/transactions` ne renvoie pas toutes les informations attendues ;
- utilisateur autorise a transmettre mais non autorise a consulter le resultat cote Budget ;
- rupture des anciens usages si le CSV pivot est supprime brutalement.

Regressions possibles :

- anciennes pages ou automatisations qui attendent `downloadUrl` ;
- tests ou scripts qui valident la presence du fichier pivot ;
- workflows existants de validation/transmission bases sur les statuts `Validé` et `TRANSMIS_AU_BUDGET` ;
- affichage des OT si le contrat `GET /api/orders` est modifie sans adaptation globale.

## 12. Conclusion AER

Le probleme ne vient pas uniquement d'une erreur Frontend. Le crash visible vient du Frontend, mais le probleme metier vient d'un decalage entre l'ancien workflow CSV et la nouvelle architecture OT -> Compta -> Bordereaux -> Lots -> Budget/OP.

La correction AGC doit donc traiter deux niveaux :

1. corriger immediatement la robustesse de `/orders` face aux formes de reponse API ;
2. réaligner la transmission des OT sur le workflow Compta/Budget, en faisant du CSV un export explicite et non le coeur de la transmission.
