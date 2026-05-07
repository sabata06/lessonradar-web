import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manually trigger an access-token refresh.
 *
 * `getSession()` already refreshes lazily on every read; this endpoint exists
 * for cases where the client wants to force a rotation (e.g. after a
 * permission-sensitive action) without reloading the page.
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ user: session.user });
}
