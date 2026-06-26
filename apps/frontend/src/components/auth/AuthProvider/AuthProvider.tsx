'use client'

import SessionContext from './SessionContext'

type AuthProviderProps = {
    session: any
    children: React.ReactNode
}

const AuthProvider = (props: AuthProviderProps) => {
    const { session, children } = props

    return (
        <SessionContext.Provider value={session}>
            {children}
        </SessionContext.Provider>
    )
}

export default AuthProvider
