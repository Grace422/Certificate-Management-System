"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, ApiError } from "./api";
import { PublicUser } from "@/types";

interface AuthContextValue {
  user: PublicUser | null;
  accessToken: string | null;
  loading: boolean; // true during the initial silent-refresh attempt on load
  // Multi-step flows keep their challenge token here between page navigations.
  challengeToken: string | null;
  otpauthUrl: string | null;

  register: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  completeMfaSetup: (otp: string) => Promise<PublicUser>;
  login: (email: string, password: string) => Promise<{ requiresSetup: boolean }>;
  verifyMfaLogin: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);

  // On first load, try to exchange the httpOnly refresh cookie (if any) for
  // a new access token, so a page refresh doesn't force a re-login.
  useEffect(() => {
    (async () => {
      try {
        const { accessToken: token } = await apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST" });
        setAccessToken(token);
        const me = await apiFetch<PublicUser>("/auth/me", { accessToken: token });
        setUser(me);
      } catch {
        // No valid session - that's fine, user just sees the logged-out state.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const register = useCallback(async (input: { firstName: string; lastName: string; email: string; password: string }) => {
    const data = await apiFetch<{ challengeToken: string; otpauthUrl: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setChallengeToken(data.challengeToken);
    setOtpauthUrl(data.otpauthUrl);
  }, []);

  const completeMfaSetup = useCallback(async (otp: string) => {
    if (!challengeToken) throw new ApiError(400, "No active registration to verify. Please register again.");
    const data = await apiFetch<{ user: PublicUser; accessToken: string }>("/auth/mfa/setup/verify", {
      method: "POST",
      body: JSON.stringify({ challengeToken, otp })
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    setChallengeToken(null);
    setOtpauthUrl(null);
    return data.user;
  }, [challengeToken]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ requiresSetup: boolean; challengeToken: string; otpauthUrl?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setChallengeToken(data.challengeToken);
    if (data.requiresSetup && data.otpauthUrl) {
      setOtpauthUrl(data.otpauthUrl);
    }
    return { requiresSetup: data.requiresSetup };
  }, []);

  const verifyMfaLogin = useCallback(async (otp: string) => {
    if (!challengeToken) throw new ApiError(400, "No active login attempt. Please log in again.");
    const data = await apiFetch<{ user: PublicUser; accessToken: string }>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ challengeToken, otp })
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    setChallengeToken(null);
  }, [challengeToken]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // Wraps apiFetch with the current access token, and transparently retries
  // ONCE after a silent refresh if the token turned out to be expired -
  // covers the case where the access token dies mid-session (15 min TTL).
  const authFetch = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    try {
      return await apiFetch<T>(path, { ...options, accessToken: accessToken ?? undefined });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const { accessToken: newToken } = await apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST" });
        setAccessToken(newToken);
        return apiFetch<T>(path, { ...options, accessToken: newToken });
      }
      throw err;
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{
      user, accessToken, loading, challengeToken, otpauthUrl,
      register, completeMfaSetup, login, verifyMfaLogin, logout, authFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
