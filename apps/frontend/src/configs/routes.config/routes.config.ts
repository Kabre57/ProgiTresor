import type { Routes } from '@/@types/routes'

const adminRoles = ['ADMIN', 'Administrateur']
const accountingRoles = ['ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'Administrateur', 'Comptable', 'Chef Comptable', 'Directeur Financier']
const studentRoles = ['ADMIN', 'COMPTABLE', 'CONSULTANT', 'Administrateur', 'Comptable', 'Consultant']

export const protectedRoutes: Routes = {
    '/dashboard': {
        key: 'dashboard',
        authority: [],
    },
    '/transactions': {
        key: 'transactions',
        authority: accountingRoles,
    },
    '/dashboard/recettes': {
        key: 'recettes',
        authority: accountingRoles,
    },
    '/students': {
        key: 'students.list',
        authority: studentRoles,
    },
    '/students/promotions': {
        key: 'students.promotions',
        authority: studentRoles,
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
        authority: studentRoles,
    },
    '/admin/filieres': {
        key: 'admin.referentials.filieres',
        authority: studentRoles,
    },
    '/admin/statuts': {
        key: 'admin.referentials.statuts',
        authority: studentRoles,
    },
    '/admin/types-flux': {
        key: 'admin.referentials.typesFlux',
        authority: studentRoles,
    },
    '/admin/types-recettes': {
        key: 'admin.referentials.typesRecettes',
        authority: studentRoles,
    },
    '/admin/nomenclatures': {
        key: 'admin.referentials.nomenclatures',
        authority: studentRoles,
    },
    '/etudiant/portail': {
        key: 'etudiant.portail',
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

