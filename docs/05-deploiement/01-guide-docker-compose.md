# 05.1 - Guide de Déploiement Local (Docker Compose)

Ce document décrit comment démarrer l'ensemble de la stack ProgiTresor en local.

## 📋 Prérequis
*   Docker (v20.10 ou supérieur)
*   Docker Compose (v2.0 ou supérieur)
*   GNU Make (optionnel, facilite l'exécution)

---

## 🚀 Démarrage Rapide

1.  **Générer les variables d'environnement** :
    ```bash
    cp .env.example .env
    ```
2.  **Lancer l'orchestration Docker Compose** :
    ```bash
    make build # Compile les microservices, la gateway et Next.js
    make up    # Démarre la stack (Postgres, Redis, Services, Gateway, Next.js)
    ```
3.  **Peupler les bases de données** :
    ```bash
    make seed  # Crée l'administrateur par défaut et injecte la nomenclature des produits et les antennes.
    ```

---

## 🔍 Ports & Endpoints Accessibles en Local

Une fois démarré, vous pouvez accéder aux services aux adresses suivantes :

*   **Interface Web (Frontend Next.js)** : [http://localhost:3030](http://localhost:3030)
*   **API Gateway** : [http://localhost:4000/api](http://localhost:4000/api)
*   **Documentation API (Swagger UI)** :
    *   Auth Service : [http://localhost:5001/api-docs](http://localhost:5001/api-docs)
    *   Student Service : [http://localhost:5002/api-docs](http://localhost:5002/api-docs)
    *   Transaction Service : [http://localhost:5003/api-docs](http://localhost:5003/api-docs)
    *   Order Service : [http://localhost:5004/api-docs](http://localhost:5004/api-docs)
*   **Health checks de sécurité** :
    *   Gateway : `http://localhost:4000/health`
    *   Auth : `http://localhost:5001/health`
    *   Student : `http://localhost:5002/health`
    *   Transaction : `http://localhost:5003/health`
    *   Order : `http://localhost:5004/health`
