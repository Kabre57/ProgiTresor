import { config } from '../config';

// Route pour l'import (accès restreint)
export const transactionImportRoute = {
  path: '/api/transactions/import',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable'], // Seuls Admin, Comptable et Etudiant (pour déclaration de reçu) peuvent importer
  serviceBasePath: '/import',
  perimeter: 'IMPORT',
  action: 'CREATE',
  requiredLevel: 2
};

// Route pour l'import de fichier Excel
export const transactionImportFileRoute = {
  path: '/api/transactions/import-file',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable'],
  serviceBasePath: '/import-file',
  perimeter: 'IMPORT',
  action: 'CREATE_FILE',
  requiredLevel: 2
};

// Route pour l'export des transactions
export const transactionExportRoute = {
  path: '/api/transactions/export',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/export'
};

// Route pour les KPIs du dashboard
export const dashboardKpisRoute = {
  path: '/api/dashboard/kpis',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant'],
  serviceBasePath: '/kpis'
};

// Route pour la consultation des transactions (accès plus large)
export const transactionListRoute = {
  path: '/api/transactions',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  perimeter: 'IMPORT',
  action: 'READ',
  requiredLevel: 1
};

export const dashboardGroupedByRecetteRoute = {
  path: '/api/dashboard/grouped-by-recette',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/grouped-by-recette'
};

export const dashboardExportSyntheseRoute = {
  path: '/api/dashboard/export-synthese',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant'],
  serviceBasePath: '/export-synthese'
};

export const transactionFetchFromTresorRoute = {
  path: '/api/transactions/fetch-from-tresor',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable'],
  serviceBasePath: '/fetch-from-tresor'
};

export const transactionLockRoute = {
  path: '/api/transactions/lock',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Agent Budget'],
  serviceBasePath: '/lock',
  perimeter: 'OT',
  action: 'LOCK',
  requiredLevel: 3
};

export const transactionListByIdsRoute = {
  path: '/api/transactions/by-ids',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/by-ids',
  perimeter: 'IMPORT',
  action: 'READ',
  requiredLevel: 1
};

