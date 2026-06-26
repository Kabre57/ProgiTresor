import {
    PiSpeedometerDuotone,
    PiFileTextDuotone,
    PiChartPieSliceDuotone,
    PiUserCircleDuotone,
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
    students: <PiUserCircleDuotone />,
    promotions: <PiListChecksDuotone />,
    users: <PiUsersDuotone />,
    roles: <PiShieldCheckDuotone />,
    permissions: <PiKeyholeDuotone />,
    tresorMapping: <PiShareNetworkDuotone />,
    mappingMatricules: <PiSquareSplitHorizontalDuotone />,
    referentials: <PiGridFourDuotone />,
    portail: <PiHouseLineDuotone />,
}

export default navigationIcon
