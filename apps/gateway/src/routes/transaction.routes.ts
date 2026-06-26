import { config } from '../config';

// Route pour l'import (accès restreint)
export const transactionImportRoute = {
  path: '/api/transactions/import',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable'], // Seuls Admin et Comptable peuvent importer
  serviceBasePath: '/import'
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
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant']
};

export const dashboardGroupedByRecetteRoute = {
  path: '/api/dashboard/grouped-by-recette',
  target: config.TRANSACTION_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant'],
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