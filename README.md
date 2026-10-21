# ProgiTresor - Gestion Financière INFAS

**ProgiTresor** (code name du projet) est une plateforme microservices pour l'automatisation des paiements scolaires (Trésor Pay) et la génération d'Ordres de Paiement (OP) pour l'Institut INFAS.

## 📁 Structure du projet
- `apps/` :
  - `frontend/` : Interface utilisateur Next.js (App Router, React Query)
  - `gateway/` : API Gateway Express.js (RBAC, Rate Limiting, Proxying)
  - `services/` :
    - `auth-service/` : Authentification JWT, Audits, Utilisateurs
    - `etudiant-service/` : Profils étudiants, Antennes, Filières, Promotions (avec cache Redis)
    - `transaction-service/` : Import, Nettoyage des transactions et nomenclature produits
    - `order-service/` : Regroupements, Sagas de validation et compensation des OP
- `shared/` : Types et constantes partagées
- `docker-compose.yml` : Orchestration complète des microservices, Redis et PostgreSQL

## 🔐 Sécurité & Configuration des Secrets
Avant de démarrer le projet en production, vous devez impérativement configurer des secrets forts (minimum 32 caractères) dans votre fichier `.env.production`.
Générez-les via la commande suivante :
```bash
openssl rand -base64 32
```
Puis, copiez le résultat dans les variables `JWT_SECRET` et `REFRESH_TOKEN_SECRET`.

## 🚀 Développement local

Le projet utilise exclusivement `pnpm` (version verrouillée dans chaque application).

```bash
make build         # Construit tous les conteneurs
make up            # Démarre tous les conteneurs
make seed-dev      # Peuple les bases de développement avec des données de test
make generate-docs # Génère et fusionne la spécification API complète
make docs          # Affiche les liens de documentation locale
make metrics       # Requête les métriques Prometheus
```

## Production sur un VPS partagé

Ne lancez pas `make up` ni `docker compose up` seuls sur le VPS : ils publient les ports de développement. Utilisez les surcharges de production, qui lient les services uniquement à `127.0.0.1`.

```bash
cp .env.example .env.production
chmod 600 .env.production
# renseigner les secrets et les URLs de base de données dans .env.production
make prod-config
make prod-build
make prod-up
make prod-ps
```

Les migrations Prisma sont appliquées par les entrypoints des services. Le seed n'est jamais automatique en production. Pour créer uniquement l'administrateur initial, une fois les conteneurs prêts :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file .env.production exec auth-service pnpm exec prisma db seed
```

Ce seed crée ou met à jour uniquement `admin@progitresor.online` avec le mot de passe initial configuré dans le seed sous forme de hash bcrypt. Une nouvelle exécution réinitialise les accès de cet administrateur et invalide ses anciennes sessions. Elle ne supprime pas les autres comptes.

## Manuel et compte de recette

Le [manuel utilisateur](docs/manuel-utilisation.md) décrit les modules de l’application et contient un parcours de recette à compléter.

Le [guide de connexion Trésor Pay](docs/connexion-tresor-pay.md) précise les accès à demander au fournisseur et les étapes de raccordement de la vraie API.

Pour créer un compte de test distinct, depuis le projet et avec `auth-service` démarré :

```bash
python3 scripts/create-test-user.py
```

Saisir puis confirmer un mot de passe d’au moins 8 caractères. Le script crée `test.recette@progitresor.online`, avec la même adresse comme identifiant, le rôle `ADMIN` et le niveau 4 sur les cinq périmètres. Il utilise le conteneur existant sans nécessiter de reconstruire l’image. Le mot de passe est haché avant enregistrement et n’est pas inscrit dans les fichiers du projet.

Une nouvelle exécution met à jour le même compte, réinitialise son mot de passe et invalide ses anciennes sessions. Un conflit avec un autre compte est refusé. Cette commande ne lance pas les seeds des services et ne réinitialise pas les données métier.

Le compte permet de tester les modules de gestion. Le portail étudiant nécessite un compte de rôle `ETUDIANT` dont le nom d’utilisateur correspond au matricule d’une fiche étudiant, comme indiqué dans le manuel.

Le fichier [nginx.progitresor.conf](nginx.progitresor.conf) est un modèle de premier déploiement HTTP. Une fois Certbot exécuté, ne le copiez pas directement sur la configuration active : fusionnez les emplacements proxy dans le fichier Nginx existant, puis lancez `sudo nginx -t` avant tout rechargement.

## 🔧 Technologies
*   **Frontend** : Next.js (App Router), React Query, Axios
*   **Gateway / Services** : Node.js, Express, TypeScript, Zod, Pino
*   **Bases de données** : PostgreSQL + Prisma ORM (7 bases distinctes)
*   **Cache & Saga State** : Redis
*   **Monitoring** : prom-client (Prometheus)
*   **Orchestration** : Docker, Docker Compose, Makefile
