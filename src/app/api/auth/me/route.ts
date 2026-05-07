import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the authenticated user (sanitized — no JWTs).
 * 200 with {user} when authenticated, 401 otherwise.
 *
 * `getSession()` lazily rotates the Django access token if needed.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: session.user });
}
