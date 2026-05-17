import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/messages/threads/[threadUuid] — proxy to
 * `GET /api/messages/threads/<uuid>/` with optional `after` + `limit` query
 * params for polling. Backend enforces participant-only access.
 *
 * No CSRF (read-only). Session + role gate still required so anonymous
 * crawlers can't probe thread existence.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadUuid: string }> },
) {
  const { threadUuid } = await params;
  if (!UUID_RE.test(threadUuid)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // B7+B8 — teacher participation matches customer participation. Backend
  // enforces actual participant-on-thread access; this gate is just the
  // role-class precondition.
  if (
    session.user.role !== "customer" &&
    session.user.role !== "teacher" &&
    session.user.role !== "admin"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const limit = url.searchParams.get("limit");

  // Strict allowlist on what we forward — drops cache-buster query params
  // before they reach Django and keeps the upstream URL clean.
  const upstreamQs: string[] = [];
  if (after && UUID_RE.test(after)) {
    upstreamQs.push(`after=${encodeURIComponent(after)}`);
  }
  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0 && n <= 200) {
      upstreamQs.push(`limit=${Math.floor(n)}`);
    }
  }
  const upstreamPath = `${ENDPOINTS.MESSAGES_THREAD(threadUuid)}${
    upstreamQs.length > 0 ? `?${upstreamQs.join("&")}` : ""
  }`;

  try {
    const data = await apiClient.get(upstreamPath, {
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
