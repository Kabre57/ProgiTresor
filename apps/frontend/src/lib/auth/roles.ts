import type { UserProfile } from '@/types/auth.types'

const normalizeRole = (value?: string | null) =>
    value
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, '_') ?? ''

export const isStudentUser = (user?: Pick<UserProfile, 'role'> | null) => {
    const roleCode = normalizeRole(user?.role?.code)
    const roleLabel = normalizeRole(user?.role?.libelle)

    return roleCode === 'ETUDIANT' || roleLabel === 'ETUDIANT'
}
