import { useAuthStore } from '@/lib/store/useAuthStore'

const useCurrentSession = () => {
    const { user } = useAuthStore()

    return {
        session: user ? {
            user: {
                name: `${user.nom} ${user.prenom}`,
                email: user.email || '',
                avatar: '',
                authority: [user.role?.code || '']
            }
        } : null,
    }
}

export default useCurrentSession
