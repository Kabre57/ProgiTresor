import { config } from '../config';

/**
 * Routes pour la gestion des utilisateurs (service auth)
 * Accessibles à tous les rôles pour la consultation,
 * mais seuls les Administrateurs peuvent créer/modifier/supprimer.
 * (la protection au niveau du service est déjà en place)
 */

export const userRoutes = {
  path: '/api/users',
  target: config.AUTH_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant'],
  serviceBasePath: '/users'   // Préfixe ajouté car Express strip /api/users
};

export const rolesRoute = {
  path: '/api/roles',
  target: config.AUTH_SERVICE_URL,
  secure: true,
  roles: ['Administrateur'],
  serviceBasePath: '/roles'
};

export const permissionsRoute = {
  path: '/api/permissions',
  target: config.AUTH_SERVICE_URL,
  secure: true,
  roles: ['Administrateur'],
  serviceBasePath: '/permissions'
};

// Route pour le profil personnel (tous les utilisateurs connectés)
export const myProfileRoute = {
  path: '/api/me',
  target: config.AUTH_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget', 'Etudiant'],
  serviceBasePath: '/me'
};
