import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/leads/inbox — proxies the authenticated teacher's inbox.
 *
 * Read-only, so we skip Origin/CSRF (those gates are state-changing only).
 * Session + role gate is still required so anonymous probes can't reach the
 * backend. Backend already enforces teacher-scope by token, this is the BFF
 * pre-condition.
 */
export async function GET() {
  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const data = await apiClient.get(ENDPOINTS.LEAD_TEACHER_INBOX, {
      accessToken: session.djangoAccess,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.code, detail: error.detail },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
