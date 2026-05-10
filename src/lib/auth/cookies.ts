import "server-only";

import { cookies } from "next/headers";

import {
  decryptSession,
  encryptSession,
  isAccessExpired,
  refreshAccessToken,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  type SafeUser,
  type SessionPayload,
} from "./server";

/** Re-export for callers that prefer the next/headers shape. */
type CookieStore = Awaited<ReturnType<typeof cookies>>;

interface GetSessionOptions {
  /**
   * Refreshing or clearing the cookie requires a Route Handler / Server
   * Action. Server Components must leave this false and only read the
   * encrypted user snapshot.
   */
  refresh?: boolean;
}

const IS_PROD = process.env.NODE_ENV === "production";

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

/** Set or rotate the encrypted session cookie. */
export async function setSessionCookie(
  payload: SessionPayload,
): Promise<void> {
  const value = await encryptSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, value, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

/** Delete the session cookie (logout, refresh failure). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  // Setting maxAge=0 with the same attributes is the most reliable cross-browser clear.
  store.set(SESSION_COOKIE_NAME, "", {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Read the session.
 *
 * Safe to call from RSCs, server actions, and route handlers when used in the
 * default read-only mode. Passing `{ refresh: true }` may modify cookies and
 * must only be used from a Route Handler or Server Action.
 *
 * Cost: a single `cookies()` read; one fetch + one cookie write only in
 * refresh mode when the access token is within `ACCESS_REFRESH_LEEWAY_SEC`.
 */
export async function getSession(
  options: GetSessionOptions = {},
): Promise<SessionPayload | null> {
  const store = await cookies();
  return getSessionFromStore(store, options);
}

/**
 * Variant that consumes an externally-acquired cookie store (or its promise),
 * so the caller can hold the `cookies()` promise without awaiting it inside a
 * layout — keeping the route prerenderable until something downstream actually
 * `use()`s the resulting session promise (Context7: "push dynamic access down").
 */
export async function getSessionFromStore(
  storeOrPromise: CookieStore | Promise<CookieStore>,
  options: GetSessionOptions = {},
): Promise<SessionPayload | null> {
  const store = await storeOrPromise;
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const session = await decryptSession(raw);
  if (!session) {
    if (options.refresh) {
      await clearSessionCookie();
    }
    return null;
  }

  if (!isAccessExpired(session)) return session;

  if (!options.refresh) return session;

  const next = await refreshAccessToken(session);
  if (!next) {
    await clearSessionCookie();
    return null;
  }
  await setSessionCookie(next);
  return next;
}

/**
 * Public-only projection of the session for the client. The full SessionPayload
 * holds Django access/refresh JWTs which must never cross the server boundary.
 */
export async function getSafeUserPromise(
  storeOrPromise: CookieStore | Promise<CookieStore>,
): Promise<SafeUser | null> {
  const session = await getSessionFromStore(storeOrPromise);
  return session?.user ?? null;
}

/** Convenience accessor — returns just the access token, refreshing if needed. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession({ refresh: true });
  return session?.djangoAccess ?? null;
}
