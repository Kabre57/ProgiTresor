import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/useAuthStore';

const baseURL = process.env.NEXT_PUBLIC_API_GATEWAY ?? 'http://localhost:4000/api';

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// No need to inject Authorization header — cookies are sent automatically

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    const status = error.response?.status;

    if (!originalRequest || originalRequest._retry || (status !== 401 && status !== 403)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Refresh via cookie — no need to send refreshToken in body
      await axios.post<{ accessToken: string }>(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true },
      );
      // Cookie is updated by the gateway, just retry the original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      await useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  },
);

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as Record<string, unknown> | undefined;
    // Extract error or message, ensuring we always return a string
    const raw = payload?.error ?? payload?.message ?? error.message;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      // Handle cases where message is an object (e.g. validation errors)
      try {
        return JSON.stringify(raw);
      } catch {
        return 'Erreur de validation du serveur';
      }
    }
    return error.message ?? 'Erreur serveur';
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Une erreur est survenue';
};
