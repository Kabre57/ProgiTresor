import type { Routes } from '@/@types/routes'

const adminRoles = ['ADMIN', 'Administrateur']
const comptableRoles = ['ADMIN', 'COMPTABLE', 'Administrateur', 'Comptable']
const dfRoles = ['ADMIN', 'DF', 'CONSULTANT', 'Administrateur', 'Directeur Financier', 'Consultant']
const chefComptableRoles = ['ADMIN', 'CHEF_COMPTABLE', 'Administrateur', 'Chef Comptable']
const budgetRoles = ['ADMIN', 'BUDGET', 'Administrateur', 'Agent Budget']
const etudiantRoles = ['ADMIN', 'CONSULTANT', 'Administrateur', 'Consultant']
const accountingRoles = ['ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'Administrateur', 'Comptable', 'Chef Comptable']
const workflowRoles = [
    'ADMIN',
    'COMPTABLE',
    'CHEF_COMPTABLE',
    'DF',
    'BUDGET',
    'Administrateur',
    'Comptable',
    'Chef Comptable',
    'Directeur Financier',
    'Agent Budget',
]
const opBudgetRoles = [
    'ADMIN',
    'DF',
    'BUDGET',
    'Administrateur',
    'Directeur Financier',
    'Agent Budget',
]
const otRoles = [
    'ADMIN',
    'CHEF_COMPTABLE',
    'DF',
    'BUDGET',
    'Administrateur',
    'Chef Comptable',
    'Directeur Financier',
    'Agent Budget',
]

export const protectedRoutes: Routes = {
    '/dashboard': {
        key: 'dashboard',
        authority: adminRoles,
    },
    '/transactions': {
        key: 'transactions',
        authority: comptableRoles,
    },
    '/dashboard/recettes': {
        key: 'recettes',
        authority: dfRoles,
    },
    '/backoffice/synthese': {
        key: 'backoffice.synthese',
        authority: chefComptableRoles,
    },
    '/orders': {
        key: 'orders',
        authority: otRoles,
    },
    '/compta/bordereaux': {
        key: 'compta.bordereaux',
        authority: workflowRoles,
    },
    '/compta/lots': {
        key: 'compta.lots',
        authority: workflowRoles,
    },
    '/compta/controle-op': {
        key: 'compta.controleOp',
        authority: workflowRoles,
    },
    '/budget/ordres-paiement': {
        key: 'budget.ordresPaiement',
        authority: opBudgetRoles,
    },
    '/etudiant': {
        key: 'etudiant.list',
        authority: etudiantRoles,
    },
    '/etudiant/promotions': {
        key: 'etudiant.promotions',
        authority: etudiantRoles,
    },
    '/admin/users': {
        key: 'admin.users',
        authority: adminRoles,
    },
    '/admin/roles': {
        key: 'admin.roles',
        authority: adminRoles,
    },
    '/admin/permissions': {
        key: 'admin.permissions',
        authority: adminRoles,
    },
    '/admin/tresor-mapping': {
        key: 'admin.tresorMapping',
        authority: accountingRoles,
    },
    '/admin/mapping-tresor-pay': {
        key: 'admin.mappingTresorPay',
        authority: accountingRoles,
    },
    '/admin/promotions': {
        key: 'admin.referentials.promotions',
        authority: adminRoles,
    },
    '/admin/antennes': {
        key: 'admin.referentials.antennes',
        authority: etudiantRoles,
    },

    '/admin/filieres': {
        key: 'admin.referentials.filieres',
        authority: etudiantRoles,
    },
    '/admin/statuts': {
        key: 'admin.referentials.statuts',
        authority: etudiantRoles,
    },
    '/admin/types-flux': {
        key: 'admin.referentials.typesFlux',
        authority: etudiantRoles,
    },
    '/admin/types-recettes': {
        key: 'admin.referentials.typesRecettes',
        authority: etudiantRoles,
    },
    '/admin/nomenclatures': {
        key: 'admin.referentials.nomenclatures',
        authority: etudiantRoles,
    },

    '/etudiant/portail': {
        key: 'etudiant.portail',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/etudiant/portal': {
        key: 'etudiant.portail',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/etudiant/scolarite': {
        key: 'etudiant.scolarite',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/etudiant/attestations': {
        key: 'etudiant.attestations',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/etudiant/profile': {
        key: 'etudiant.profile',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/etudiant/security': {
        key: 'etudiant.security',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/etudiant/notifications': {
        key: 'etudiant.notifications',
        authority: ['ETUDIANT', 'Etudiant'],
    },
    '/account/settings': {
        key: 'account.settings',
        authority: [],
    },
    '/account/activity-log': {
        key: 'account.activityLog',
        authority: [],
    },
}

export const publicRoutes: Routes = {}

export const authRoutes: Routes = {
    '/login': {
        key: 'login',
        authority: [],
    },
    '/sign-in': {
        key: 'signIn',
        authority: [],
    },
    '/sign-up': {
        key: 'signUp',
        authority: [],
    },
}
