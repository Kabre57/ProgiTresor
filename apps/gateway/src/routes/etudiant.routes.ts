import { config } from '../config';

// Route pour l'obtention du profil de l'étudiant connecté
export const etudiantMeRoute = {
  path: '/api/etudiant/me',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/me'
};

// Route pour l'import d'étudiants (restricted to Admin)
export const etudiantImportRoute = {
  path: '/api/etudiant/import',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur'],
  serviceBasePath: '/import'
};

// Route pour associer un matricule Trésor Pay (admin ou étudiant)
export const etudiantMapRoute = {
  path: '/api/etudiant/tresor-pay/map',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/tresor-pay/map'
};

// Route pour récupérer un étudiant par son matricule Trésor Pay
export const etudiantGetTresorPayRoute = {
  path: '/api/etudiant/tresor-pay',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/tresor-pay'
};

// Route pour récupérer les notifications d'étudiants temporaires
export const etudiantNotificationsRoute = {
  path: '/api/etudiant/notifications/etudiant-temporaire',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/notifications/etudiant-temporaire'
};

// Route pour la gestion des promotions
export const etudiantPromotionsRoute = {
  path: '/api/etudiant/promotions',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/promotions'
};

// Route pour la gestion des filières
export const etudiantFilieresRoute = {
  path: '/api/etudiant/filieres',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/filieres'
};

// Route pour la gestion des niveaux
export const etudiantNiveauxRoute = {
  path: '/api/etudiant/niveaux',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/niveaux'
};

const referentialRoles = ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'];

export const typeFluxRoute = {
  path: '/api/type-flux',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: referentialRoles,
  serviceBasePath: '/type-flux'
};

export const typeRecetteRoute = {
  path: '/api/type-recette',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: referentialRoles,
  serviceBasePath: '/type-recette'
};

export const nomenclatureProduitRoute = {
  path: '/api/nomenclature-produit',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: referentialRoles,
  serviceBasePath: '/nomenclature-produit'
};

export const configurationFraisNiveauRoute = {
  path: '/api/configuration-frais-niveau',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: referentialRoles,
  serviceBasePath: '/configuration-frais-niveau'
};

// Route pour la gestion des étudiants (accès plus large, pour le reste des appels)
export const etudiantRoutes = {
  path: '/api/etudiant',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,    // JWT requis
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget']
};

// Route pour l'upload de photo étudiant
export const etudiantPhotoRoute = {
  path: '/api/etudiant/photo',
  target: config.ETUDIANT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Chef Comptable'],
  serviceBasePath: '/photo'
};
