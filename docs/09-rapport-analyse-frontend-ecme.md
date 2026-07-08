# Rapport d'analyse de conformité du frontend ProgiTresor par rapport au template Ecme

Ce document présente une analyse détaillée de l'intégration du template **Ecme** dans le frontend de l'application **ProgiTresor**, en vérifiant son adéquation avec les fonctionnalités métier exposées par les microservices de l'API Gateway.

---

## 1. Résumé exécutif

L'évaluation globale montre que le frontend de **ProgiTresor** a réussi à intégrer l'esthétique générale, la palette de couleurs et la structure de navigation du template **Ecme**, tout en remplaçant des parties d'infrastructure majeures par des solutions plus robustes et adaptées aux microservices de production.

### Points clés de divergence et d'alignement :
*   **Infrastructure & Data Fetching** : Le template Ecme utilise **SWR** pour le fetching de données et **Next-Auth** pour l'authentification. Le frontend ProgiTresor a migré vers **React Query (@tanstack/react-query)** pour la gestion d'état des requêtes et utilise un store **Zustand** personnalisé (`useAuthStore`) avec des intercepteurs Axios pour l'injection et le rafraîchissement automatique des jetons JWT. Cette décision est jugée excellente pour des flux de travail métier complexes.
*   **Composants UI** : ProgiTresor utilise des composants UI simplifiés écrits en TypeScript (situés dans `src/components/ui/`) plutôt que les composants d'origine d'Ecme qui sont en JavaScript simple. Bien que cela améliore le typage, de nombreux composants riches d'Ecme (gestion de graphiques ApexCharts avancés, calendriers FullCalendar, cartes et tableaux hautement configurables avec pagination/tri) ne sont pas encore exploités.
*   **Sécurisation RBAC** : L'accès à la navigation est correctement sécurisé côté client par rapport au rôle de l'utilisateur grâce à la configuration `navigation.ts` et au composant `AppShell`. De plus, le middleware Next.js protège les routes sur le serveur.

---

## 2. Analyse détaillée par page

Voici l'évaluation systématique des 16 pages actuelles du frontend de ProgiTresor.

### Page : `/login`
*   **Connexion API** : Oui, requêtes réelles vers `POST /api/auth/login`.
*   **Données** : Dynamiques. Renvoie l'utilisateur, son rôle et les jetons JWT.
*   **RBAC** : Non applicable (publique).
*   **Validation** : Oui, validation stricte avec Zod (`loginSchema`) et `react-hook-form`.
*   **Gestion d'état** : Locale au store Zustand lors du succès.
*   **Composants** : Utilise des composants de formulaire simplifiés. Visuellement aligné avec la section Auth d'Ecme.

### Page : `/dashboard`
*   **Connexion API** : Oui, via le Gateway vers `auth-service` (users), `student-service` (antennes), `transaction-service` (transactions), `order-service` (orders) et `compta-service` (comptes).
*   **Données** : Dynamiques. Affiche les KPIs réels calculés à partir du backend.
*   **RBAC** : Non, accessible à tous les utilisateurs connectés.
*   **Validation** : Non applicable (lecture seule).
*   **Gestion d'état** : React Query (`useTransactions`, `useOrders`, etc.).
*   **Composants** : Utilise des cartes et tables simplifiées. *Opportunité manquée* d'utiliser les graphiques ApexCharts du template Ecme pour afficher les volumes financiers et la répartition par antenne.

### Page : `/students` (Fiches étudiants)
*   **Connexion API** : Oui, appelle `student-service` pour la recherche de matricule, la création/modification d'étudiants, et le batch lookup.
*   **Données** : Dynamiques.
*   **RBAC** : Oui, restreint aux rôles `ADMIN`, `COMPTABLE` et `CONSULTANT`.
*   **Validation** : Oui, Zod (`studentFormSchema`) pour le formulaire d'édition.
*   **Gestion d'état** : React Query et formulaires gérés par `react-hook-form`.
*   **Composants** : Utilise `DataTable` pour afficher les résultats batch, ainsi que des formulaires standard.

### Page : `/transactions`
*   **Connexion API** : Oui, appelle `transaction-service` pour lister les transactions globales, les transactions non affectées, et importer des transactions.
*   **Données** : Dynamiques.
*   **RBAC** : Oui, restreint aux rôles financiers (`ADMIN`, `COMPTABLE`, `CHEF_COMPTABLE`, `DF`, `CONSULTANT`).
*   **Validation** : Non (l'import JSON brut utilise `JSON.parse` sans validation Zod côté frontend, s'en remettant à la validation du backend).
*   **Gestion d'état** : React Query.
*   **Composants** : Utilise `DataTable` et un champ de texte `Textarea`.
*   > [!WARNING]
    > **Écart ergonomique** : L'import se fait par copier-coller d'un tableau JSON brut dans un Textarea au lieu d'un composant de téléversement (Upload) de fichiers Excel/CSV comme proposé par le template Ecme.

### Page : `/orders` (Ordres de paiement)
*   **Connexion API** : Oui, appelle `order-service` pour lister les OT, lancer la génération automatique et changer le statut d'un OT.
*   **Données** : Dynamiques.
*   **RBAC** : Oui, le bouton de génération et les transitions de statuts sont filtrés par rôles (`ADMIN`, `COMPTABLE`, `CHEF_COMPTABLE`, `DF`, `BUDGET`).
*   **Validation** : Saisie simple (pas de schéma Zod complexe pour les changements de statuts).
*   **Gestion d'état** : React Query mutations (`useGenerateOrders`, `useUpdateOrderStatus`).
*   **Composants** : Modale de modification de statut et tableau `DataTable`.

### Pages Référentiels : `/admin/antennes`, `/admin/niveaux`, `/admin/statuts`, `/admin/types-flux`, `/admin/types-recettes`, `/admin/nomenclatures`
*   **Connexion API** : Oui, requêtes de type CRUD vers les endpoints de `student-service`.
*   **Données** : Dynamiques.
*   **RBAC** : Lecture accessible aux rôles autorisés, écriture restreinte à `ADMIN`.
*   **Validation** : Formulaires génériques gérés par le composant transverse `ReferentialPage`.
*   **Gestion d'état** : React Query.
*   **Composants** : Excellente réutilisation avec le composant customisé `ReferentialPage`.

### Page : `/compta/comptes` (SYSCOHADA)
*   **Connexion API** : Oui, appelle `compta-service`.
*   **Données** : Dynamiques (chargées depuis la base de données après le seed).
*   **RBAC** : Restreint aux rôles financiers.
*   **Validation** : Saisie classique en formulaire (numéro, libellé, classe).
*   **Gestion d'état** : React Query.
*   **Composants** : Modale et DataTable. *Manque d'ergonomie* : Pas de pagination interactive implémentée (limite fixée à 50).

### Page : `/compta/ecritures` (Journal)
*   **Connexion API** : Oui, appelle `compta-service`.
*   **Données** : Dynamiques.
*   **RBAC** : Restreint aux rôles financiers.
*   **Validation** : Saisie via formulaire.
*   **Gestion d'état** : React Query.
*   > [!IMPORTANT]
    > **Écart critique** : La saisie du compte débit et du compte crédit se fait par saisie de texte libre (Input texte) au lieu d'afficher une liste déroulante (Select) des comptes SYSCOHADA existants, ce qui expose à des erreurs de saisie.

### Page : `/admin/users` (Utilisateurs)
*   **Connexion API** : Oui, appelle `auth-service` pour les opérations CRUD sur les utilisateurs et la récupération des rôles.
*   **Données** : Dynamiques.
*   **RBAC** : Restreint au rôle `ADMIN` (Administrateur).
*   **Validation** : Oui, validation Zod (`userFormSchema`) avec gestion des erreurs.
*   **Gestion d'état** : React Query.
*   **Composants** : Modale d'édition et DataTable.

### Page : `/admin/roles` (Rôles & Permissions)
*   **Connexion API** : Oui, appelle `auth-service` pour récupérer les rôles et permissions.
*   **Données** : Dynamiques.
*   **RBAC** : Restreint à l'administrateur.
*   **Validation** : Non (lecture seule).
*   **Gestion d'état** : React Query.
*   **Composants** : Deux colonnes de `DataTable` simples. *Incomplet* : C'est un simple visualiseur. Aucune possibilité d'associer des permissions à des rôles ou de créer/modifier un rôle.

---

## 3. Pages manquantes et fonctionnalités à créer

Pour couvrir l'ensemble des besoins métiers du backend, les pages suivantes devraient être ajoutées ou améliorées :

1.  **Éditeur de Permissions RBAC** : Une interface interactive permettant à l'administrateur de cocher/décocher des permissions pour un rôle donné et de sauvegarder cette matrice en base de données.
2.  **Audit Logs (Journaux d'Audit)** : Une page de consultation des journaux système de sécurité et d'actions critiques (ex: qui a validé ou rejeté quel OT et quand) en exploitant les logs de l'infrastructure ou une table dédiée.
3.  **Rapports et exports PDF/Excel** : Une interface dédiée à la génération d'états comptables (Grand Livre, Balance) et à l'export au format PDF ou Excel des écritures et transactions.

---

## 4. Composants réutilisables d'Ecme à exploiter

Le template Ecme fournit des composants haut de gamme qui devraient remplacer les composants minimalistes actuels :

| Composant Ecme | Utilité pour ProgiTresor | État actuel dans ProgiTresor |
| :--- | :--- | :--- |
| **`Chart` (ApexCharts wrapper)** | Visualisation des statistiques financières sur le Dashboard. | Non utilisé (données textuelles uniquement). |
| **`Upload`** | Glisser-déposer de fichiers Excel/CSV de transactions. | Remplacé par un Textarea de copier-coller JSON. |
| **`Pagination`** | Gestion fine du parcours des grands volumes d'écritures. | Non intégré (limites de lignes codées en dur). |
| **`Dropdown` / `Menu`** | Menus contextuels sur les lignes de tableaux d'OT. | Actions réduites à des boutons d'icônes simples. |
| **`DatePicker`** | Filtrage précis par plage de dates dans les écritures. | Input de type `"date"` HTML natif basique. |

---

## 5. Problèmes techniques identifiés et Recommandations

### Problèmes :
1.  **Saisie libre des comptes comptables** : La création d'une écriture comptable requiert d'écrire le compte débit/crédit manuellement dans un champ texte. Risque élevé de rejeter la requête pour cause de compte inexistant.
2.  **Absence de Pagination Réelle** : Les listes chargent en dur les 50 premiers éléments. Avec le volume réel de transactions et d'écritures, l'absence de contrôles de pagination (Page Suivante, Nb lignes par page) entraînera des blocages visuels.
3.  **Typage lâche sur certains payloads** : Plusieurs mutations utilisent le type `unknown` pour leurs paramètres (ex: `import` dans `useImportTransactions`), ce qui réduit la robustesse du typage TypeScript.

### Recommandations :
*   **Sélectionneur de Comptes** : Remplacer les champs texte de débit/crédit de la page `/compta/ecritures` par un composant `Select` alimenté par la liste des comptes retournée par `useComptes`.
*   **Téléversement de Fichiers** : Intégrer le composant `Upload` d'Ecme pour permettre l'import de vrais fichiers Excel (`.xlsx`), et utiliser une librairie comme `xlsx` ou s'en remettre au backend pour le parsing du fichier multipart.
*   **Enrichissement visuel du Dashboard** : Intégrer le wrapper de graphique `Chart` pour afficher la courbe d'évolution des recettes par mois et par antenne.
*   **Pagination interactive** : Adapter les composants `DataTable` pour intégrer le composant de pagination natif d'Ecme en passant des paramètres `page` et `limit` dynamiques à React Query.
