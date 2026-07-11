import {
  PiSpeedometerDuotone,
  PiFileTextDuotone,
  PiCurrencyCircleDollarDuotone,
  PiChartPieSliceDuotone,
  PiGraduationCapDuotone,
  PiListChecksDuotone,
  PiBuildingDuotone,
  PiStackDuotone,
  PiShareNetworkDuotone,
  PiBookOpenDuotone,
  PiUsersDuotone,
  PiShieldCheckDuotone,
  PiLinkDuotone,
  PiHouseLineDuotone,
  PiUserCircleDuotone,
  PiLockKeyDuotone,
  PiBellDuotone,
  PiCertificateDuotone,
} from 'react-icons/pi';
import type { RoleCode } from '@/types/auth.types';

export type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: RoleCode[];
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const adminRoles: RoleCode[] = ['ADMIN', 'Administrateur'];
const accountingRoles: RoleCode[] = ['ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'Administrateur', 'Comptable', 'Chef Comptable'];
const etudiantRoles: RoleCode[] = ['ADMIN', 'CONSULTANT', 'Administrateur', 'Consultant'];
const orderRoles: RoleCode[] = ['ADMIN', 'CHEF_COMPTABLE', 'DF', 'BUDGET', 'Administrateur', 'Chef Comptable', 'Directeur Financier', 'Agent Budget'];
const analysisRoles: RoleCode[] = ['ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'BUDGET', 'CONSULTANT', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget', 'Consultant'];

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Pilotage',
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: PiSpeedometerDuotone },
      { label: 'Transactions', href: '/transactions', icon: PiFileTextDuotone, roles: accountingRoles },
      { label: 'Synthèse recettes', href: '/dashboard/recettes', icon: PiCurrencyCircleDollarDuotone, roles: accountingRoles },
      { label: 'Synthèses OT', href: '/backoffice/synthese', icon: PiChartPieSliceDuotone, roles: analysisRoles },
      { label: 'Ordres de traitement', href: '/orders', icon: PiListChecksDuotone, roles: orderRoles },
    ],
  },
  {
    label: 'Étudiants',
    items: [
      { label: 'Fiches étudiants', href: '/etudiant', icon: PiGraduationCapDuotone, roles: [...accountingRoles, ...etudiantRoles] },
      { label: 'Réf. Promotions', href: '/etudiant/promotions', icon: PiListChecksDuotone, roles: [...accountingRoles, ...etudiantRoles] },
      { label: 'Promotions', href: '/admin/promotions', icon: PiListChecksDuotone, roles: adminRoles },
      { label: 'Antennes', href: '/admin/antennes', icon: PiBuildingDuotone, roles: [...accountingRoles, ...etudiantRoles] },

      { label: 'Filières', href: '/admin/filieres', icon: PiStackDuotone, roles: [...accountingRoles, ...etudiantRoles] },
      { label: 'Statuts', href: '/admin/statuts', icon: PiListChecksDuotone, roles: [...accountingRoles, ...etudiantRoles] },
      { label: 'Types flux', href: '/admin/types-flux', icon: PiShareNetworkDuotone, roles: [...accountingRoles, ...etudiantRoles] },
      { label: 'Types recettes', href: '/admin/types-recettes', icon: PiCurrencyCircleDollarDuotone, roles: [...accountingRoles, ...etudiantRoles] },
      { label: 'Nomenclatures', href: '/admin/nomenclatures', icon: PiBookOpenDuotone, roles: [...accountingRoles, ...etudiantRoles] },

    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Utilisateurs', href: '/admin/users', icon: PiUsersDuotone, roles: adminRoles },
      { label: 'Rôles & permissions', href: '/admin/roles', icon: PiShieldCheckDuotone, roles: adminRoles },
      { label: 'Permissions', href: '/admin/permissions', icon: PiShieldCheckDuotone, roles: adminRoles },
      { label: 'Correspondance Trésor Pay', href: '/admin/tresor-mapping', icon: PiLinkDuotone, roles: accountingRoles },
      { label: 'Mapping Matricules', href: '/admin/mapping-tresor-pay', icon: PiLinkDuotone, roles: accountingRoles },
    ],
  },
  {
    label: 'Espace Étudiant',
    items: [
      { label: 'Tableau de bord', href: '/etudiant/portail', icon: PiHouseLineDuotone, roles: ['ETUDIANT', 'Etudiant'] },
      { label: 'Ma scolarité', href: '/etudiant/scolarite', icon: PiCurrencyCircleDollarDuotone, roles: ['ETUDIANT', 'Etudiant'] },
      { label: 'Mes attestations', href: '/etudiant/attestations', icon: PiCertificateDuotone, roles: ['ETUDIANT', 'Etudiant'] },
      { label: 'Mon profil', href: '/etudiant/profile', icon: PiUserCircleDuotone, roles: ['ETUDIANT', 'Etudiant'] },
      { label: 'Sécurité', href: '/etudiant/security', icon: PiLockKeyDuotone, roles: ['ETUDIANT', 'Etudiant'] },
      { label: 'Notifications', href: '/etudiant/notifications', icon: PiBellDuotone, roles: ['ETUDIANT', 'Etudiant'] },
    ],
  },
];

export const canAccessItem = (roleCode: string | undefined, item: NavigationItem) => {
  if (!item.roles || item.roles.length === 0) return true;
  if (!roleCode) return false;
  return item.roles.includes(roleCode as RoleCode);
};
