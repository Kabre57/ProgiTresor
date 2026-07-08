# 03.1 - Architecture Microservices & Cartographie Applicative

Ce document présente l'organisation des services, les responsabilités de chacun et les choix d'isolation de données.

## 🏗️ Modèle de Découpage
ProgiTresor adopte le pattern **Database-per-Service** afin de garantir l'autonomie et le découplage opérationnel des domaines métiers de la trésorerie de l'INFAS.

```
                      +-------------------+
                      |   Navigateur Web  |
                      | (Next.js - 3030)  |
                      +---------+---------+
                                |
                                | API HTTP
                                v
                      +-------------------+
                      |    API Gateway    |
                      |  (Express - 4000) |
                      +----+----+----+----+
                           |    |    |
        +------------------+    |    +------------------+
        |                       |                       |
        v                       v                       v
+---------------+       +---------------+       +---------------+
| auth-service  |       |student-service|       |order-service  |
|  (Port 5001)  |       |  (Port 5002)  |       |  (Port 5004)  |
+-------+-------+       +-------+-------+       +-------+-------+
        |                       |                       |
        v                       v                       v
 +-------------+         +-------------+         +-------------+
 | PostgreSQL  |         | PostgreSQL  |         | PostgreSQL  |
 | (progi_auth)|         |(progi_stud) |         |(progi_order)|
 +-------------+         +------+------+         +-------------+
                                |
                                v
                          +-----------+
                          |   Redis   |
                          | (Cache)   |
                          +-----------+
```

---

## 🗂️ Responsabilités des Composants

### 1. API Gateway (Port 4000)
*   **Rôle** : Point d'entrée unique de toutes les requêtes frontend.
*   **Sécurité** : Filtre les requêtes privées en validant les signatures de tokens JWT, applique des limites de débit de requêtes (rate-limiting) et rejette les accès non autorisés au niveau de la passerelle en appliquant le contrôle RBAC sur les chemins.
*   **Headers d'identité** : Injecte les en-têtes d'identité décodés (`X-User-Id`, `X-User-Role`, `X-User-Name`) dans les appels proxy pour que les services en aval n'aient pas besoin de déchiffrer le token.

### 2. auth-service (Port 5001)
*   **Rôle** : Gère les comptes utilisateurs (Comptable, Chef Comptable, etc.), les hashs de mots de passe (`bcrypt`), la délivrance de tokens JWT de session et l'historisation des actions dans la table `audit_logs`.
*   **Base de données** : `progi_auth`.

### 3. student-service (Port 5002)
*   **Rôle** : Référentiel des profils étudiants, de leurs affiliations à une antenne physique (ex: INFAS Bouaké), à une promotion d'étude et à leur statut.
*   **Base de données** : `progi_student`.
*   **Optimisation** : Utilise Redis pour mettre en cache les profils étudiants individuels sous la clé `student:${matricule}` (TTL de 10 min) ainsi que les référentiels `antennes`, `filieres` et `promotions` (TTL de 1h). Les caches sont invalidés lors des mises à jour.

### 4. transaction-service (Port 5003)
*   **Rôle** : Import et persistance de chaque ligne d'encaissement brute de Trésor Pay. Réalise le dédoublonnage de référence et la standardisation automatique de la nomenclature des produits d'encaissement. Expose les routes pour lier/délier les transactions à un code d'OT.
*   **Base de données** : `progi_transaction`.
*   **Optimisation** : Cache les KPIs de dashboard dans Redis pendant 5 minutes, invalide ce cache après import/modification/suppression, et exporte les CSV par streaming avec gestion de backpressure.

### 5. order-service (Port 5004)
*   **Rôle** : Consolidateur des Ordres de Traitement pour les flux "Hors Budget".
*   **Base de données** : `progi_order`.
*   **Intégration** : Interroge `student-service` pour obtenir les antennes/filières des étudiants payeurs et écrit l'association dans `transaction-service`.
*   **Résilience** : Persiste les états Saga Redis avec un TTL de 5 minutes et protège les appels `student-service` par circuit breaker.
