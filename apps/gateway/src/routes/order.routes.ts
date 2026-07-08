import { config } from '../config';

/**
 * Routes pour les ordres de traitement (service order)
 * Accessibles aux rôles impliqués dans le workflow des OT.
 */

export const orderRoutes = {
  path: '/api/orders',
  target: config.ORDER_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget']
};

export const orderGenerateRoute = {
  path: '/api/orders/generate',
  target: config.ORDER_SERVICE_URL,
  secure: true,
  roles: ['Agent Budget'],
  serviceBasePath: '/generate',
  perimeter: 'OT',
  action: 'GENERATE',
  requiredLevel: 3
};

export const otRoutes = {
  path: '/api/ots',
  target: config.ORDER_SERVICE_URL,
  secure: true,
  roles: ['Chef Comptable', 'Directeur Financier', 'Administrateur'],
  serviceBasePath: '/ots'
};

