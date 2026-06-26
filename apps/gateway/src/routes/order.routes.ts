import { config } from '../config';

/**
 * Routes pour les ordres de paiement (service order)
 * Accessibles aux rôles impliqués dans le workflow des OP.
 */

export const orderRoutes = {
  path: '/api/orders',
  target: config.ORDER_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget']
};