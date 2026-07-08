# ADR 002 - Modèle de Base de Données par Service

## Statut
Accepté

## Contexte
Pour éviter le couplage fort entre microservices (ce qui annulerait les bénéfices du découplage), il est essentiel que les services ne partagent pas directement de tables SQL sous peine d'altérer la maintenance et le dimensionnement indépendant des bases.

## Décision
Chaque microservice applicatif gère sa propre base de données PostgreSQL distincte (`progi_auth`, `progi_student`, `progi_transaction`, `progi_order`).

## Conséquences
*   **Avantages** : Isolation stricte des schémas SQL.
*   **Inconvénients** : Impossibilité de faire des jointures SQL directes transverses. Les liens de clés étrangères sont validés logiquement au niveau applicatif (via API HTTP et caches Redis).
