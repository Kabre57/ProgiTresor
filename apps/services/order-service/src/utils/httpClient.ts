import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:5003';
const ETUDIANT_SERVICE_URL = process.env.ETUDIANT_SERVICE_URL || 'http://localhost:5002';

/**
 * Client HTTP avec retry exponentiel pour les appels inter-services.
 */
const http: AxiosInstance = axios.create({ timeout: 30000 });
axiosRetry(http, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => (error.response?.status ?? 500) >= 500
});

export { http, TRANSACTION_SERVICE_URL, ETUDIANT_SERVICE_URL };
