import "server-only";

import { cookies } from "next/headers";

import {
  decryptSession,
  encryptSession,
  isAccessExpired,
  refreshAccessToken,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "./server";

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
 * Read the session and auto-refresh the Django access token if expired.
 *
 * Safe to call from RSCs, server actions, and route handlers. Returns `null`
 * when the user is not authenticated or the session is unrecoverable; in the
 * latter case the cookie is cleared.
 *
 * Cost: a single `cookies()` read; one fetch + one cookie write only when the
 * access token is within `ACCESS_REFRESH_LEEWAY_SEC` of expiry.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const session = await decryptSession(raw);
  if (!session) {
    await clearSessionCookie();
    return null;
  }

  if (!isAccessExpired(session)) return session;

  const next = await refreshAccessToken(session);
  if (!next) {
    await clearSessionCookie();
    return null;
  }
  await setSessionCookie(next);
  return next;
}

/** Convenience accessor — returns just the access token, refreshing if needed. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.djangoAccess ?? null;
}
