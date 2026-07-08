# Guide d'Utilisation du Workflow d'Agents IA - ProgiTresor

Ce guide explique comment utiliser le workflow d'agents IA mis en place pour automatiser l'amélioration et la maintenance du projet ProgiTresor.

## Architecture du Workflow

Le workflow repose sur une chaîne de 5 agents spécialisés :

1. **Agent d'Analyse des Exigences (AER)** : Analyse le problème et définit les spécifications (DSD).

1. **Agent de Génération de Code (AGC)** : Implémente les modifications de code basées sur le DSD.

1. **Agent de Test (AT)** : Valide les modifications via des scripts de test et génère un rapport.

1. **Agent d'Intégration et de Déploiement (AID)** : Déploie la solution validée.

1. **Agent de Sécurité (AS)** : Audite la sécurité de la solution déployée.

## Comment Lancer un Cycle de Workflow

### Étape 1 : Initialisation (AER)

Identifiez un problème ou une amélioration (ex: "Bug dans la Saga OT"). Fournissez les documents pertinents à l'AER et demandez-lui de générer un Document de Spécification Détaillée (DSD).

- **Prompt type :** "Analysez le bug de mapping dans `sagaCoordinator.ts` et générez un DSD pour sa correction."

### Étape 2 : Implémentation (AGC)

Donnez le DSD généré par l'AER à l'AGC. L'AGC modifiera le code source et créera les tests unitaires nécessaires.

- **Prompt type :** "En vous basant sur le DSD fourni, corrigez le mapping dans `sagaCoordinator.ts` et mettez à jour les tests unitaires."

### Étape 3 : Validation (AT)

L'AT exécute les tests sur le code modifié. Il utilise des scripts de validation (comme `validate_secrets_externalization.sh`) pour confirmer le succès.

- **Action :** Exécutez le script de test et analysez le rapport de tests généré.

### Étape 4 : Déploiement (AID)

Une fois les tests validés, l'AID prend le relais pour construire les images Docker et déployer le projet.

- **Commande :** `make build && make up` (en s'assurant que les variables d'environnement sont définies).

### Étape 5 : Audit de Sécurité (AS)

L'AS vérifie l'environnement déployé pour s'assurer qu'aucune faille n'est présente.

- **Action :** Analysez les logs et les configurations de l'environnement de production.

## Exemple de Réussite : Sécurisation des Secrets

Le workflow a été testé avec succès pour l'externalisation des secrets dans `docker-compose.yml`.

- **Livrable AER** : `DSD_Securisation_Secrets_DockerCompose.md`

- **Livrable AGC** : Modifications appliquées à `docker-compose.yml`.

- **Livrable AT** : `Rapport_Tests_Securisation_Secrets.md` (Validation via `validate_secrets_externalization.sh`).

## Bonnes Pratiques

- Toujours valider le DSD de l'AER avant de passer à l'AGC.

- S'assurer que les scripts de test de l'AT couvrent les cas nominaux et les cas d'erreur.

- Utiliser des variables d'environnement pour toute configuration sensible.
