import { config } from '../config';

export const analyseKpisRoute = {
  path: '/api/analyse/kpis',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget', 'Consultant'],
  serviceBasePath: '/kpis',
  perimeter: 'ANALYSE',
  action: 'READ_KPIS',
  requiredLevel: 1,
};

export const analyseGenerateSynthesisRoute = {
  path: '/api/analyse/generate-synthesis',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/generate-synthesis',
  perimeter: 'ANALYSE',
  action: 'GENERATE_SYNTHESIS',
  requiredLevel: 2,
};

export const analyseValidateSynthesisRoute = {
  path: '/api/analyse/validate-synthesis',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/validate-synthesis',
  perimeter: 'ANALYSE',
  action: 'VALIDATE_SYNTHESIS',
  requiredLevel: 2,
};

export const analyseUploadsRoute = {
  path: '/api/analyse/uploads',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget', 'Consultant'],
  serviceBasePath: '/uploads',
  perimeter: 'ANALYSE',
  action: 'READ_PDF',
  requiredLevel: 1,
};

export const analyseStreamRoute = {
  path: '/api/analyse/stream',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget', 'Consultant'],
  serviceBasePath: '/stream',
  perimeter: 'ANALYSE',
  action: 'READ_KPIS',
  requiredLevel: 1,
};

export const analysePreviewPdfRoute = {
  path: '/api/analyse/preview-pdf',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'],
  serviceBasePath: '/preview-pdf',
  perimeter: 'ANALYSE',
  action: 'VALIDATE_SYNTHESIS',
  requiredLevel: 2,
};

export const analyseArchivesRoute = {
  path: '/api/analyse/archives',
  target: config.ANALYSE_SERVICE_URL,
  secure: true,
  roles: ['Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget', 'Consultant'],
  serviceBasePath: '/archives',
  perimeter: 'ANALYSE',
  action: 'READ_KPIS',
  requiredLevel: 1,
};


