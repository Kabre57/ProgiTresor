# Document de Spécification Détaillée (DSD) - Sécurisation des Secrets Docker Compose

## Problème
Le fichier `docker-compose.yml` du projet ProgiTresor contient des secrets hardcodés ou des valeurs par défaut non sécurisées pour des composants critiques tels que PostgreSQL et MinIO. Cela représente une vulnérabilité majeure en production, car ces informations sensibles sont exposées directement dans le dépôt de code.

## Solution Proposée
Externaliser tous les secrets identifiés dans des variables d'environnement, en utilisant le mécanisme de substitution de Docker Compose (`${VAR_NAME}`). Ces variables devront être définies dans un fichier `.env` ou via l'environnement d'exécution.

## Exigences Détaillées

### 1. Secret PostgreSQL
*   **Nom du secret :** `POSTGRES_PASSWORD`
*   **Localisation actuelle :** `docker-compose.yml`, ligne 8
*   **Service utilisateur :** `postgres`
*   **Exigence de transformation :** Remplacer la valeur `postgres` par une référence à une variable d'environnement.
*   **Critères d'acceptation :**
    *   La ligne 8 de `docker-compose.yml` doit être modifiée de `POSTGRES_PASSWORD: postgres` à `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`.
    *   Le service `postgres` doit démarrer correctement en utilisant la valeur fournie par la variable d'environnement `POSTGRES_PASSWORD`.
    *   Le mot de passe ne doit plus être visible en clair dans le fichier `docker-compose.yml`.

### 2. Secrets MinIO
*   **Nom du secret :** `MINIO_ROOT_USER`
*   **Localisation actuelle :** `docker-compose.yml`, ligne 40
*   **Service utilisateur :** `minio`
*   **Exigence de transformation :** Supprimer la valeur par défaut `minioadmin` pour forcer l'utilisation d'une variable d'environnement.
*   **Critères d'acceptation :**
    *   La ligne 40 de `docker-compose.yml` doit être modifiée de `MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}` à `MINIO_ROOT_USER: ${MINIO_ROOT_USER}`.
    *   Le service `minio` doit démarrer correctement en utilisant la valeur fournie par la variable d'environnement `MINIO_ROOT_USER`.
    *   Le nom d'utilisateur par défaut ne doit plus être visible en clair dans le fichier `docker-compose.yml`.

*   **Nom du secret :** `MINIO_ROOT_PASSWORD`
*   **Localisation actuelle :** `docker-compose.yml`, ligne 41
*   **Service utilisateur :** `minio`
*   **Exigence de transformation :** Supprimer la valeur par défaut `minioadmin` pour forcer l'utilisation d'une variable d'environnement.
*   **Critères d'acceptation :**
    *   La ligne 41 de `docker-compose.yml` doit être modifiée de `MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}` à `MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}`.
    *   Le service `minio` doit démarrer correctement en utilisant la valeur fournie par la variable d'environnement `MINIO_ROOT_PASSWORD`.
    *   Le mot de passe par défaut ne doit plus être visible en clair dans le fichier `docker-compose.yml`.

## Agent Suivant
Agent de Génération de Code (AGC) pour implémenter ces modifications.
