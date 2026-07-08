'use client'

import Menu from '@/components/ui/Menu'
import ScrollBar from '@/components/ui/ScrollBar'
import { isStudentUser } from '@/lib/auth/roles'
import { useSettingsStore } from '@/lib/store/account/settingsStore'
import { useAuthStore } from '@/lib/store/useAuthStore'

import {
    TbUserSquare,
    TbLock,
    TbBell,
    TbFileDollar,
    TbRefreshDot,
} from 'react-icons/tb'
import { useSearchParams, useRouter } from 'next/navigation'
import type { View } from '../types'
import type { ReactNode } from 'react'

const { MenuItem } = Menu

const menuList: { label: string; value: View; icon: ReactNode }[] = [
    { label: 'Profile', value: 'profile', icon: <TbUserSquare /> },
    { label: 'Security', value: 'security', icon: <TbLock /> },
    { label: 'Notification', value: 'notification', icon: <TbBell /> },
    { label: 'Billing', value: 'billing', icon: <TbFileDollar /> },
    { label: 'Integration', value: 'integration', icon: <TbRefreshDot /> },
]

const studentHiddenViews = new Set<View>(['billing', 'integration'])

export const SettingsMenu = ({ onChange }: { onChange?: () => void }) => {
    const searchParams = useSearchParams()
    const router = useRouter()

    const { currentView, setCurrentView } = useSettingsStore()
    const user = useAuthStore((state) => state.user)
    const isStudent = isStudentUser(user)
    const visibleMenuList = isStudent
        ? menuList.filter((menu) => !studentHiddenViews.has(menu.value))
        : menuList

    const currentPath =
        searchParams.get('tab') || searchParams.get('category') || searchParams.get('label') || currentView

    const handleSelect = (value: View) => {
        setCurrentView(value)
        router.push(`/account/settings?tab=${value}`)
        onChange?.()
    }

    return (
        <div className="flex flex-col justify-between h-full">
            <ScrollBar className="h-full overflow-y-auto">
                <Menu className="mx-2 mb-10">
                    {visibleMenuList.map((menu) => (
                        <MenuItem
                            key={menu.value}
                            eventKey={menu.value}
                            className={`mb-2 ${
                                currentView === menu.value
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : ''
                            }`}
                            isActive={currentView === menu.value || currentPath === menu.value}
                            onSelect={() => handleSelect(menu.value)}
                        >
                            <span className="text-2xl ltr:mr-2 rtl:ml-2">
                                {menu.icon}
                            </span>
                            <span>{menu.label}</span>
                        </MenuItem>
                    ))}
                </Menu>
            </ScrollBar>
        </div>
    )
}

export default SettingsMenu
