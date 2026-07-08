import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { apiClient } from '@/lib/api/client';

export function useRealtimeNotifications() {
  const user = useAuthStore((state) => state.user);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);

  useEffect(() => {
    if (!user || !sessionChecked) return;

    const hasBudgetAccess =
      (user.perms && user.perms['ANALYSE'] >= 1) ||
      (user.perms && user.perms['OT'] >= 3) ||
      ['Agent Budget', 'BUDGET', 'Administrateur', 'ADMIN'].includes(user.role?.code);

    if (!hasBudgetAccess) return;

    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:4000/api';
    const sseUrl = `${gatewayUrl}/analyse/stream`;

    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_SYNTHESIS') {
          toast.push(
            <Notification title="📢 Nouvelle synthèse" type="info" duration={7000}>
              {data.message || `Nouvelle synthèse ${data.reference} disponible pour validation.`}
            </Notification>,
            {
              placement: 'top-end',
            }
          );
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      // Trigger a silent token refresh via Axios interceptor if cookie is expired
      apiClient.get('/account/profile').catch(() => {});
    };

    return () => {
      eventSource.close();
    };
  }, [user]);
}
