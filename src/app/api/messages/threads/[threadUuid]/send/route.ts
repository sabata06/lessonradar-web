import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  MessageRow,
  ModerationFlag,
  SendMessageErrorCode,
  SendMessageResponse,
} from "@/lib/messages/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_CHARS = 4000;
const MODERATION_FLAGS: ReadonlyArray<ModerationFlag> = [
  "phone",
  "iban",
  "email",
];

function classifySendError(err: ApiError): SendMessageErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 404) return "not_found";
  if (err.status === 429) return "throttle_message_send";
  if (err.status === 400) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("moderation_warning")) return "moderation_warning";
    if (code.includes("empty_body")) return "empty_body";
    if (code.includes("body_too_long")) return "body_too_long";
    if (code.includes("thread_closed")) return "thread_closed";
    if (code.includes("lead_cancelled")) return "lead_cancelled";
    return "validation_failed";
  }
  return "upstream_error";
}

interface UpstreamSendOk {
  message: MessageRow;
  thread_updated_at: string;
}

/**
 * POST /api/messages/threads/[threadUuid]/send — moderation flow:
 *   - First attempt without `acknowledge_warnings`: backend may return 400
 *     with `moderation_warning` + `moderation_warning_flags`.
 *   - Client shows confirm dialog, re-sends with `acknowledge_warnings=true`.
 *   - Server then saves the message and returns 201.
 *
 * The BFF passes through both the warning payload and the eventual 201
 * verbatim so the client doesn't need a different vocabulary.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadUuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json<SendMessageResponse>(
      { ok: false, error: "forbidden", message: "invalid_origin" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<SendMessageResponse>(
      { ok: false, error: "forbidden", message: "csrf_failed" },
      { status: 403 },
    );
  }

  const { threadUuid } = await params;
  if (!UUID_RE.test(threadUuid)) {
    return NextResponse.json<SendMessageResponse>(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<SendMessageResponse>(
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
    return NextResponse.json<SendMessageResponse>(
      { ok: false, error: "forbidden", message: "role_not_participant" },
      { status: 403 },
    );
  }

  let parsed: { body: string; acknowledge_warnings?: boolean };
  try {
    const json = (await req.json()) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new Error("not_object");
    }
    const rawBody = (json as { body?: unknown }).body;
    if (typeof rawBody !== "string") {
      return NextResponse.json<SendMessageResponse>(
        { ok: false, error: "validation_failed", message: "body_required" },
        { status: 400 },
      );
    }
    const trimmed = rawBody.trim();
    if (trimmed.length === 0) {
      return NextResponse.json<SendMessageResponse>(
        { ok: false, error: "empty_body" },
        { status: 400 },
      );
    }
    if (rawBody.length > MAX_BODY_CHARS) {
      return NextResponse.json<SendMessageResponse>(
        { ok: false, error: "body_too_long" },
        { status: 400 },
      );
    }
    const rawAck = (json as { acknowledge_warnings?: unknown })
      .acknowledge_warnings;
    parsed = {
      body: rawBody,
      acknowledge_warnings:
        typeof rawAck === "boolean" ? rawAck : undefined,
    };
  } catch {
    return NextResponse.json<SendMessageResponse>(
      { ok: false, error: "validation_failed", message: "invalid_json" },
      { status: 400 },
    );
  }

  try {
    const data = await apiClient.post<UpstreamSendOk>(
      ENDPOINTS.MESSAGES_SEND(threadUuid),
      parsed,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<SendMessageResponse>(
      {
        ok: true,
        message: data.message,
        thread_updated_at: data.thread_updated_at,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      const code = classifySendError(error);
      // Moderation warning needs the flag list + warning copy preserved so the
      // client can build the confirm dialog without a second round-trip.
      if (code === "moderation_warning") {
        const detail =
          error.detail && typeof error.detail === "object" ? error.detail : {};
        const rawFlags = (detail as { moderation_warning_flags?: unknown })
          .moderation_warning_flags;
        const flags = Array.isArray(rawFlags)
          ? rawFlags.filter((f): f is ModerationFlag =>
              MODERATION_FLAGS.includes(f as ModerationFlag),
            )
          : [];
        const warning =
          typeof (detail as { warning_message?: unknown }).warning_message ===
          "string"
            ? ((detail as { warning_message: string }).warning_message)
            : undefined;
        return NextResponse.json<SendMessageResponse>(
          {
            ok: false,
            error: "moderation_warning",
            status: 400,
            moderation_warning_flags: flags,
            warning_message: warning,
          },
          { status: 400 },
        );
      }
      return NextResponse.json<SendMessageResponse>(
        { ok: false, error: code, status: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json<SendMessageResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
