import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  RespondErrorCode,
  RespondResponse,
  TeacherLeadRow,
} from "@/lib/teacher-leads/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_MESSAGE_CHARS = 4000;

/**
 * Map a backend ApiError to our normalized teacher-respond error vocabulary.
 * Mirrors `classifyDjangoError` from `/api/leads/route.ts` — checks `err.code`
 * first, then the serialized detail object, then falls back to a generic code.
 */
function classifyRespondError(err: ApiError): RespondErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) {
    if (err.code === "email_unverified" || err.code === "EMAIL_NOT_VERIFIED") {
      return "email_unverified";
    }
    return "forbidden";
  }
  if (err.status === 404) return "not_found";
  if (err.status === 429) return "throttle_respond";
  if (err.status === 400) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("quota")) return "quota_exceeded";
    if (code.includes("already_responded")) return "already_responded";
    if (code.includes("already_declined")) return "already_declined";
    if (code.includes("lead_cancelled")) return "lead_cancelled";
    if (code.includes("lead_completed") || code.includes("closed")) {
      return "lead_completed";
    }
    if (code.includes("lead_expired") || code.includes("expired")) {
      return "lead_expired";
    }
    if (code.includes("not_visible")) return "not_visible_yet";
    if (code.includes("recipient_inactive") || code.includes("inactive")) {
      return "recipient_inactive";
    }
    if (code.includes("empty")) return "empty_body";
    if (code.includes("too_long")) return "body_too_long";

    const flat =
      err.detail && typeof err.detail === "object"
        ? JSON.stringify(err.detail).toLowerCase()
        : "";
    if (flat.includes("quota")) return "quota_exceeded";
    if (flat.includes("already_responded")) return "already_responded";
    if (flat.includes("already_declined")) return "already_declined";
    if (flat.includes("lead_cancelled")) return "lead_cancelled";
    if (flat.includes("lead_completed") || flat.includes("closed")) {
      return "lead_completed";
    }
    if (flat.includes("expired")) return "lead_expired";
    if (flat.includes("not_visible")) return "not_visible_yet";
    if (flat.includes("inactive")) return "recipient_inactive";

    return "validation_failed";
  }
  return "upstream_error";
}

interface UpstreamRespondPayload extends TeacherLeadRow {
  thread_uuid: string;
}

/**
 * POST /api/teacher/leads/[recipientUuid]/respond
 *
 * Gates (cheapest-fail-first):
 *   1. Origin allowlist
 *   2. Double-submit CSRF
 *   3. UUID v4 regex
 *   4. Encrypted session + role gate (teacher|admin)
 *   5. Body parse + length validation (1..4000 chars trimmed)
 *   6. Forward to LEAD_TEACHER_RESPOND
 *   7. Classify ApiError into RespondErrorCode union
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ recipientUuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "forbidden", message: "invalid_origin" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "forbidden", message: "csrf_failed" },
      { status: 403 },
    );
  }

  const { recipientUuid } = await params;
  if (!UUID_RE.test(recipientUuid)) {
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "forbidden", message: "role_not_teacher" },
      { status: 403 },
    );
  }

  let parsed: { message: string };
  try {
    const json = (await req.json()) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new Error("not_object");
    }
    const rawMessage = (json as { message?: unknown }).message;
    if (typeof rawMessage !== "string") {
      return NextResponse.json<RespondResponse>(
        { ok: false, error: "validation_failed", message: "message_required" },
        { status: 400 },
      );
    }
    const trimmed = rawMessage.trim();
    if (trimmed.length === 0) {
      return NextResponse.json<RespondResponse>(
        { ok: false, error: "empty_body" },
        { status: 400 },
      );
    }
    if (rawMessage.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json<RespondResponse>(
        { ok: false, error: "body_too_long" },
        { status: 400 },
      );
    }
    parsed = { message: rawMessage };
  } catch {
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "validation_failed", message: "invalid_json" },
      { status: 400 },
    );
  }

  try {
    const data = await apiClient.post<UpstreamRespondPayload>(
      ENDPOINTS.LEAD_TEACHER_RESPOND(recipientUuid),
      parsed,
      { accessToken: session.djangoAccess },
    );
    // Backend returns the updated recipient row with `thread_uuid` populated
    // — extract the thread uuid and forward the full row for caller state sync.
    if (!data.thread_uuid) {
      return NextResponse.json<RespondResponse>(
        {
          ok: false,
          error: "upstream_error",
          message: "missing_thread_uuid",
        },
        { status: 502 },
      );
    }
    const { thread_uuid: threadUuid, ...recipient } = data;
    return NextResponse.json<RespondResponse>(
      {
        ok: true,
        thread_uuid: threadUuid,
        recipient: { ...(recipient as TeacherLeadRow), thread_uuid: threadUuid },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      const code = classifyRespondError(error);
      return NextResponse.json<RespondResponse>(
        { ok: false, error: code, status: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json<RespondResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
