# Analyse Technique et Structuelle du Template Frontend - ProgiTresor

Ce rapport présente une analyse approfondie du template frontend Next.js configuré dans le dossier `apps/frontend/` du monorepo **ProgiTresor** (`progi-teck-microservices`). Ce document sert de guide de référence pour l'intégration des API et du modèle de sécurité avec l'API Gateway.

---

## 1. Framework & Structure

### Framework et runtime
*   **Framework Principal** : **Next.js 16.1.4** avec le compilateur **Turbopack** (lancé en mode dev via `next dev --turbopack`).
*   **Bibliothèque UI** : **React 19.2.3** (utilisant le rendu serveur/client mixte avec les directives `'use client'`).
*   **Internationalisation (i18n)** : Intégration complète de `next-intl` (v4.7.0) configurée via le plugin dans `next.config.mjs`.

### Architecture des répertoires (`apps/frontend/src/`)
La structure suit les recommandations modernes pour les projets Next.js découplés :

```text
src/
├── api/                  # Clients API typés et interfaces générées
├── app/                  # Structure Next.js App Router (Layouts, pages et routeurs)
│   ├── (auth-pages)/     # Pages d'authentification publique (Sign-in, Sign-up, etc.)
│   ├── (protected-pages)/# Pages privées protégées par session (Dashboard /home)
│   ├── (public-pages)/   # Pages accessibles sans authentification (ex: landing)
│   └── api/auth/         # Points d'entrée NextAuth (callback NextAuth v5)
├── assets/               # Fichiers statiques et images
├── components/           # Composants réutilisables classés par granularité
│   ├── auth/             # Formulaires et widgets de login/inscription
│   ├── layouts/          # Layouts de conteneurs de page (Dashboard, Split, Blank)
│   ├── template/         # Éléments structurels de navigation (SideNav, Header, Logo)
│   └── ui/               # Bibliothèque atomique interne de composants stylisés
├── configs/              # Fichiers de configuration (thèmes, navigation, routage, métas)
├── constants/            # Valeurs immuables (clés de stockage, types de navigation)
├── server/actions/       # Actions serveur Next.js pour valider les identifiants
├── services/             # Axios base config et anciens appels mockés
└── utils/                # Helpers globaux et hooks personnalisés (useCurrentSession, apiClient)
```

---

## 2. Dépendances Principales

L'analyse du fichier `package.json` révèle un ensemble de technologies légères et modernes, évitant les surcharges de frameworks UI monolithiques :

*   **Gestion d'état global** : **Zustand 5.0.8** est la solution de stockage choisie pour les états locaux légers et synchrones.
*   **Requêtes HTTP et Caching** :
    *   **Axios 1.7.7** pour les requêtes asynchrones complexes, la configuration d'intercepteurs et la gestion du client central.
    *   **SWR 2.3.0** (`swr`) pour le caching, le revalidation sur focus et la synchronisation en temps réel des données côté client.
*   **Mise en page et Design System** :
    *   **Tailwind CSS 4.0.4** avec `@tailwindcss/postcss` et `postcss-nesting` pour le style modulaire utilitaire.
    *   **Framer Motion 12.23.6** pour l'implémentation de micro-animations de transition fluides.
*   **Formulaires et Validation** :
    *   **React Hook Form 7.53.0** pour la gestion performante des formulaires.
    *   **Zod 4.1.1** et `@hookform/resolvers` pour le schéma de validation côté client.
*   **Composants UI Atomiques** :
    *   Le template contient une bibliothèque intégrée dans `src/components/ui/` avec plus de 40 composants autonomes (Alert, Dialog, Select, Table, DatePicker, Upload, etc.), stylisés via Tailwind CSS et utilisant `@floating-ui/react` pour les popovers et tooltips.

---

## 3. Gestion de l'Authentification

Le système d'authentification s'appuie sur la version moderne de **NextAuth.js v5** (Beta 25) qui assure la protection à double niveau (Server-side Middleware + client-side session context).

### Stockage du token
Le jeton JWT émis par le microservice `auth-service` après authentification réussie est encapsulé dans le cookie de session chiffré et sécurisé géré par NextAuth (`__Secure-next-auth.session-token`). Cela évite les vulnérabilités de vol de jeton par injection XSS (contrairement au `localStorage`).

### Formulaire et flux de connexion
*   **Page de connexion** : Située dans `src/app/(auth-pages)/sign-in/page.jsx`, elle utilise `SignInForm.jsx` qui déclenche le helper NextAuth `signIn('credentials', ...)` en transmettant le `username` et le `password`.
*   **Intercepteur Axios (`apiClient.js`)** :
    L'intercepteur injecte automatiquement le JWT dans l'en-tête `Authorization` pour tous les appels sortants initiés côté client :
    ```javascript
    apiClient.interceptors.request.use(
        async (config) => {
            if (typeof window !== 'undefined') {
                const session = await getSession();
                if (session?.user?.token) {
                    config.headers.Authorization = `Bearer ${session.user.token}`;
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
    ```

### Protection des routes
La protection est orchestrée dans le fichier racine `src/middleware.js` via un middleware d'authentification NextAuth :
*   Le middleware compare la route demandée avec les listes configurées dans `configs/routes.config`.
*   Si l'utilisateur tente d'accéder à une route privée (hors `/sign-in` et routes publiques) sans session active, il est immédiatement redirigé vers `/sign-in?callbackUrl=[URL_Demandee]`.

---

## 4. Appels API Existants et Résolution Réseau

Le template gère actuellement deux modèles d'appels :

1.  **Requêtes d'authentification NextAuth (`validateCredential.js`)** :
    Appelées côté serveur lors de la soumission du formulaire de connexion pour valider les identifiants contre la Gateway.
2.  **Appels génériques du client Axios (`apiClient.js`)** :
    Utilisés par le reste de l'application pour les requêtes CRUD métiers (étudiants, transactions, ordres de traitement).

### Résolution réseau Docker (Server-side vs Client-side)
Étant donné que le frontend tourne dans un conteneur Docker, la résolution de `localhost` diffère selon le contexte d'exécution de Next.js :
*   **Côté serveur** (Server Actions, NextAuth credentials logic) : L'adresse IP de la gateway sur la machine hôte (`localhost:4000`) n'existe pas. Le code doit appeler le DNS interne de Docker, soit **`http://gateway:4000/api`**.
*   **Côté client** (Requêtes déclenchées depuis le navigateur web de l'utilisateur) : Le navigateur doit pouvoir contacter la Gateway exposée publiquement sur **`http://localhost:4000/api`**.

Pour gérer cela de manière robuste, les URL de base ont été adaptées de manière dynamique :
```javascript
const isServer = typeof window === 'undefined';
const gatewayUrl = isServer
    ? 'http://gateway:4000/api'
    : (process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:4000/api');
```

---

## 5. Pages et Fonctionnalités Métier

### Pages implémentées
*   **Connexion / Authentification** :
    *   `/sign-in` (Formulaire de connexion avec identifiants préconfigurés pour le compte Comptable).
    *   `/sign-up` (Page d'inscription).
    *   `/forgot-password` (Mot de passe oublié).
    *   `/reset-password` (Réinitialisation du mot de passe).
*   **Dashboard** :
    *   `/home` : Affiche l'état de la session de l'utilisateur actuel, son rôle (authority) et la date de dernière connexion transmise par l'API Gateway.

### Composants exploitables pour ProgiTresor
Le template contient des éléments prêts à être interfacés avec nos services :
*   **Composant `Table`** (`src/components/ui/Table`) couplé à `@tanstack/react-table` pour l'affichage paginé et triable des transactions et des ordres de traitement.
*   **Composant `Upload`** (`src/components/ui/Upload`) pour la future interface d'import de fichiers Excel d'opérations bancaires dans le `transaction-service`.
*   **Visualisations graphiques** via `react-apexcharts` (configuré dans `configs/chart.config.js`) pour le dashboard récapitulatif des flux budgétaires.

---

## 6. Variables d'Environnement et Configuration

### Fichier `.env`
Le fichier contient les clés de configuration critiques :
*   `AUTH_SECRET` : Clé de chiffrement des sessions NextAuth.
*   `NEXTAUTH_URL` : URL publique du serveur Next.js (`http://localhost:3030/`).
*   `AUTH_TRUST_HOST` : Activé pour autoriser les proxys Docker en production.
*   `NEXT_PUBLIC_API_GATEWAY` : Point d'accès de l'API Gateway (`http://localhost:4000/api`).

### Fichier `next.config.mjs`
Ne contient aucun proxy ou rewrite en dur. L'acheminement des requêtes métiers s'effectue directement par appel HTTP CORS cross-origin vers la Gateway grâce aux adresses absolues résolues par `apiClient.js`.
