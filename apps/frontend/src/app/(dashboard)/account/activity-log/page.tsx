'use client'

import { useEffect, useState } from 'react'
import ActivityLogProvider from '@/components/account/activity-log/ActivityLogProvider'
import ActivityLog from '@/components/account/activity-log/ActivityLog'
import { apiGetLogs } from '@/lib/api/logApi'
import type {
    Activities,
    GetActivityLogResponse,
} from '@/components/account/types'

export default function Page() {
    const [data, setData] = useState<Activities>([])
    const [loadable, setLoadable] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiGetLogs<GetActivityLogResponse, { activityIndex: number }>({ activityIndex: 1 })
            .then((resp) => {
                if (resp && resp.data) {
                    setData(resp.data)
                    setLoadable(resp.loadable)
                }
            })
            .catch((err) => {
                console.error(err)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    if (loading) {
        return null
    }

    return (
        <ActivityLogProvider
            data={data}
            loadable={loadable}
        >
            <ActivityLog />
        </ActivityLogProvider>
    )
}
