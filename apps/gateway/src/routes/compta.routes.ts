import { config } from '../config';

export const comptaEntriesRoute = {
  path: '/api/compta/entries',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/entries',
  perimeter: 'ANALYSE',
  action: 'READ_KPIS',
  requiredLevel: 1,
};

export const comptaEntryByIdRoute = {
  path: '/api/compta/entries/:id',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/entries/:id',
  perimeter: 'ANALYSE',
  action: 'READ_KPIS',
  requiredLevel: 1,
};

const budgetWorkflowRoles = ['Administrateur', 'Agent Budget', 'Chef Comptable', 'Directeur Financier', 'Comptable'];

export const comptaBordereauxRoute = {
  path: '/api/compta/bordereaux',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: budgetWorkflowRoles,
  serviceBasePath: '/bordereaux',
  perimeter: 'BUDGET',
  action: 'READ_BORDEREAU',
  requiredLevel: 1,
};

export const comptaLotsRoute = {
  path: '/api/compta/lots',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: budgetWorkflowRoles,
  serviceBasePath: '/lots',
  perimeter: 'BUDGET',
  action: 'READ_LOT',
  requiredLevel: 1,
};

export const comptaLignesBudgetairesRoute = {
  path: '/api/compta/lignes-budgetaires',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: budgetWorkflowRoles,
  serviceBasePath: '/lignes-budgetaires',
  perimeter: 'BUDGET',
  action: 'READ_LIGNE',
  requiredLevel: 1,
};

export const comptaControlesOpRoute = {
  path: '/api/compta/controles/op',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: budgetWorkflowRoles,
  serviceBasePath: '/controles/op',
  perimeter: 'BUDGET',
  action: 'READ_CONTROL',
  requiredLevel: 1,
};

export const comptaPendingEcrituresRoute = {
  path: '/api/compta/ecritures/pending',
  target: config.COMPTA_SERVICE_URL,
  secure: true,
  roles: budgetWorkflowRoles,
  serviceBasePath: '/ecritures/pending',
  perimeter: 'BUDGET',
  action: 'READ_ECRITURES',
  requiredLevel: 1,
};

