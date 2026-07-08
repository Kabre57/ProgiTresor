'use client'

import { lazy, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import SettingsMenu from './SettingsMenu'
import SettingMobileMenu from './SettingMobileMenu'
import Loading from '@/components/shared/Loading'
import { isStudentUser } from '@/lib/auth/roles'
import { useSettingsStore } from '@/lib/store/account/settingsStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import type { View } from '../types'

const Profile = lazy(() => import('./SettingsProfile'))
const Security = lazy(() => import('./SettingsSecurity'))
const Notification = lazy(() => import('./SettingsNotification'))
const Billing = lazy(() => import('./SettingsBilling'))
const Integration = lazy(() => import('./SettingIntegration'))

const validViews: View[] = ['profile', 'security', 'notification', 'billing', 'integration']
const studentHiddenViews = new Set<View>(['billing', 'integration'])

const Settings = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { currentView, setCurrentView } = useSettingsStore()
    const user = useAuthStore((state) => state.user)
    const isStudent = isStudentUser(user)

    useEffect(() => {
        const tab = searchParams.get('tab') as View | null
        if (tab && validViews.includes(tab)) {
            const nextView = isStudent && studentHiddenViews.has(tab) ? 'profile' : tab
            if (nextView !== tab) {
                router.replace('/account/settings?tab=profile')
            }
            if (currentView !== nextView) {
                setCurrentView(nextView)
            }
            return
        }

        if (isStudent && studentHiddenViews.has(currentView)) {
            setCurrentView('profile')
        }
    }, [searchParams, currentView, isStudent, router, setCurrentView])

    return (
        <AdaptiveCard className="h-full">
            <div className="flex flex-auto h-full">
                <div className="w-[200px] xl:w-[280px] hidden lg:block">
                    <SettingsMenu />
                </div>
                <div className="xl:ltr:pl-6 xl:rtl:pr-6 flex-1 py-2">
                    <div className="mb-6 lg:hidden">
                        <SettingMobileMenu />
                    </div>
                    <Suspense
                        fallback={<Loading loading={true} className="w-full" />}
                    >
                        {currentView === 'profile' && <Profile />}
                        {currentView === 'security' && <Security />}
                        {currentView === 'notification' && <Notification />}
                        {!isStudent && currentView === 'billing' && <Billing />}
                        {!isStudent && currentView === 'integration' && <Integration />}
                    </Suspense>
                </div>
            </div>
        </AdaptiveCard>
    )
}

export default Settings
