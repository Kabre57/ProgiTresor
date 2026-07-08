'use client'

type LocaleProviderProps = {
    messages: any
    children: React.ReactNode
    locale: string
}

const LocaleProvider = ({ children }: LocaleProviderProps) => {
    return <>{children}</>
}

export default LocaleProvider
