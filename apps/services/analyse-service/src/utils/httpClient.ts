import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

export const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:5003';
export const ETUDIANT_SERVICE_URL = process.env.ETUDIANT_SERVICE_URL || 'http://etudiant-service:5002';
export const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:5004';

const http: AxiosInstance = axios.create({ timeout: Number(process.env.HTTP_TIMEOUT_MS ?? 30000) });

axiosRetry(http, {
  retries: Number(process.env.HTTP_RETRY_COUNT ?? 3),
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => (error.response?.status ?? 500) >= 500,
});

http.interceptors.request.use((config) => {
  if (process.env.INTERNAL_API_SECRET) {
    config.headers['X-Internal-Secret'] = process.env.INTERNAL_API_SECRET;
  }
  return config;
});

export { http };
