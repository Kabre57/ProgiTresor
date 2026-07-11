# Backlog AGC - Transmission OT vers Compta/Budget

Date : 11 juillet 2026  
Projet : ProgiTresor  
Source : `IA_Workflow_Livrables/DSD/DSD_AER_Transmission_OT_Budget.md`  
Workflow : AER -> DSD -> AGC -> AT -> Validation -> Ticket suivant

## Ordre de traitement recommande

1. AGC-001 - Corriger le crash Frontend `/orders`
2. AT-001 - Valider la stabilite UI `/orders`
3. AGC-002 - Stabiliser le contrat API `GET /api/orders`
4. AT-002 - Valider le contrat Frontend/Backend
5. AGC-003 - Realigner la transmission OT vers Compta/Budget
6. AT-003 - Valider OT -> Outbox -> Bordereau -> Ecritures
7. AGC-004 - Finaliser la transmission par vagues
8. AT-004 - Valider les vagues independantes
9. AGC-005 - Harmoniser les permissions du workflow
10. AT-005 - Valider les acces par role
11. AGC-006 - Ajouter la couverture de tests
12. AT-006 - Executer la campagne complete
13. AGC-007 - Refactorer les restes CSV et code mort
14. AT-007 - Valider les non-regressions
15. AGC-008 - Mettre a jour la documentation
16. AT-008 - Valider la documentation fonctionnelle et technique

---

## AGC-001 - Corriger le crash Frontend `/orders`

Priorite : Critique

### Objectif

Supprimer le crash client : `TypeError: filter is not a function` sur la page `/orders`.

### Fichiers a modifier

- `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- `apps/frontend/src/lib/api/orderApi.ts`
- `apps/frontend/src/lib/hooks/useOperationsQueries.ts`

### Fichiers a creer

Aucun obligatoire.

### Impacts Backend

Aucun impact fonctionnel direct. Le ticket doit etre compatible avec la reponse backend actuelle.

### Impacts Frontend

- Normalisation defensive des donnees OT.
- Protection des appels `.filter`, `.slice`, `.reduce` par des tableaux garantis.
- Affichage d'un etat d'erreur controle si le format API est invalide.

### Impacts base de donnees

Aucun.

### Criteres d'acceptation

- `/orders` ne plante plus au chargement.
- Aucun `filter is not a function` dans la console.
- Les OT s'affichent si l'API retourne un tableau.
- La page affiche un message controle si l'API retourne une structure inconnue.
- Les actions de selection restent utilisables.

### Tests a executer

- Build Frontend.
- Test manuel `/orders` avec donnees OT existantes.
- Test manuel avec reponse API vide.
- Test manuel avec reponse enveloppee `{ items: [], total: 0 }` si possible via mock ou environnement de test.

### Dependances

Aucune. Ce ticket doit etre traite en premier.

### Risques

- Masquer temporairement un probleme de contrat API si la normalisation est trop permissive.
- Casser l'affichage pagination si la page utilisait implicitement une enveloppe.

### Validation AT

AT-001 doit confirmer que la page `/orders` est stable et que les OT restent visibles.

---

## AGC-002 - Stabiliser le contrat API `GET /api/orders`

Priorite : Haute

### Objectif

Definir et appliquer un contrat unique entre Frontend et Backend pour la recuperation des OT.

### Fichiers a modifier

- `apps/frontend/src/lib/api/orderApi.ts`
- `apps/frontend/src/lib/hooks/useOperationsQueries.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/repositories/*` si le repository existe pour les OT
- `shared/types` si un type partage doit etre ajoute

### Fichiers a creer

- Eventuellement un type partage `shared/types/order.types.ts` ou extension du type existant.

### Impacts Backend

- Clarification de la reponse `GET /api/orders` : tableau simple ou enveloppe paginee.
- Conservation d'une compatibilite si des clients existants consomment deja un tableau.

### Impacts Frontend

- `orderApi.list()` doit retourner une structure previsible.
- Les hooks doivent exposer soit `items`, soit un tableau normalise, sans ambiguite.

### Impacts base de donnees

Aucun.

### Criteres d'acceptation

- Le contrat `GET /api/orders` est documente.
- Le Frontend consomme ce contrat sans logique fragile.
- Une reponse `{ items: [], total: 120 }` est correctement exploitee.
- Une reponse `[]` reste acceptee si la compatibilite est requise.

### Tests a executer

- Test API `GET /api/orders`.
- Test Frontend `orderApi.list()`.
- Test non-regression `/orders`.

### Dependances

- Depend de AGC-001 pour garantir que la page ne plante plus pendant l'ajustement.

### Risques

- Rupture de compatibilite avec d'anciens composants Frontend.
- Incoherence si d'autres pages utilisent directement `orderApi.list()`.

### Validation AT

AT-002 doit verifier le contrat reel via Gateway et service direct si possible.

---

## AGC-003 - Realigner la transmission OT vers Compta/Budget

Priorite : Haute

### Objectif

Remplacer le comportement principal base sur le telechargement CSV par le workflow metier : OT -> Outbox -> Compta -> Bordereau -> Ecriture -> Lot -> Ordre de Paiement.

### Fichiers a modifier

- `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- `apps/frontend/src/lib/api/orderApi.ts`
- `apps/frontend/src/lib/api/comptaWorkflowApi.ts`
- `apps/frontend/src/lib/hooks/useOperationsQueries.ts`
- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/order-service/src/services/outboxService.ts`
- `apps/services/compta-service/src/services/bordereau.service.ts`
- `apps/services/compta-service/src/controllers/budgetWorkflow.controller.ts`

### Fichiers a creer

- Eventuellement un type de reponse `TransmissionOtResult` dans `shared/types`.
- Eventuellement un composant Frontend d'etat de transmission.

### Impacts Backend

- Le succes de transmission doit etre rattache a l'enregistrement de l'intention et/ou a la creation des ecritures Compta.
- Le `downloadUrl` CSV ne doit plus etre obligatoire dans le contrat principal.
- L'Outbox devient le mecanisme officiel de passage vers Compta.

### Impacts Frontend

- Suppression du telechargement automatique CSV apres transmission.
- Affichage d'une confirmation metier : OT transmis, bordereau cree ou traitement en cours.
- Rafraichissement des ecritures en attente et des bordereaux.

### Impacts base de donnees

Modeles impactes :

- `OutboxMessage`
- `OrdreTraitement`
- `OtTransmissionHistory`
- `Bordereau`
- `EcritureBudgetaire`

Migration non obligatoire sauf besoin d'ajouter un statut de suivi ou une reference d'integration.

### Criteres d'acceptation

- La transmission d'un OT ne lance plus de telechargement CSV automatique.
- Un message Outbox `CREATE_COMPTA_BORDEREAU` est cree.
- Le Compta-Service cree un bordereau et des ecritures `EN_ATTENTE`.
- `/api/compta/ecritures/pending` retourne les lignes transmises.
- Les erreurs partielles sont affichees sans perdre les OT selectionnes.

### Tests a executer

- Test API `POST /api/orders/validate-and-transmit`.
- Test Outbox : message cree puis traite.
- Test Compta : bordereau cree depuis OT.
- Test Frontend : toast de confirmation sans telechargement automatique.

### Dependances

- Depend de AGC-001 et AGC-002.

### Risques

- Les utilisateurs habitues au CSV peuvent croire que la transmission ne produit plus rien.
- Des scripts externes peuvent dependre du `downloadUrl`.
- L'Outbox asynchrone peut introduire un delai visible cote UI.

### Validation AT

AT-003 doit valider la chaine OT -> Outbox -> Compta -> Ecritures en attente.

---

## AGC-004 - Finaliser la transmission par vagues

Priorite : Haute

### Objectif

Garantir que chaque selection de lignes ou d'OT cree une vague independante, tracee et exploitable dans le workflow Bordereaux/Lots.

### Fichiers a modifier

- `apps/frontend/src/app/(dashboard)/backoffice/synthese/page.tsx` ou page equivalente de Synthese OT
- `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- `apps/services/order-service/src/services/synthesisOrderService.ts`
- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/compta-service/src/services/bordereau.service.ts`

### Fichiers a creer

- Eventuellement un composant de creation de vague.
- Eventuellement un type partage `VagueTransmission`.

### Impacts Backend

- Chaque vague doit conserver : reference, titre, description, utilisateur, date, lignes selectionnees.
- Les doublons de transmission doivent etre bloques ou ignores de facon idempotente.

### Impacts Frontend

- Selection multi-lignes.
- Creation d'une vague avec titre et description facultative.
- Affichage de l'historique de transmission si disponible.

### Impacts base de donnees

Modeles concernes :

- `OtTransmissionHistory`
- `OrdreTraitement.referenceVague`
- `SyntheseOT`
- `Bordereau`
- `EcritureBudgetaire`

Migration possible si les champs actuels ne suffisent pas pour tracer les lignes exactes d'une vague.

### Criteres d'acceptation

- Une selection A/B/C cree une vague independante.
- Une selection D/E cree une autre vague independante.
- Une ligne deja transmise ne peut pas etre retransmise par erreur.
- L'historique permet de savoir qui a transmis quoi et quand.
- Les bordereaux refletent les vagues transmises.

### Tests a executer

- Test transmission vague 1.
- Test transmission vague 2.
- Test anti-doublon.
- Test historique.
- Test coherence montant/nombre de lignes.

### Dependances

- Depend de AGC-003.

### Risques

- Confusion entre OT individuel, vague et bordereau.
- Doublons si l'idempotence est basee seulement sur les codes OT et pas sur les lignes.

### Validation AT

AT-004 doit valider plusieurs vagues successives sans perte de donnees.

---

## AGC-005 - Harmoniser les permissions du workflow

Priorite : Haute

### Objectif

Rendre coherentes les permissions sur tout le workflow : transmission OT, consultation Budget/Compta, lots, OP et paiement.

### Fichiers a modifier

- `apps/gateway/src/routes/order.routes.ts`
- `apps/gateway/src/routes/compta.routes.ts`
- `apps/gateway/src/middlewares/permission.middleware.ts`
- `apps/services/order-service/src/middlewares/authMiddleware.ts`
- `apps/services/compta-service/src/middlewares/authMiddleware.ts`
- `apps/services/auth-service/prisma/seed.ts`
- `apps/services/auth-service/prisma/schema.prisma` si necessaire

### Fichiers a creer

- Eventuellement une matrice de permissions documentee dans `docs/`.

### Impacts Backend

- Harmonisation roles/perimetres : `ADMIN`, `CHEF_COMPTABLE`, `DF`, `BUDGET`, `CAISSE`.
- Eviter qu'un utilisateur puisse transmettre mais pas consulter le resultat attendu.

### Impacts Frontend

- Masquage ou desactivation des boutons selon permissions.
- Messages clairs en cas de `403`.

### Impacts base de donnees

Migration possible si la matrice RBAC actuelle ne contient pas les perimetres requis.

### Criteres d'acceptation

- ADMIN accede a tout le workflow.
- CHEF COMPTABLE peut valider/transmettre selon regle metier.
- DF peut approuver/controler selon regle metier.
- BUDGET peut consulter et traiter les ecritures/lots qui le concernent.
- CAISSE n'accede qu'a la partie paiement/suivi si prevu.
- Les `403` sont explicites cote Frontend.

### Tests a executer

- Tests par role sur les routes Gateway.
- Tests par role sur les services directs.
- Tests UI de masquage des actions.

### Dependances

- Peut demarrer apres AGC-002.
- Doit etre valide avant mise en production de AGC-003/AGC-004.

### Risques

- Bloquer des utilisateurs metier existants.
- Ouvrir trop largement les routes sensibles.

### Validation AT

AT-005 doit produire une matrice role/action validee.

---

## AGC-006 - Ajouter la couverture de tests

Priorite : Moyenne

### Objectif

Ajouter les tests unitaires, API, integration et Frontend necessaires pour securiser le workflow.

### Fichiers a modifier

- Configurations de test existantes dans chaque service.
- Fichiers de tests existants si presents.

### Fichiers a creer

- Tests Frontend `/orders`.
- Tests API Order-Service.
- Tests integration Order-Service -> Compta-Service.
- Tests permissions Gateway.

### Impacts Backend

- Ajout de scenarios automatises sur transmission, Outbox et idempotence.

### Impacts Frontend

- Ajout de tests de rendu et de comportement utilisateur.

### Impacts base de donnees

- Besoin possible de seeds de test.
- Nettoyage des donnees de test apres execution.

### Criteres d'acceptation

- Le crash `.filter` est couvert par test.
- La transmission unitaire est couverte.
- La transmission groupee est couverte.
- L'idempotence est couverte.
- Les permissions principales sont couvertes.

### Tests a executer

- `npm test` ou commande equivalente par service.
- Build Frontend.
- Tests integration Docker si disponibles.

### Dependances

- Depend de AGC-001 a AGC-005 pour figer les comportements.

### Risques

- Tests fragiles si les environnements Docker ne sont pas stabilises.
- Donnees de test insuffisantes pour couvrir les cas metier.

### Validation AT

AT-006 doit executer et consigner la campagne de tests.

---

## AGC-007 - Refactorer les restes CSV et code mort

Priorite : Moyenne

### Objectif

Nettoyer l'ancien workflow CSV et le code mort apres validation du nouveau workflow.

### Fichiers a modifier

- `apps/services/order-service/src/services/orderService.ts`
- `apps/services/order-service/src/controllers/orderController.ts`
- `apps/services/order-service/src/app.ts`
- `apps/frontend/src/app/(dashboard)/orders/page.tsx`
- `apps/frontend/src/lib/api/orderApi.ts`

### Fichiers a creer

Aucun obligatoire.

### Impacts Backend

- Suppression ou isolement des routes CSV si elles ne sont plus necessaires.
- Conservation possible en export manuel explicite.

### Impacts Frontend

- Suppression des telechargements automatiques.
- Conservation eventuelle d'un bouton export manuel.

### Impacts base de donnees

Aucun attendu.

### Criteres d'acceptation

- Aucun telechargement CSV automatique pendant la transmission.
- Les routes CSV inutiles sont supprimees ou marquees comme export manuel.
- Aucun code mort evident ne reste dans `/orders`.
- Les anciens usages documentes sont migres ou signales.

### Tests a executer

- Tests non-regression transmission.
- Test export manuel si conserve.
- Build Backend/Frontend.

### Dependances

- Depend de AGC-003 et AGC-006.

### Risques

- Supprimer trop tot une fonctionnalite encore utilisee.
- Casser un processus manuel hors application.

### Validation AT

AT-007 doit confirmer qu'aucune regression metier n'apparait apres nettoyage.

---

## AGC-008 - Mettre a jour la documentation

Priorite : Faible

### Objectif

Documenter le workflow final OT -> Compta -> Bordereaux -> Lots -> OP et les contrats API stabilises.

### Fichiers a modifier

- `README.md`
- `docs/`
- Swagger/OpenAPI des services concernes
- Documentation API Frontend si presente

### Fichiers a creer

- Eventuellement `docs/workflows/workflow-ot-compta-budget.md`
- Eventuellement `docs/api/order-compta-workflow.md`

### Impacts Backend

- Swagger a mettre a jour pour les routes de transmission et Compta.

### Impacts Frontend

- Documentation du comportement utilisateur.

### Impacts base de donnees

- Documentation des tables impliquees.

### Criteres d'acceptation

- Le workflow final est documente.
- Les routes API sont documentees.
- Les roles et permissions sont documentes.
- Les anciens CSV sont documentes comme export manuel ou retires de la documentation.

### Tests a executer

- Generation Swagger si scripts disponibles.
- Relecture documentation par AT.

### Dependances

- Depend de AGC-003 a AGC-007.

### Risques

- Documentation obsolete si redigee avant stabilisation finale.

### Validation AT

AT-008 doit valider la coherence documentation/code.

---

## Synthese des dependances

- AGC-001 : aucun pre-requis.
- AGC-002 : apres AGC-001.
- AGC-003 : apres AGC-001 et AGC-002.
- AGC-004 : apres AGC-003.
- AGC-005 : apres AGC-002, avant validation finale AGC-003/AGC-004.
- AGC-006 : apres stabilisation AGC-001 a AGC-005.
- AGC-007 : apres AGC-003 et AGC-006.
- AGC-008 : apres AGC-007.

## Regle de passage

Chaque ticket doit suivre le cycle :

1. AGC implemente le ticket.
2. AT execute les validations associees.
3. Les anomalies bloquantes sont corrigees dans le meme ticket.
4. Le ticket suivant ne commence qu'apres validation AT.
