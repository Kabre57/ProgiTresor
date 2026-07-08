import {
    PiSpeedometerDuotone,
    PiFileTextDuotone,
    PiChartPieSliceDuotone,
    PiUserCircleDuotone,
    PiLockKeyDuotone,
    PiBellDuotone,
    PiCreditCardDuotone,
    PiCertificateDuotone,
    PiListChecksDuotone,
    PiUsersDuotone,
    PiShieldCheckDuotone,
    PiKeyholeDuotone,
    PiShareNetworkDuotone,
    PiSquareSplitHorizontalDuotone,
    PiGridFourDuotone,
    PiHouseLineDuotone,
} from 'react-icons/pi'
import type { JSX } from 'react'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    dashboard: <PiSpeedometerDuotone />,
    transactions: <PiFileTextDuotone />,
    recettes: <PiChartPieSliceDuotone />,
    synthese: <PiChartPieSliceDuotone />,
    etudiant: <PiUserCircleDuotone />,
    promotions: <PiListChecksDuotone />,
    users: <PiUsersDuotone />,
    roles: <PiShieldCheckDuotone />,
    permissions: <PiKeyholeDuotone />,
    tresorMapping: <PiShareNetworkDuotone />,
    mappingMatricules: <PiSquareSplitHorizontalDuotone />,
    referentials: <PiGridFourDuotone />,
    portail: <PiHouseLineDuotone />,
    portailScolarite: <PiCreditCardDuotone />,
    portailAttestations: <PiCertificateDuotone />,
    portailProfile: <PiUserCircleDuotone />,
    portailSecurity: <PiLockKeyDuotone />,
    portailNotification: <PiBellDuotone />,
    orders: <PiListChecksDuotone />,
}

export default navigationIcon
