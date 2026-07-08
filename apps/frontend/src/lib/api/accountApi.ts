import { apiClient } from './client';
import type {
  GetSettingsProfileResponse,
  GetSettingsNotificationResponse,
  GetSettingsBillingResponse,
  GetSettingsIntegrationResponse
} from '@/components/account/types';

export async function apiGetSettingsProfile<T = GetSettingsProfileResponse>(): Promise<T> {
  const response = await apiClient.get<T>('/account/profile');
  return response.data;
}

export async function apiGetSettingsNotification<T = GetSettingsNotificationResponse>(): Promise<T> {
  const response = await apiClient.get<T>('/account/notification');
  return response.data;
}

export async function apiGetSettingsBilling<T = GetSettingsBillingResponse>(): Promise<T> {
  const response = await apiClient.get<T>('/account/billing');
  return response.data;
}

// Kept typo in name to match legacy service call names exactly and avoid TS compile errors
export async function apiGetSettingsIntergration<T = GetSettingsIntegrationResponse>(): Promise<T> {
  const response = await apiClient.get<T>('/account/integration');
  return response.data;
}
