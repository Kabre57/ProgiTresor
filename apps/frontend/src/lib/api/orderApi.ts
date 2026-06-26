import { apiClient } from '@/lib/api/client';
import type { PaymentOrder } from '@/types/order.types';

export const orderApi = {
  list: async () => {
    const response = await apiClient.get<PaymentOrder[]>('/orders');
    return response.data;
  },

  generate: async () => {
    const response = await apiClient.post<{ message: string; generated_ops_count?: number }>('/orders/generate');
    return response.data;
  },

  updateStatus: async (code: string, payload: { statut: string; motif?: string }) => {
    const response = await apiClient.put<PaymentOrder>(`/orders/${code}/status`, payload);
    return response.data;
  },
};
