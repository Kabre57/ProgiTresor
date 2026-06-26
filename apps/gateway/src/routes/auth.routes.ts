import { config } from '../config';

/**
 * Routes d'authentification (service auth)
 * Ces routes sont publiques (pas de JWT requis) car il s'agit du login.
 */

export const authRoutes = {
  path: '/api/auth',
  target: config.AUTH_SERVICE_URL,
  secure: false,   // Pas d'authentification requise
  roles: []        // Pas de restriction de rôle
};