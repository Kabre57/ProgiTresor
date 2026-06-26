# ProgiTresor - Gestion Financière INFAS

**ProgiTresor** (code name du projet) est une plateforme microservices pour l'automatisation des paiements scolaires (Trésor Pay) et la génération d'Ordres de Paiement (OP) pour l'Institut INFAS.

## 📁 Structure du projet
- `apps/` :
  - `frontend/` : Interface utilisateur Next.js (App Router, React Query)
  - `gateway/` : API Gateway Express.js (RBAC, Rate Limiting, Proxying)
  - `services/` :
    - `auth-service/` : Authentification JWT, Audits, Utilisateurs
    - `student-service/` : Profils étudiants, Antennes, Filières, Promotions (avec cache Redis)
    - `transaction-service/` : Import, Nettoyage des transactions et nomenclature produits
    - `order-service/` : Regroupements, Sagas de validation et compensation des OP
- `shared/` : Types et constantes partagées
- `docs/` : Documentation complète (analyse, conception, API, déploiement, ADR)
- `docker-compose.yml` : Orchestration complète des microservices, Redis et PostgreSQL

## 🔐 Sécurité & Configuration des Secrets
Avant de démarrer le projet en production, vous devez impérativement configurer des secrets forts (minimum 32 caractères) dans votre fichier `.env.production`.
Générez-les via la commande suivante :
```bash
openssl rand -base64 32
```
Puis, copiez le résultat dans les variables `JWT_SECRET` et `REFRESH_TOKEN_SECRET`.

## 🚀 Lancer le projet
```bash
make build         # Construit tous les conteneurs
make up            # Démarre tous les conteneurs
make seed          # Peuple les bases de données avec des données de test
make generate-docs # Génère et fusionne la spécification API complète
make docs          # Affiche les liens de documentation locale
make metrics       # Requête les métriques Prometheus
```

## 📚 Documentation
Pour plus de détails, accédez aux rubriques de documentation de ProgiTresor :
*   [01 - Analyse Fonctionnelle](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/01-analyse-fonctionnelle/index.md) : Cahier des charges et besoins.
*   [02 - Conception DB](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/02-conception-db/index.md) : Schéma relationnel 3NF et dictionnaire de données.
*   [03 - Architecture Logicielle](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/03-architecture-logicielle/index.md) : Modèle microservices et pattern Saga.
*   [04 - API Documentation](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/04-api-documentation/index.md) : Spécifications OpenAPI. Contient également le contrat d'API unifié : [api-complete.json](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/04-api-documentation/api-complete.json).
*   [05 - Déploiement](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/05-deploiement/index.md) : Guide d'utilisation Docker Compose.
*   [06 - ADR (Architectural Decision Records)](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/06-adr/index.md) : Historique des décisions de conception.
*   [11 - Phase 2 Performance & Scalabilité](file:///home/hp/Documents/Recette/progi-teck-microservices/docs/11-phase2-performance-scalabilite.md) : Renommage Filière, cache, streaming, backpressure et résilience.

## 🔧 Technologies
*   **Frontend** : Next.js (App Router), React Query, Axios
*   **Gateway / Services** : Node.js, Express, TypeScript, Zod, Pino
*   **Bases de données** : PostgreSQL + Prisma ORM (4 bases distinctes)
*   **Cache & Saga State** : Redis
*   **Monitoring** : prom-client (Prometheus)
*   **Orchestration** : Docker, Docker Compose, Makefile
