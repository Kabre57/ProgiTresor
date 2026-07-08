'use client';

import { useEffect, useRef, useState } from 'react';
import { authApi } from '@/lib/api/authApi';
import { applyPermissionPayload, decodeJwtPermissions } from '@/lib/auth/permissionPayload';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRealtimeNotifications } from '@/utils/hooks/useRealtimeNotifications';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useRealtimeNotifications();

  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setSessionChecked = useAuthStore((state) => state.setSessionChecked);
  const clearSession = useAuthStore((state) => state.clearSession);
  const syncedUserId = useRef<number | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      syncedUserId.current = null;
      setSessionChecked(true);
      setCheckingSession(false);
      return;
    }

    if (sessionChecked && syncedUserId.current === user.id) {
      setCheckingSession(false);
      return;
    }

    syncedUserId.current = user.id;
    setSessionChecked(false);
    setCheckingSession(true);
    let active = true;

    authApi
      .refreshAccessToken()
      .then(({ accessToken }) => {
        if (!active) return;
        setUser(applyPermissionPayload(user, decodeJwtPermissions(accessToken)));
      })
      .catch(async () => {
        if (!active) return;
        await clearSession();
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, [clearSession, hydrated, sessionChecked, setSessionChecked, setUser, user]);

  if (!hydrated || !sessionChecked || checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-slate-500">
        Initialisation de la session...
      </div>
    );
  }

  return children;
}
