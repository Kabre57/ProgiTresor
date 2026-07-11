# Définition des Agents IA pour le Workflow ProgiTresor

Pour adresser les défis identifiés dans le projet ProgiTresor et mettre en place un workflow robuste et prévisible, nous définissons les agents IA suivants, chacun avec des rôles, responsabilités, entrées, sorties et critères de qualité spécifiques.

## 1. Agent d'Analyse des Exigences (AER)

Cet agent est responsable de la compréhension approfondie des problèmes métier ou techniques et de leur traduction en exigences claires et actionnables pour les autres agents.

*   **Rôle :** Analyser les rapports d'audit, les spécifications existantes et les retours d'erreurs pour identifier les causes profondes et définir les solutions.
*   **Entrées :**
    *   `docs/10-rapport-analyse-complete-progitresor.md` (Rapport d'audit initial)
    *   `docs/01-analyse-fonctionnelle/index.md` (Cahier des charges)
    *   `docs/04-api-documentation/api-complete.json` (Spécifications API)
    *   Journaux d'erreurs et rapports de bugs (futurs)
*   **Processus :**
    1.  Lecture et interprétation des documents d'entrée.
    2.  Identification des écarts, incohérences ou vulnérabilités.
    3.  Formalisation des exigences fonctionnelles et non fonctionnelles pour la correction ou l'amélioration.
*   **Livrables :**
    *   **Document de Spécification Détaillée (DSD)** : Décrit le problème, la solution proposée, les exigences précises, et les critères d'acceptation.
*   **Qualité du Livrable :** Clarté, précision, complétude, non-ambiguïté. Chaque exigence doit être testable.
*   **Tests :** Revue par un agent humain ou un autre AER pour valider la compréhension et la pertinence des exigences.
*   **Agent Suivant :** Agent de Génération de Code (AGC) ou Agent de Sécurité (AS).

## 2. Agent de Génération de Code (AGC)

Cet agent est chargé de générer ou de modifier le code source des microservices et du frontend en fonction des spécifications détaillées fournies par l'AER.

*   **Rôle :** Implémenter les corrections de bugs, les nouvelles fonctionnalités ou les améliorations de sécurité.
*   **Entrées :**
    *   Document de Spécification Détaillée (DSD) de l'AER.
    *   Code source existant des services (`apps/services/*`, `apps/frontend/*`).
    *   Schémas Prisma (`apps/services/*/prisma/schema.prisma`).
    *   Types partagés (`shared/types/*.ts`).
*   **Processus :**
    1.  Analyse du DSD et du code existant.
    2.  Génération ou modification du code (backend, frontend, schémas de base de données, tests unitaires).
    3.  Mise à jour des types partagés si nécessaire.
*   **Livrables :**
    *   **Code source mis à jour** : Fichiers `.ts`, `.js`, `.prisma`, etc.
    *   **Tests unitaires et d'intégration** : Fichiers de tests associés aux modifications.
*   **Qualité du Livrable :** Conformité aux spécifications, respect des bonnes pratiques de codage (TypeScript strict, Zod), performance, maintenabilité. Les tests unitaires doivent passer.
*   **Tests :** Exécution automatique des tests unitaires et d'intégration générés. Revue de code par un agent humain ou un autre AGC.
*   **Agent Suivant :** Agent de Test (AT).

## 3. Agent de Test (AT)

Cet agent est dédié à la création et à l'exécution de plans de test pour valider les modifications apportées par l'AGC et assurer la robustesse du workflow global.

*   **Rôle :** Vérifier la fonctionnalité, la performance, la sécurité et la fiabilité des agents et du workflow.
*   **Entrées :**
    *   Code source mis à jour et tests unitaires/intégration de l'AGC.
    *   Document de Spécification Détaillée (DSD) de l'AER (pour les critères d'acceptation).
    *   Collections Postman (`docs/postman/*.json`) pour les tests d'API.
*   **Processus :**
    1.  Déploiement du code dans un environnement de test isolé (via Docker Compose).
    2.  Exécution des tests unitaires, d'intégration et de bout en bout (incluant les scénarios de Saga).
    3.  Génération de rapports de couverture de code et de performance.
*   **Livrables :**
    *   **Rapport de Tests Détaillé** : Indique les tests passés/échoués, la couverture de code, les métriques de performance.
    *   **Journal des Anomalies** : Liste des bugs identifiés avec leur sévérité.
*   **Qualité du Livrable :** Exhaustivité des tests, clarté du rapport, reproductibilité des anomalies.
*   **Tests :** Vérification automatique des résultats des tests. Analyse des anomalies par un agent humain ou un AER pour priorisation.
*   **Agent Suivant :** Agent d'Intégration et de Déploiement (AID) si les tests sont concluants, ou retour à l'AER/AGC en cas d'anomalies.

## 4. Agent d'Intégration et de Déploiement (AID)

Cet agent est responsable de l'assemblage des composants validés, de la gestion des configurations et du déploiement en environnement de pré-production ou de production.

*   **Rôle :** Assurer un déploiement fluide et sécurisé du workflow.
*   **Entrées :**
    *   Code source validé par l'AT.
    *   Configurations de déploiement (`docker-compose.yml`, `.env.example`).
    *   Procédures de déploiement (`docs/05-deploiement/01-guide-docker-compose.md`).
*   **Processus :**
    1.  Construction des images Docker.
    2.  Configuration des variables d'environnement (gestion des secrets).
    3.  Déploiement du workflow via Docker Compose ou Kubernetes.
    4.  Mise en place du monitoring et des alertes.
*   **Livrables :**
    *   **Environnement déployé et opérationnel**.
    *   **Tableaux de bord de monitoring**.
    *   **Rapport de déploiement**.
*   **Qualité du Livrable :** Disponibilité, résilience, observabilité du système. Conformité aux politiques de sécurité.
*   **Tests :** Tests de fumée post-déploiement, vérification des logs et des métriques. Tests de reprise après sinistre.
*   **Agent Suivant :** Agent de Sécurité (AS) pour audit continu, ou Agent d'Analyse des Exigences (AER) pour l'amélioration continue.

## 5. Agent de Sécurité (AS)

Cet agent est spécialisé dans l'identification et la correction des vulnérabilités de sécurité, ainsi que dans l'application des meilleures pratiques de sécurité.

*   **Rôle :** Auditer le code et l'infrastructure pour les failles de sécurité, proposer et implémenter des correctifs.
*   **Entrées :**
    *   Code source des services.
    *   Rapports d'audit de sécurité (`docs/07-rapport-conformite-backend.md`).
    *   `docker-compose.yml` et fichiers `.env`.
*   **Processus :**
    1.  Analyse statique et dynamique du code (SAST/DAST).
    2.  Vérification des configurations de sécurité (secrets, CORS, RBAC).
    3.  Proposition de correctifs et de renforcements.
*   **Livrables :**
    *   **Rapport d'Audit de Sécurité** : Liste des vulnérabilités, leur sévérité et les recommandations.
    *   **Correctifs de Code** : Modifications du code pour adresser les failles.
*   **Qualité du Livrable :** Réduction significative des risques de sécurité, conformité aux standards.
*   **Tests :** Tests d'intrusion, scans de vulnérabilité. Revue par un expert en sécurité.
*   **Agent Suivant :** Agent de Génération de Code (AGC) pour implémenter les correctifs, puis Agent de Test (AT) pour valider les correctifs.
