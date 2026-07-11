---
name: ai-agent-workflow-builder
description: Crée et gère des workflows d'agents IA robustes et prévisibles pour l'analyse, la génération de code, les tests et le déploiement de projets logiciels. Utilisez cette compétence pour structurer des processus d'amélioration continue, automatiser des tâches complexes et garantir la qualité et la sécurité des livrables.
license: Complete terms in LICENSE.txt
---

# ai-agent-workflow-builder

Cette compétence guide la mise en place et l'exécution de workflows d'agents IA pour le développement logiciel, en se concentrant sur la robustesse, la testabilité, la scalabilité et la prévisibilité.

## Quand utiliser cette compétence

Utilisez `ai-agent-workflow-builder` lorsque vous avez besoin de :

*   **Structurer un processus d'amélioration continue** pour un projet logiciel.
*   **Automatiser des tâches complexes** telles que l'analyse de code, la génération de correctifs, l'exécution de tests ou le déploiement.
*   **Garantir la qualité et la sécurité** des livrables logiciels à travers un processus systématique.
*   **Définir des rôles et des responsabilités clairs** pour différents agents IA dans un pipeline de développement.
*   **Estimer et suivre la prévisibilité** des résultats et des délais de développement.

## Workflow d'Agents IA

Le workflow est articulé autour de plusieurs agents spécialisés, chacun ayant un rôle défini, des entrées spécifiques, des livrables attendus et des critères de qualité. Le processus est itératif et permet une boucle d'amélioration continue.

### Agents Clés et Leurs Rôles

| Agent | Rôle Principal | Entrées Typiques | Livrables Typiques | Agent Suivant |
| :---- | :------------- | :--------------- | :----------------- | :------------ |
| **AER** (Analyse des Exigences) | Analyse les problèmes, définit les spécifications. | Rapports d'audit, documentation, logs. | Document de Spécification Détaillée (DSD). | AGC ou AS |
| **AGC** (Génération de Code) | Implémente les modifications de code. | DSD, code source existant, schémas. | Code source mis à jour, tests unitaires. | AT |
| **AT** (Test) | Valide les modifications, assure la non-régression. | Code de l'AGC, DSD, collections Postman. | Rapport de Tests Détaillé, journal des anomalies. | AID ou AER/AGC |
| **AID** (Intégration et Déploiement) | Déploie la solution validée en production. | Code validé par l'AT, configurations. | Environnement opérationnel, tableaux de bord. | AS ou AER |
| **AS** (Sécurité) | Audite la sécurité du code et de l'infrastructure. | Code source, rapports d'audit, configurations. | Rapport d'Audit de Sécurité, correctifs. | AGC ou AER |

## Utilisation des Ressources Bundlées

Cette compétence inclut des ressources pour faciliter la mise en œuvre du workflow :

### Références

*   **`references/workflow_guide.md`**: Un guide complet sur la mise en place d'un workflow d'agents IA robuste et prévisible.
*   **`references/progitresor_analyse_synthese.md`**: Une synthèse de l'analyse initiale du projet ProgiTresor.
*   **`references/progitresor_agents_definition.md`**: La définition détaillée des agents IA.

### Modèles (Templates)

*   **`templates/dsd_template.md`**: Un modèle pour créer un Document de Spécification Détaillée (DSD).
*   **`templates/presentation_script_template.md`**: Un modèle de script de présentation pour expliquer le workflow aux parties prenantes.

### Scripts

*   **`scripts/validate_secrets.sh`**: Un exemple de script de validation pour vérifier l'externalisation des secrets dans un fichier `docker-compose.yml`.

## Comment Interagir avec la Compétence

1.  **Identifier un Problème ou une Amélioration :** Commencez par un problème spécifique dans votre projet.
2.  **Lancer l'AER :** Utilisez les documents de référence et le modèle DSD pour formuler un prompt à l'AER.
3.  **Suivre le Flux :** Passez les livrables de chaque agent comme entrées pour le suivant.
4.  **Validation et Présentation :** Utilisez les scripts de test pour valider les modifications et le template de présentation pour communiquer sur les résultats.

Cette compétence vous fournit le cadre et les outils pour construire et gérer un processus de développement logiciel intelligent et automatisé.
