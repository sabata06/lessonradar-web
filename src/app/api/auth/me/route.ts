import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession, setSessionCookie } from "@/lib/auth/cookies";
import { safeUserFromProfile } from "@/lib/auth/server";
import { getCsrfToken } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the authenticated user (sanitized — no JWTs).
 * 200 with {user} when authenticated, 401 otherwise.
 *
 * Cookie envelope is just a cache of the user snapshot at login time —
 * admin actions on Django (approve teacher application → role flips
 * customer→teacher, account suspension, locale change) don't reach
 * back here on their own. So `/me` always re-fetches `/api/auth/profile/`
 * with the current access token, rebuilds SafeUser, and rotates the
 * session cookie iff something material changed. One extra Django
 * roundtrip per page hydration is a fair price for "approvals show up
 * immediately" without forcing a logout/login.
 *
 * If Django is unreachable we fall through to the cached SafeUser so a
 * blip doesn't 401 every authed visitor.
 */
export async function GET() {
  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  let nextUser = session.user;
  try {
    const fresh = await apiClient.get<Record<string, unknown>>(
      ENDPOINTS.AUTH_PROFILE,
      { accessToken: session.djangoAccess },
    );
    const rebuilt = safeUserFromProfile(fresh);
    if (JSON.stringify(rebuilt) !== JSON.stringify(session.user)) {
      await setSessionCookie({ ...session, user: rebuilt });
      nextUser = rebuilt;
    }
  } catch (error) {
    // Auth-related failures (token rejected by Django) should still 401
    // the caller — falling back to stale cache there would mask an
    // actually-revoked session. Everything else is treated as a blip.
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
  }

  await getCsrfToken();
  return NextResponse.json({ user: nextUser });
}
