"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { SafeUser, UserRole } from "./server";

/**
 * Client-side auth state. Holds **only** the public user snapshot — never JWTs.
 *
 * Hydration model: layout intentionally does NOT call `cookies()`. AuthProvider
 * fires `GET /api/auth/me` on mount to learn whether the visitor is signed in.
 *
 * Why not server-stream the session via cookies() promise + Suspense?
 * Tried 2026-05-08: layout-level cookies() (even unawaited) flips every
 * descendant route into dynamic rendering and breaks pSEO SSG. Next 16's
 * `cacheComponents: true` (PPR) would fix it but conflicts with our route
 * handler segment configs (`runtime`, `dynamic`) and demands a full caching
 * migration — deferred to its own phase. The 50ms `/api/auth/me` round-trip
 * trade-off is the cheapest way to keep static prerendering for SEO crawlers.
 */

interface AuthContextValue {
  user: SafeUser | null;
  /** True after the initial /api/auth/me hydration completes (success or 401). */
  isHydrated: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  /** Replace the cached user (e.g. after profile edit). */
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
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Mount-time self-hydration from the BFF. Single fetch per session lifetime;
  // mutations (login/logout) update state directly without re-fetching.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    fetch("/api/auth/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setIsHydrated(true);
          return;
        }
        const data = (await res.json().catch(() => null)) as
          | { user: SafeUser | null }
          | null;
        setUser(data?.user ?? null);
        setIsHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setIsHydrated(true);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const csrf = readCsrfCookie();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: csrf ? { "x-csrf-token": csrf } : undefined,
        credentials: "same-origin",
      });
    } finally {
      setUser(null);
      setIsHydrated(true);
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
      setIsHydrated(true);
      return null;
    }
    const data = (await res.json().catch(() => null)) as
      | { user: SafeUser | null }
      | null;
    setUser(data?.user ?? null);
    setIsHydrated(true);
    return data?.user ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isHydrated,
      isAuthenticated: user !== null,
      hasRole: (role) => user?.role === role,
      setUser,
      login,
      logout,
      refresh,
    }),
    [user, isHydrated, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
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
