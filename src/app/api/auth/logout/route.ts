import { NextResponse } from "next/server";

import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/auth/server";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Best-effort logout:
 *   1. Read the session cookie directly (do not auto-refresh — we're tearing down).
 *   2. Tell Django to blacklist the refresh token (ignore failures).
 *   3. Clear the encrypted cookie locally.
 *
 * Even if upstream fails, the local cookie is gone so the user is signed out.
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await decryptSession(raw) : null;

  if (session) {
    try {
      await apiClient.post(
        ENDPOINTS.AUTH_LOGOUT,
        { refresh: session.djangoRefresh },
        { accessToken: session.djangoAccess },
      );
    } catch {
      // Token may already be blacklisted/expired — proceed to clear cookie.
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
