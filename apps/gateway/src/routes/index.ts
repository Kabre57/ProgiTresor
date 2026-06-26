import { authRoutes } from './auth.routes';
import {
  etudiantRoutes,
  etudiantImportRoute,
  etudiantMeRoute,
  etudiantMapRoute,
  etudiantGetTresorPayRoute,
  etudiantNotificationsRoute,
  etudiantPromotionsRoute,
  etudiantFilieresRoute,
  etudiantPhotoRoute
} from './etudiant.routes';
import {
  transactionImportRoute,
  transactionListRoute,
  transactionExportRoute,
  dashboardKpisRoute,
  dashboardGroupedByRecetteRoute,
  dashboardExportSyntheseRoute,
  transactionFetchFromTresorRoute,
} from './transaction.routes';
import { orderRoutes } from './order.routes';
import { userRoutes, rolesRoute, permissionsRoute, myProfileRoute } from './user.routes';

export interface GatewayRoute {
  path: string;
  target: string;
  secure: boolean;
  roles?: string[];
  serviceBasePath?: string;
}

export const allRoutes: GatewayRoute[] = [
  authRoutes,
  myProfileRoute,
  userRoutes,
  rolesRoute,
  permissionsRoute,
  etudiantImportRoute,
  etudiantMeRoute,
  etudiantMapRoute,
  etudiantNotificationsRoute,
  etudiantGetTresorPayRoute,
  etudiantPromotionsRoute,
  etudiantFilieresRoute,
  etudiantPhotoRoute,
  etudiantRoutes,
  transactionImportRoute,
  transactionExportRoute,
  dashboardKpisRoute,
  dashboardGroupedByRecetteRoute,
  dashboardExportSyntheseRoute,
  transactionFetchFromTresorRoute,
  transactionListRoute,
  orderRoutes
];
