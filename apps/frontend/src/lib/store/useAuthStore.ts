import { create } from 'zustand';
import type { LoginResponse, UserProfile } from '@/types/auth.types';

const USER_KEY = 'pt_user';

type AuthState = {
  user: UserProfile | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => void;
  setSession: (session: LoginResponse) => void;
  setUser: (user: UserProfile | null) => void;
  clearSession: () => Promise<void>;
};

const safeParseUser = (raw: string | null): UserProfile | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  isAuthenticated: false,

  hydrate: () => {
    if (typeof window === 'undefined' || get().hydrated) {
      set({ hydrated: true });
      return;
    }

    const user = safeParseUser(window.localStorage.getItem(USER_KEY));

    set({
      user,
      hydrated: true,
      isAuthenticated: Boolean(user),
    });
  },

  setSession: ({ user }) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    set({ user, hydrated: true, isAuthenticated: true });
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_KEY);
      }
    }
    set({ user, isAuthenticated: Boolean(user) });
  },

  clearSession: async () => {
    // Call the gateway logout endpoint to clear HttpOnly cookies
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_GATEWAY ?? 'http://localhost:4000/api';
      await fetch(`${baseURL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort: clear local state even if logout call fails
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(USER_KEY);
    }

    set({
      user: null,
      hydrated: true,
      isAuthenticated: false,
    });
  },
}));

export const authStorageKeys = {
  user: USER_KEY,
};
