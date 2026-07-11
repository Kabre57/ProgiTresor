import { apiClient } from '@/lib/api/client';
import type {
  OrderListEnvelope,
  OrderTransmissionResult,
  PaymentOrder,
  SingleOrderTransmissionResult,
} from '@/types/order.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeOrdersResponse = (payload: unknown): PaymentOrder[] => {
  if (Array.isArray(payload)) {
    return payload as PaymentOrder[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  const envelope = payload as OrderListEnvelope;
  if (Array.isArray(envelope.items)) {
    return envelope.items;
  }

  if (Array.isArray(envelope.data)) {
    return envelope.data;
  }

  return [];
};

const normalizeTransmissionResults = (payload: unknown): OrderTransmissionResult[] => {
  if (Array.isArray(payload)) {
    return payload as OrderTransmissionResult[];
  }

  if (isRecord(payload) && Array.isArray(payload.results)) {
    return payload.results as OrderTransmissionResult[];
  }

  return [];
};

export const orderApi = {
  list: async () => {
    const response = await apiClient.get<unknown>('/orders');
    return normalizeOrdersResponse(response.data);
  },

  updateStatus: async (code: string, payload: { statut: string; motif?: string }) => {
    const response = await apiClient.put<PaymentOrder>(`/orders/${code}/status`, payload);
    return response.data;
  },

  createCorrection: async (code: string, payload?: Record<string, unknown>) => {
    const response = await apiClient.post<PaymentOrder>(`/orders/${code}/corrections`, payload ?? {});
    return response.data;
  },

  transmettreBudget: async (code: string) => {
    const response = await apiClient.post<SingleOrderTransmissionResult>(`/ots/${code}/transmettre-budget`);
    return response.data;
  },
  
  validateAndTransmit: async (codes: string[]) => {
    const response = await apiClient.post<unknown>('/orders/validate-and-transmit', { codes });
    return normalizeTransmissionResults(response.data);
  },
};
