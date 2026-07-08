'use client'

import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import { useAuthStore } from '@/lib/store/useAuthStore'

function useAuthority(
    userAuthority: string[] = [],
    authority: string[] = [],
    emptyCheck = false,
) {
    const user = useAuthStore((state) => state.user)

    const roleMatched = useMemo(() => {
        if (!user) return false;

        const userRole = user.role?.code?.toUpperCase() || ''
        if (userRole === 'ADMIN') return true;

        // Direct role check
        return authority.some((role) => userAuthority.includes(role))
    }, [authority, userAuthority, user])

    if (
        isEmpty(authority) ||
        typeof authority === 'undefined'
    ) {
        return !emptyCheck
    }

    return roleMatched
}

export default useAuthority
