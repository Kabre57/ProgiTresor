import { apiClient } from './client';

export type NotificationList = {
  id: string;
  target: string;
  description: string;
  date: string;
  image: string;
  type: number;
  location: string;
  locationLabel: string;
  status: string;
  readed: boolean;
};

export type SearchData = {
  key: string;
  path: string;
  title: string;
  icon: string;
  category: string;
  categoryTitle: string;
};

export type SearchResult = {
  title: string;
  data: SearchData[];
};

export async function apiGetNotificationCount(): Promise<{ count: number }> {
  const response = await apiClient.get<{ count: number }>('/notifications/count');
  return response.data;
}

export async function apiGetNotificationList<T = NotificationList[]>(): Promise<T> {
  const response = await apiClient.get<T>('/notifications');
  return response.data;
}

export async function apiGetSearchResult<T = SearchResult[]>(params: { query: string }): Promise<T> {
  const response = await apiClient.get<T>('/search', { params });
  return response.data;
}
