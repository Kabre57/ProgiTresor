# Tests Postman

Importer les collections et environnements selon le service a tester.

## frontend / gateway

Fichiers :

- `progitresor-gateway.frontend.postman_collection.json`
- `progitresor-gateway.frontend.postman_environment.json`

Prerequis :

```bash
docker compose up -d gateway auth-service student-service transaction-service order-service compta-service
```

Selectionner l'environnement `ProgiTresor Gateway - Frontend Local`, puis lancer `01 Auth / Login` en premier.
La requete stocke automatiquement `access_token` et `refresh_token` pour les requetes protegees.

Note RBAC : certains tests acceptent `403` en plus de `200`, car plusieurs routes du gateway autorisent encore des libelles de roles francais alors que le JWT emet des codes (`ADMIN`, `COMPTABLE`, etc.).

## auth-service

Fichiers :

- `auth-service.postman_collection.json`
- `auth-service.local.postman_environment.json`

Prerequis :

```bash
docker compose up -d --build postgres auth-service
curl http://localhost:5001/health
```

Selectionner l'environnement `ProgiTresor auth-service - local`, puis lancer la collection.

Identifiants seed :

- username: `admin`
- password: `Password123!`

La requete `POST /login - admin` remplit automatiquement `accessToken` et `refreshToken`.

## student-service

Fichiers :

- `student-service.postman_collection.json`
- `student-service.local.postman_environment.json`

Prerequis :

```bash
docker compose up -d --build postgres redis student-service
curl http://localhost:5002/health
```

Selectionner l'environnement `ProgiTresor student-service - local`, puis lancer la collection dans l'ordre.

La collection :

- verifie `/health`
- lit les referentiels seedes et stocke `antenneId`, `niveauId`, `statutId`, `typeFluxId`, `typeRecetteId`
- verifie le lookup et le batch étudiant
- cree un étudiant temporaire, le met a jour, puis le relit
- verifie un cas RBAC interdit sur `POST /antennes` sans role

Matricule seed utilise par defaut :

- `21P-0154ASIB`

## transaction-service

Fichiers :

- `transaction-service.postman_collection.json`
- `transaction-service.local.postman_environment.json`

Prerequis :

```bash
docker compose up -d --build postgres transaction-service
curl http://localhost:5003/health
```

Selectionner l'environnement `ProgiTresor transaction-service - local`, puis lancer la collection dans l'ordre.

La collection :

- verifie `/health` et `/metrics`
- liste les imports seedes et lit un import par ID
- effectue un import de 2 transactions de test
- verifie la validation (items vide = 400)
- liste les transactions avec pagination
- lit les transactions hors budget non affectees
- lie des transactions a un OT, verifie le lien
- verifie la validation link-ot (champs manquants = 400)
- delie les transactions d'un OT
- synchronise le statut d'un OT miroir

Donnees seed utilisees par defaut :

- `refTresor` : `TR-2024-001`, `TR-2024-002`
- `importId` : `1`
- `codeOt` : `OT-2024-001`

## order-service

Fichiers :

- `order-service.postman_collection.json`
- `order-service.local.postman_environment.json`

Prerequis :

```bash
docker compose up -d --build postgres redis order-service
curl http://localhost:5004/health
```

Selectionner l'environnement `ProgiTresor order-service - local`, puis lancer la collection dans l'ordre.

La collection :

- verifie `/health` et `/metrics`
- liste les ordres de traitement (OT) pagines
- genere les synthèses et les OT à partir des transactions de test (requiert le role `COMPTABLE` ou `ADMIN`)
- met a jour le statut d'un OT vers `Transmis` en verifiant le cycle de vie de l'OT et le role
- liste les synthèses OT de paiement paginees
- lit une synthèse par sa reference unique ou par son ID

Donnees seed utilisees par defaut :

- `codeOt` : `OT-2024-ABJ-001` (rempli automatiquement apres generation)
- `syntheseRef` : `SYN-2024-JAN-001` (rempli automatiquement)
- `syntheseId` : `1`

## compta-service

Fichiers :

- `compta-service.postman_collection.json`
- `compta-service.local.postman_environment.json`

Prerequis :

```bash
docker compose up -d --build postgres compta-service
curl http://localhost:5005/health
```

Selectionner l'environnement `ProgiTresor compta-service - local`, puis lancer la collection dans l'ordre.

La collection :

- verifie `/health` et `/metrics`
- liste les comptes comptables pagines (requiert le role `COMPTABLE`, `CHEF_COMPTABLE` ou `ADMIN`)
- lit un compte comptable par son numero
- cree, met a jour et supprime un compte comptable (requiert le role `CHEF_COMPTABLE` ou `ADMIN`)
- liste les écritures comptables paginees (requiert le role `COMPTABLE`, `CHEF_COMPTABLE` ou `ADMIN`)
- lit une écriture comptable par son ID
- cree une écriture comptable manuelle (requiert le role `CHEF_COMPTABLE` ou `ADMIN`)
- genere une écriture comptable automatiquement à partir d'un ordre (requiert le role `CHEF_COMPTABLE` ou `ADMIN`)

Donnees seed utilisees par defaut :

- `compteNumero` : `467`
- `ecritureId` : `1`


