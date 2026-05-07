"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SafeUser, UserRole } from "./server";

/**
 * Client-side auth state. Holds **only** the public user snapshot — never JWTs.
 *
 * Server components hydrate the initial value from `getSession()`. Mutations
 * (login/logout) call the BFF route handlers; on success they update the
 * client state to keep RSC and CSR views in sync without a hard reload.
 */

interface AuthContextValue {
  user: SafeUser | null;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  /** Replace the cached user (e.g. after login or profile edit). */
  setUser: (user: SafeUser | null) => void;
  /** POST /api/auth/login. Resolves with the new user on success, throws otherwise. */
  login: (input: LoginInput) => Promise<SafeUser>;
  /** POST /api/auth/logout. Always clears local state. */
  logout: () => Promise<void>;
  /** GET /api/auth/me. Useful to re-sync after long idle. */
  refresh: () => Promise<SafeUser | null>;
}

interface LoginInput {
  email: string;
  password: string;
  turnstileToken?: string;
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(`auth error: ${code}`);
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  initialUser: SafeUser | null;
  children: ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  const [user, setUser] = useState<SafeUser | null>(initialUser);

  const login = useCallback(async (input: LoginInput): Promise<SafeUser> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        turnstile_token: input.turnstileToken,
      }),
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => null)) as
      | { user?: SafeUser; error?: string }
      | null;
    if (!res.ok || !data?.user) {
      throw new AuthError(data?.error ?? "unknown_error", res.status);
    }
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      // CSRF token comes from the lr_csrf cookie (readable JS).
      const csrf = readCsrfCookie();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: csrf ? { "x-csrf-token": csrf } : undefined,
        credentials: "same-origin",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async (): Promise<SafeUser | null> => {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      setUser(null);
      return null;
    }
    const data = (await res.json().catch(() => null)) as
      | { user: SafeUser | null }
      | null;
    setUser(data?.user ?? null);
    return data?.user ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      hasRole: (role) => user?.role === role,
      setUser,
      login,
      logout,
      refresh,
    }),
    [user, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
