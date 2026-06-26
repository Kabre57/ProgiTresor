'use client'

import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/useAuthStore'
import {
    PiUserDuotone,
    PiGearDuotone,
    PiPulseDuotone,
    PiSignOutDuotone,
} from 'react-icons/pi'

const _UserDropdown = () => {
    const { user, clearSession } = useAuthStore()
    const router = useRouter()

    const handleSignOut = () => {
        clearSession()
        router.replace('/login')
    }

    const avatarProps = {
        icon: <PiUserDuotone />,
        src: user?.photoUrl || undefined,
    }

    return (
        <Dropdown
            className="flex"
            toggleClassName="flex items-center"
            renderTitle={
                <div className="cursor-pointer flex items-center">
                    <Avatar size={32} {...avatarProps} />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="py-2 px-3 flex items-center gap-3">
                    <Avatar {...avatarProps} />
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {user ? `${user.nom} ${user.prenom}` : 'Utilisateur'}
                        </div>
                        <div className="text-xs text-gray-500">
                            {user?.email || 'Pas d’adresse email'}
                        </div>
                    </div>
                </div>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="Profile" className="px-0">
                <Link className="flex h-full w-full px-3 py-2 gap-2 items-center" href="/account/settings">
                    <span className="text-xl">
                        <PiUserDuotone />
                    </span>
                    <span>Profil</span>
                </Link>
            </Dropdown.Item>
            <Dropdown.Item eventKey="Settings" className="px-0">
                <Link className="flex h-full w-full px-3 py-2 gap-2 items-center" href="/account/settings">
                    <span className="text-xl">
                        <PiGearDuotone />
                    </span>
                    <span>Paramètres du compte</span>
                </Link>
            </Dropdown.Item>
            <Dropdown.Item eventKey="Activity Log" className="px-0">
                <Link className="flex h-full w-full px-3 py-2 gap-2 items-center" href="/account/activity-log">
                    <span className="text-xl">
                        <PiPulseDuotone />
                    </span>
                    <span>Journal d'activité</span>
                </Link>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item
                eventKey="Sign Out"
                className="gap-2"
                onClick={handleSignOut}
            >
                <span className="text-xl">
                    <PiSignOutDuotone />
                </span>
                <span>Se déconnecter</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
