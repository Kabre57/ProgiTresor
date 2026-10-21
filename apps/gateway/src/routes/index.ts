import { authRoutes } from './auth.routes';
import {
  etudiantRoutes,
  etudiantImportRoute,
  etudiantReferentialImportRoute,
  etudiantMeRoute,
  etudiantMapRoute,
  etudiantGetTresorPayRoute,
  etudiantNotificationsRoute,
  etudiantPromotionsRoute,
  etudiantFilieresRoute,
  etudiantNiveauxRoute,
  etudiantPhotoRoute,
  typeFluxRoute,
  typeRecetteRoute,
  nomenclatureProduitRoute,
  configurationFraisNiveauRoute
} from './etudiant.routes';
import {
  transactionImportRoute,
  transactionImportFileRoute,
  transactionListRoute,
  transactionExportRoute,
  dashboardKpisRoute,
  dashboardGroupedByRecetteRoute,
  dashboardExportSyntheseRoute,
  transactionFetchFromTresorRoute,
  transactionLockRoute,
  transactionListByIdsRoute,
} from './transaction.routes';
import { orderGenerateRoute, orderRoutes, otRoutes } from './order.routes';
import {
  analyseGenerateSynthesisRoute,
  analyseKpisRoute,
  analyseUploadsRoute,
  analyseValidateSynthesisRoute,
  analyseStreamRoute,
  analysePreviewPdfRoute,
  analyseArchivesRoute,
} from './analyse.routes';
import { userRoutes, rolesRoute, permissionsRoute, myProfileRoute } from './user.routes';
import {
  comptaBordereauxRoute,
  comptaControlesOpRoute,
  comptaEntriesRoute,
  comptaEntryByIdRoute,
  comptaLignesBudgetairesRoute,
  comptaLotsRoute,
  comptaPendingEcrituresRoute,
} from './compta.routes';
import { budgetOrdresPaiementRoute } from './budget.routes';

export interface GatewayRoute {
  path: string;
  target: string;
  secure: boolean;
  roles?: string[];
  serviceBasePath?: string;
  perimeter?: string;
  action?: string;
  requiredLevel?: number;
}

export const allRoutes: GatewayRoute[] = [
  authRoutes,
  myProfileRoute,
  userRoutes,
  rolesRoute,
  permissionsRoute,
  etudiantImportRoute,
  etudiantReferentialImportRoute,
  etudiantMeRoute,
  etudiantMapRoute,
  etudiantNotificationsRoute,
  etudiantGetTresorPayRoute,
  etudiantPromotionsRoute,
  etudiantFilieresRoute,
  etudiantNiveauxRoute,
  typeFluxRoute,
  typeRecetteRoute,
  nomenclatureProduitRoute,
  configurationFraisNiveauRoute,
  etudiantPhotoRoute,
  etudiantRoutes,
  transactionImportRoute,
  transactionImportFileRoute,
  transactionExportRoute,
  dashboardKpisRoute,
  dashboardGroupedByRecetteRoute,
  dashboardExportSyntheseRoute,
  transactionFetchFromTresorRoute,
  transactionLockRoute,
  transactionListRoute,
  transactionListByIdsRoute,
  analyseUploadsRoute,
  analyseKpisRoute,
  analyseGenerateSynthesisRoute,
  analyseValidateSynthesisRoute,
  analyseStreamRoute,
  analysePreviewPdfRoute,
  analyseArchivesRoute,
  orderGenerateRoute,
  otRoutes,
  orderRoutes,
  comptaBordereauxRoute,
  comptaLotsRoute,
  comptaLignesBudgetairesRoute,
  comptaControlesOpRoute,
  comptaPendingEcrituresRoute,
  comptaEntriesRoute,
  comptaEntryByIdRoute,
  budgetOrdresPaiementRoute
];
