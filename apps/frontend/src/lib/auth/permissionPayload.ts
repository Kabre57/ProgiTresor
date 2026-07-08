import type { UserProfile } from '@/types/auth.types';

type JwtPermissionPayload = {
  perms?: Record<string, number>;
  denies?: string[];
  token_version?: number;
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
};

export const decodeJwtPermissions = (token: string): JwtPermissionPayload | null => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as JwtPermissionPayload;
  } catch {
    return null;
  }
};

export const applyPermissionPayload = (
  user: UserProfile,
  payload: JwtPermissionPayload | null,
): UserProfile => ({
  ...user,
  perms: payload?.perms ?? user.perms ?? {},
  denies: payload?.denies ?? user.denies ?? [],
  tokenVersion: payload?.token_version ?? user.tokenVersion,
});

export const hasPermissionAccess = (
  perms: Record<string, number> | undefined,
  denies: string[] | undefined,
  perimeter: string,
  requiredLevel: number,
  action = 'ACCESS',
) => {
  if ((denies ?? []).includes(`${perimeter}:${action}`)) {
    return false;
  }
  return (perms?.[perimeter] ?? 0) >= requiredLevel;
};
