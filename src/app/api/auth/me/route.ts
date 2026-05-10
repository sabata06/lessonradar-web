import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/cookies";
import { getCsrfToken } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the authenticated user (sanitized — no JWTs).
 * 200 with {user} when authenticated, 401 otherwise.
 *
 * This Route Handler can safely rotate cookies. Server Components use
 * read-only session access; `/api/auth/me` handles the lazy access-token
 * refresh and also mints/refreshes the double-submit CSRF token so any tab
 * that hydrates here is ready to call logout/refresh.
 */
export async function GET() {
  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  await getCsrfToken();
  return NextResponse.json({ user: session.user });
}
