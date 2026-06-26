type NotificationList = {
    id: string
    target: string
    description: string
    date: string
    image: string
    type: number
    location: string
    locationLabel: string
    status: string
    readed: boolean
}

type SearchData = {
    key: string
    path: string
    title: string
    icon: string
    category: string
    categoryTitle: string
}

type SearchResult = {
    title: string
    data: SearchData[]
}

export async function apiGetNotificationCount(): Promise<{ count: number }> {
    return { count: 0 }
}

export async function apiGetNotificationList(): Promise<NotificationList[]> {
    return []
}

export async function apiGetSearchResult<T = SearchResult[]>(params: { query: string }): Promise<T> {
    return [] as unknown as T
}
