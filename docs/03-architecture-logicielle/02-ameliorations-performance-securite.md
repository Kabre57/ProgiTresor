# 03.2 - Optimisations Architecturales de ProgiTresor

Ce document décrit en détail les solutions appliquées pour sécuriser, optimiser et fiabiliser la communication inter-services de ProgiTresor.

---

## ⚡ 1. Résolution du goulot d'étranglement N+1 (Batch API)

### Le Problème
Lors de la génération d'un Ordre de Traitement, l'application doit lire les transactions individuelles d'encaissement et retrouver pour chaque étudiant son antenne et sa promotion.
Auparavant, `order-service` effectuait une requête HTTP individuelle par transaction vers `student-service` (`GET /students/:matricule`). Avec 150 000 transactions réelles à traiter, cette méthode provoquait :
*   150 000 connexions TCP successives.
*   Une surcharge critique de la base de données.
*   Un effondrement du temps de réponse (timeout Gateway).

### La Solution
1.  **Batch Endpoint** : Le `student-service` propose un endpoint de recherche groupée : `POST /batch`. Il accepte une liste de matricules `{ matricules: string[] }` et retourne l'ensemble des profils associés en une seule opération.
2.  **Optimisation du Cache** : Pour chaque matricule demandé dans le lot, le service vérifie d'abord sa présence dans Redis (clé `student:${matricule}`). Les profils absents sont chargés en base de données en une seule requête Postgres groupée (clause `IN`), puis injectés dans Redis avec un TTL de 10 minutes.
3.  **Traitement par morceaux** : L'`order-service` regroupe les matricules de transactions brutes par paquets de 500 pour ne pas surcharger la mémoire ou dépasser la limite de payload HTTP.

---

## 🔄 2. Résilience des Transactions (Pattern Saga Orchestré)

Afin de garantir la cohérence des données sans utiliser de transactions distribuées complexes (2PC), nous mettons en œuvre un pattern **Saga** avec étapes de compensation.

### Séquence de génération d'OT
1.  **Récupération** : L'`order-service` interroge `transaction-service/unassigned` pour extraire les transactions d'encaissement "Hors Budget" sans OT.
2.  **Résolution** : Les profils étudiants de ces transactions sont chargés en masse via le `POST /batch` du `student-service`.
3.  **Écriture locale** : Les Ordres de Traitement sont générés en base locale `progi_order` dans l'état `Brouillon`.
4.  **Liaison externe (Verrou)** : L'`order-service` demande au `transaction-service` de lier les transactions traitées aux codes d'OT générés (verrouillage anti-doublon).

### Scénarios de Rollback (Compensation)
Si l'écriture externe (étape 4) échoue en cours de route (perte réseau, timeout) :
*   Le `SagaCoordinator` attrape l'erreur et interrompt le processus.
*   Le module de compensation efface immédiatement les enregistrements d'OT locaux écrits à l'étape 3.
*   Il appelle le `transaction-service/unlink-ot` pour libérer les éventuelles transactions partiellement liées et restaurer l'état vierge d'origine.
*   L'état de la saga est stocké dans Redis avec une clé `saga:${sagaId}` à des fins d'audit de santé.

---

## 📊 3. Monitoring (Prometheus & Client metrics)

Chaque service et la passerelle intègrent `prom-client` pour exposer un endpoint `/metrics` :
*   **Gateway** : Compte les requêtes traitées (`gateway_http_requests_total`) et mesure les durées de transfert (`gateway_http_request_duration_seconds`).
*   **Student Service** : Fournit le taux d'efficacité du cache (`student_redis_cache_hits_total` vs `student_redis_cache_misses_total`).
*   **Order Service** : Reporte le nombre de sagas en échec ou succès (`order_saga_rollback_total` / `order_saga_success_total`).
