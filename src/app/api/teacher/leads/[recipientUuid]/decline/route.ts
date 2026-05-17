import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  DeclineErrorCode,
  DeclineResponse,
  TeacherLeadRow,
} from "@/lib/teacher-leads/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_REASON_CHARS = 280;

function classifyDeclineError(err: ApiError): DeclineErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 404) return "not_found";
  if (err.status === 400) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("already_declined")) return "already_declined";
    if (code.includes("already_responded")) return "already_responded";
    if (code.includes("lead_cancelled")) return "lead_cancelled";
    if (code.includes("lead_completed") || code.includes("closed")) {
      return "lead_completed";
    }
    if (code.includes("expired")) return "lead_expired";
    if (code.includes("inactive")) return "recipient_inactive";

    const flat =
      err.detail && typeof err.detail === "object"
        ? JSON.stringify(err.detail).toLowerCase()
        : "";
    if (flat.includes("already_declined")) return "already_declined";
    if (flat.includes("already_responded")) return "already_responded";
    if (flat.includes("lead_cancelled")) return "lead_cancelled";
    if (flat.includes("closed")) return "lead_completed";
    if (flat.includes("expired")) return "lead_expired";
    if (flat.includes("inactive")) return "recipient_inactive";

    return "validation_failed";
  }
  return "upstream_error";
}

/**
 * POST /api/teacher/leads/[recipientUuid]/decline
 *
 * Same gate stack as respond. Body: `{ reason?: string }` (optional, 280-char
 * cap). Backend is idempotent on repeat-decline so we forward the body raw
 * and let backend handle the no-op case.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ recipientUuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json<DeclineResponse>(
      { ok: false, error: "forbidden", message: "invalid_origin" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<DeclineResponse>(
      { ok: false, error: "forbidden", message: "csrf_failed" },
      { status: 403 },
    );
  }

  const { recipientUuid } = await params;
  if (!UUID_RE.test(recipientUuid)) {
    return NextResponse.json<DeclineResponse>(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<DeclineResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return NextResponse.json<DeclineResponse>(
      { ok: false, error: "forbidden", message: "role_not_teacher" },
      { status: 403 },
    );
  }

  // Empty body is valid (reason optional). Anything malformed → 400.
  let parsed: { reason?: string } = {};
  const text = await req.text().catch(() => "");
  if (text.trim().length > 0) {
    try {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === "object" && !Array.isArray(body)) {
        const rawReason = (body as { reason?: unknown }).reason;
        if (rawReason !== undefined) {
          if (typeof rawReason !== "string") {
            return NextResponse.json<DeclineResponse>(
              {
                ok: false,
                error: "validation_failed",
                message: "invalid_reason",
              },
              { status: 400 },
            );
          }
          const trimmed = rawReason.trim();
          if (trimmed.length > MAX_REASON_CHARS) {
            return NextResponse.json<DeclineResponse>(
              {
                ok: false,
                error: "validation_failed",
                message: "reason_too_long",
              },
              { status: 400 },
            );
          }
          parsed = { reason: trimmed || undefined };
        }
      }
    } catch {
      return NextResponse.json<DeclineResponse>(
        { ok: false, error: "validation_failed", message: "invalid_json" },
        { status: 400 },
      );
    }
  }

  try {
    const data = await apiClient.post<TeacherLeadRow>(
      ENDPOINTS.LEAD_TEACHER_DECLINE(recipientUuid),
      parsed,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<DeclineResponse>(
      { ok: true, recipient: data },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<DeclineResponse>(
        { ok: false, error: classifyDeclineError(error), status: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json<DeclineResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
