import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/cookies";
import { getCsrfToken } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the authenticated user (sanitized — no JWTs).
 * 200 with {user} when authenticated, 401 otherwise.
 *
 * `getSession()` lazily rotates the Django access token if needed. We also
 * mint/refresh the double-submit CSRF token here so any tab that hydrates
 * via `/api/auth/me` is immediately ready to call logout/refresh.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  await getCsrfToken();
  return NextResponse.json({ user: session.user });
}
