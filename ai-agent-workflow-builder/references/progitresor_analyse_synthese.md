# Synthèse de l'Analyse du Projet ProgiTresor

## État des Lieux
Le projet **ProgiTresor** est une architecture microservices avancée utilisant **Node.js (Express)**, **TypeScript**, **Prisma**, **PostgreSQL**, **Redis** et **Next.js**. Bien que structurellement solide (découpage par service, usage de Zod, Saga pattern), il présente des faiblesses critiques en matière de sécurité (secrets hardcodés), de cohérence des données (synchronisation OT/transactions) et de divergence entre le frontend et le backend.

## Sources de Vérité pour les Agents
| Type de Source | Localisation | Utilité pour les Agents |
| :--- | :--- | :--- |
| **Schémas de Données** | `apps/services/*/prisma/schema.prisma` | Définition des entités et relations. |
| **Contrats d'API** | `docs/04-api-documentation/api-complete.json` | Spécifications des endpoints et formats d'échange. |
| **Types Partagés** | `shared/types/*.ts` | Garant de la cohérence typée entre services. |
| **Décisions d'Architecture** | `docs/06-adr/*.md` | Contexte sur les choix technologiques (ex: Saga). |
| **Rapports d'Audit** | `docs/10-rapport-analyse-complete-progitresor.md` | Liste des bugs et points d'amélioration prioritaires. |

## Défis Majeurs à Automatiser
1.  **Correction de la Saga OT** : Résoudre le bug de mapping métier et assurer l'idempotence.
2.  **Sécurisation des Secrets** : Automatiser la migration vers des variables d'environnement sécurisées.
3.  **Alignement Frontend/Backend** : Réparer les contrats d'import et les statuts OT divergents.
4.  **Tests de Régression** : Mettre en place des tests de bout en bout pour les flux financiers critiques.
