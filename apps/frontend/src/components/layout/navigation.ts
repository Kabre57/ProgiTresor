import {
  PiSpeedometerDuotone,
  PiFileTextDuotone,
  PiCurrencyCircleDollarDuotone,
  PiGraduationCapDuotone,
  PiListChecksDuotone,
  PiBuildingDuotone,
  PiStackDuotone,
  PiShareNetworkDuotone,
  PiBookOpenDuotone,
  PiUsersDuotone,
  PiShieldCheckDuotone,
  PiLinkDuotone,
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
const accountingRoles: RoleCode[] = ['ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier'];
const etudiantRoles: RoleCode[] = ['ADMIN', 'COMPTABLE', 'CONSULTANT', 'Administrateur', 'Comptable', 'Consultant'];
const orderRoles: RoleCode[] = ['ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'BUDGET', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier', 'Agent Budget'];

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Pilotage',
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: PiSpeedometerDuotone },
      { label: 'Transactions', href: '/transactions', icon: PiFileTextDuotone, roles: accountingRoles },
      { label: 'Synthèse recettes', href: '/dashboard/recettes', icon: PiCurrencyCircleDollarDuotone, roles: accountingRoles },
    ],
  },
  {
    label: 'Étudiants',
    items: [
      { label: 'Fiches étudiants', href: '/etudiant', icon: PiGraduationCapDuotone, roles: etudiantRoles },
      { label: 'Réf. Promotions', href: '/etudiant/promotions', icon: PiListChecksDuotone, roles: etudiantRoles },
      { label: 'Promotions', href: '/admin/promotions', icon: PiListChecksDuotone, roles: adminRoles },
      { label: 'Antennes', href: '/admin/antennes', icon: PiBuildingDuotone, roles: etudiantRoles },
      { label: 'Filières', href: '/admin/filieres', icon: PiStackDuotone, roles: etudiantRoles },
      { label: 'Statuts', href: '/admin/statuts', icon: PiListChecksDuotone, roles: etudiantRoles },
      { label: 'Types flux', href: '/admin/types-flux', icon: PiShareNetworkDuotone, roles: etudiantRoles },
      { label: 'Types recettes', href: '/admin/types-recettes', icon: PiCurrencyCircleDollarDuotone, roles: etudiantRoles },
      { label: 'Nomenclatures', href: '/admin/nomenclatures', icon: PiBookOpenDuotone, roles: etudiantRoles },
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
      { label: 'Portail Étudiant', href: '/etudiant/portail', icon: PiGraduationCapDuotone, roles: ['ETUDIANT', 'Etudiant'] },
    ],
  },
];

export const canAccessItem = (roleCode: string | undefined, item: NavigationItem) => {
  if (!item.roles || item.roles.length === 0) return true;
  if (!roleCode) return false;
  return item.roles.includes(roleCode as RoleCode);
};
