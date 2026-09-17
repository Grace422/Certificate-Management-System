'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { authService } from '@/lib/api/auth.service';
import { setUnauthenticatedHandler, tokenStore } from '@/lib/api/client';
import type { LoginResult, User, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeMfa: (mfaToken: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'AGENT'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  /**
   * The session lives in SWR rather than useState: it is server state, so it
   * gets caching and deduplication for free, and there is no effect syncing a
   * fetch result into local state.
   *
   * A 401 here simply means "not signed in" — it is an expected outcome,
   * not an error to surface or retry.
   */
  const { data, isLoading, mutate } = useSWR<User | null>('auth:me', () => authService.me(), {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    onError: () => {
      /* not authenticated — handled by `user === null` below */
    },
  });

  const user = data ?? null;

  /** Replace the cached session without re-fetching. */
  const setUser = useCallback(
    (u: User | null) => {
      void mutate(u, { revalidate: false });
    },
    [mutate],
  );

  const refreshUser = useCallback(async () => {
    await mutate();
  }, [mutate]);

  /** Fires when the axios interceptor fails to refresh an expired token. */
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      tokenStore.clear();
      void mutate(null, { revalidate: false });
      router.replace('/login?reason=expired');
    });
    return () => setUnauthenticatedHandler(null);
  }, [router, mutate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authService.login(email, password);
      if (!result.mfaRequired && result.user) setUser(result.user);
      return result;
    },
    [setUser],
  );

  const completeMfa = useCallback(
    async (mfaToken: string, code: string) => {
      const session = await authService.verifyMfa(mfaToken, code);
      setUser(session.user);
      return session.user;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.replace('/login');
  }, [router, setUser]);

  const value = useMemo(
    () => ({
      user,
      loading: isLoading,
      isAdmin: !!user && ADMIN_ROLES.includes(user.role),
      login,
      completeMfa,
      logout,
      refreshUser,
      setUser,
    }),
    [user, isLoading, login, completeMfa, logout, refreshUser, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
