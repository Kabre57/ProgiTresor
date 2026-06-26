import { config } from '../config';

// Route pour l'obtention du profil de l'étudiant connecté
export const studentMeRoute = {
  path: '/api/students/me',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/me'
};

// Route pour l'import d'étudiants (restricted to Admin)
export const studentImportRoute = {
  path: '/api/students/import',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur'],
  serviceBasePath: '/import'
};

// Route pour associer un matricule Trésor Pay (admin ou étudiant)
export const studentMapRoute = {
  path: '/api/students/tresor-pay/map',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Etudiant', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/tresor-pay/map'
};

// Route pour récupérer un étudiant par son matricule Trésor Pay
export const studentGetTresorPayRoute = {
  path: '/api/students/tresor-pay',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/tresor-pay'
};

// Route pour récupérer les notifications d'étudiants temporaires
export const studentNotificationsRoute = {
  path: '/api/students/notifications/etudiant-temporaire',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/notifications/etudiant-temporaire'
};

// Route pour la gestion des promotions
export const studentPromotionsRoute = {
  path: '/api/students/promotions',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/promotions'
};

// Route pour la gestion des filières
export const studentFilieresRoute = {
  path: '/api/students/filieres',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget'],
  serviceBasePath: '/filieres'
};

// Route pour la gestion des étudiants (accès plus large, pour le reste des appels)
export const studentRoutes = {
  path: '/api/students',
  target: config.STUDENT_SERVICE_URL,
  secure: true,    // JWT requis
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Consultant', 'Agent Budget']
};

// Route pour l'upload de photo étudiant
export const studentPhotoRoute = {
  path: '/api/students/photo',
  target: config.STUDENT_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Chef Comptable'],
  serviceBasePath: '/photo'
};
