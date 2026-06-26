'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}
