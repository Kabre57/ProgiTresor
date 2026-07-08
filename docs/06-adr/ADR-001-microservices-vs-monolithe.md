# ADR 001 - Architecture Microservices vs Monolithe

## Statut
Accepté

## Contexte
La gestion des paiements de l'INFAS implique le traitement en masse de transactions financières (plus de 150 000 par an) ainsi que des actions critiques à réaliser par différents services (comptabilité, budget, direction). Un bloc unique (monolithe) rendrait les évolutions difficiles à isoler et exposerait tout le système à des indisponibilités en cas de blocage d'un seul processus (ex: parsing Excel volumineux).

## Décision
Nous optons pour une architecture en **microservices** découplés, coordonnés par une API Gateway centrale.

## Conséquences
*   **Avantages** : Extensibilité, isolation des pannes, indépendance de déploiement et sécurité renforcée par rôles métier.
*   **Inconvénients** : Complexité réseau accrue, nécessite une gestion rigoureuse de la cohérence éventuelle.
