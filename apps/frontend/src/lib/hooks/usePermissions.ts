import { useCallback } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { hasPermissionAccess } from '@/lib/auth/permissionPayload';

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);
  const perms = user?.perms ?? {};
  const denies = user?.denies ?? [];

  const hasAccess = useCallback(
    (perimeter: string, requiredLevel: number, action = 'ACCESS') =>
      hasPermissionAccess(perms, denies, perimeter, requiredLevel, action),
    [denies, perms],
  );

  return {
    perms,
    denies,
    hasAccess,
  };
};
