import { apiClient } from '@/lib/api/client';
import type { PaymentOrder } from '@/types/order.types';

export const orderApi = {
  list: async () => {
    const response = await apiClient.get<PaymentOrder[]>('/orders');
    return response.data;
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
    const response = await apiClient.post<{ message: string; downloadUrl: string; order: PaymentOrder }>(`/ots/${code}/transmettre-budget`);
    return response.data;
  },
  
  validateAndTransmit: async (codes: string[]) => {
    const response = await apiClient.post<Array<{ code: string; success: boolean; message?: string; downloadUrl?: string }>>('/orders/validate-and-transmit', { codes });
    return response.data;
  },
};
