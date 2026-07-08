import { config } from '../config';

const budgetRoles = ['Administrateur', 'Agent Budget', 'Chef Comptable', 'Directeur Financier', 'Comptable'];

export const budgetOrdresPaiementRoute = {
  path: '/api/budget/ordres-paiement',
  target: config.BUDGET_SERVICE_URL,
  secure: true,
  roles: budgetRoles,
  serviceBasePath: '/ordres-paiement',
  perimeter: 'BUDGET',
  action: 'READ_OP',
  requiredLevel: 1,
};

export const budgetOrdrePaiementByIdRoute = {
  path: '/api/budget/ordres-paiement/:id',
  target: config.BUDGET_SERVICE_URL,
  secure: true,
  roles: budgetRoles,
  serviceBasePath: '/ordres-paiement/:id',
  perimeter: 'BUDGET',
  action: 'READ_OP',
  requiredLevel: 1,
};
