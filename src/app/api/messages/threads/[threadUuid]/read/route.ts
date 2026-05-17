import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  MarkReadErrorCode,
  MarkReadResponse,
  ThreadReadReceipts,
} from "@/lib/messages/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function classifyReadError(err: ApiError): MarkReadErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 404) return "not_found";
  return "upstream_error";
}

/**
 * POST /api/messages/threads/[threadUuid]/read — empty body. Updates the
 * requesting user's last_read_at on the thread to now(). Idempotent.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadUuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json<MarkReadResponse>(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<MarkReadResponse>(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const { threadUuid } = await params;
  if (!UUID_RE.test(threadUuid)) {
    return NextResponse.json<MarkReadResponse>(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<MarkReadResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  // B7+B8 — teacher participation matches customer participation.
  if (
    session.user.role !== "customer" &&
    session.user.role !== "teacher" &&
    session.user.role !== "admin"
  ) {
    return NextResponse.json<MarkReadResponse>(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  try {
    const data = await apiClient.post<ThreadReadReceipts>(
      ENDPOINTS.MESSAGES_READ(threadUuid),
      {},
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<MarkReadResponse>(
      { ok: true, receipts: data },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<MarkReadResponse>(
        { ok: false, error: classifyReadError(error), status: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json<MarkReadResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
