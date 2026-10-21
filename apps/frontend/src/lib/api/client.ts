import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { applyPermissionPayload, decodeJwtPermissions } from '@/lib/auth/permissionPayload';
import { useAuthStore } from '@/lib/store/useAuthStore';

const baseURL = process.env.NEXT_PUBLIC_API_GATEWAY ?? 'http://localhost:4000/api';

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const isAuthRequest = (url?: string) => Boolean(url?.includes('/auth/'));

export const apiClient = axios.create({
  baseURL,
  timeout: 600000,
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// No need to inject Authorization header — cookies are sent automatically

apiClient.interceptors.request.use((config) => {
  if (isAuthRequest(config.url)) {
    return config;
  }

  const { hydrated, sessionChecked, isAuthenticated } = useAuthStore.getState();
  if (!hydrated || !sessionChecked || !isAuthenticated) {
    return Promise.reject(new Error('Session non vérifiée ou expirée.'));
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    const status = error.response?.status;
    const isRefreshRequest = isAuthRequest(originalRequest?.url);

    if (!originalRequest || originalRequest._retry || isRefreshRequest || status !== 401) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Refresh via cookie — no need to send refreshToken in body
      const refreshResponse = await axios.post<{ accessToken: string }>(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true },
      );

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore
          .getState()
          .setUser(applyPermissionPayload(currentUser, decodeJwtPermissions(refreshResponse.data.accessToken)));
      }

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
    if (error.response?.status === 403) {
      return 'Accès refusé : votre session a expiré ou votre niveau de permission est insuffisant.';
    }

    const payload = error.response?.data as Record<string, unknown> | undefined;
    // Extract error or message, ensuring we always return a string
    const raw = payload?.error ?? payload?.message;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      const message = (raw as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
      // Handle cases where message is an object (e.g. validation errors)
      try {
        return JSON.stringify(raw);
      } catch {
        return 'Erreur de validation du serveur';
      }
    }
    if (error.response?.status === 409) {
      return 'Conflit : ces données existent déjà ou ne peuvent pas être modifiées dans leur état actuel.';
    }
    return error.message ?? 'Erreur serveur';
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Une erreur est survenue';
};
