import { authRoutes } from './auth.routes';
import {
  studentRoutes,
  studentImportRoute,
  studentMeRoute,
  studentMapRoute,
  studentGetTresorPayRoute,
  studentNotificationsRoute,
  studentPromotionsRoute,
  studentFilieresRoute,
  studentPhotoRoute
} from './student.routes';
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
  studentImportRoute,
  studentMeRoute,
  studentMapRoute,
  studentNotificationsRoute,
  studentGetTresorPayRoute,
  studentPromotionsRoute,
  studentFilieresRoute,
  studentPhotoRoute,
  studentRoutes,
  transactionImportRoute,
  transactionExportRoute,
  dashboardKpisRoute,
  dashboardGroupedByRecetteRoute,
  dashboardExportSyntheseRoute,
  transactionFetchFromTresorRoute,
  transactionListRoute,
  orderRoutes
];
