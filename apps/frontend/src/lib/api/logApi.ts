import { apiClient } from './client';

export async function apiGetLogs<T, U extends Record<string, unknown>>(params: U): Promise<T> {
  const response = await apiClient.get<T>('/logs', { params });
  return response.data;
}
