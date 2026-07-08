# ADR 003 - Saga Orchestrée pour la Création d'OT

## Statut
Accepté

## Contexte
La création d'un Ordre de Traitement (OT) implique des écritures sur deux services distincts (`order-service` et `transaction-service`). Sans transaction SQL distribuée globale, une panne en milieu de parcours peut provoquer des incohérences (ex: OT créé localement mais transactions non marquées comme liées dans le service transactionnel).

## Décision
Utilisation d'un patron de conception **Saga orchestrée** avec des transactions compensatrices. L'état d'avancement de la Saga est persistant dans Redis.

## Conséquences
*   **Avantages** : Assure la cohérence éventuelle des microservices sans blocage de verrous SQL distants (pas de 2PC).
*   **Inconvénients** : Requiert l'implémentation de méthodes de compensation explicites (rollback applicatif).
