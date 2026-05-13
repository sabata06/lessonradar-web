import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  CancelLeadErrorCode,
  CancelLeadResponse,
  LeadDetail,
} from "@/lib/lead/customer-lead-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REASON_CHARS = 280;

/**
 * Pick the most specific code from a DRF 400 payload. Backend currently emits
 * either a top-level `code` string or `{detail: "..."}` for non-cancellable
 * leads (converted/closed/spam). Anything else collapses to `validation_failed`.
 */
function classifyCancelError(err: ApiError): CancelLeadErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 404) return "not_found";
  if (err.status === 400) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("not_cancellable") || code.includes("cancel")) {
      return "not_cancellable";
    }
    const flat =
      err.detail && typeof err.detail === "object"
        ? JSON.stringify(err.detail).toLowerCase()
        : "";
    if (
      flat.includes("not_cancellable") ||
      flat.includes("cannot be cancelled") ||
      flat.includes("iptal") // TR detail string from backend
    ) {
      return "not_cancellable";
    }
    return "validation_failed";
  }
  return "upstream_error";
}

/**
 * POST /api/leads/[uuid]/cancel — customer cancels their own lead.
 *
 * Security gates (in order so the cheapest fail-fasts fire first):
 *   1. Strict Origin allowlist via `validateOrigin`.
 *   2. Double-submit CSRF (`x-csrf-token` header == `lr_csrf` cookie).
 *   3. UUID shape — reject obvious garbage before hitting Django.
 *   4. Encrypted session + role gate (customer or admin).
 *   5. JSON body parse with a sanity cap on `reason`.
 *
 * Idempotency: calling cancel on an already-cancelled lead returns 200 with
 * the unchanged-status detail — backend handles it. We just forward the body.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json<CancelLeadResponse>(
      { ok: false, error: "forbidden", message: "invalid_origin" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<CancelLeadResponse>(
      { ok: false, error: "forbidden", message: "csrf_failed" },
      { status: 403 },
    );
  }

  const { uuid } = await params;
  if (!UUID_RE.test(uuid)) {
    return NextResponse.json<CancelLeadResponse>(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<CancelLeadResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (session.user.role !== "customer" && session.user.role !== "admin") {
    return NextResponse.json<CancelLeadResponse>(
      { ok: false, error: "forbidden", message: "role_not_customer" },
      { status: 403 },
    );
  }

  let parsed: { reason?: string } = {};
  // Empty body is valid (reason is optional). Anything malformed → 400.
  const text = await req.text().catch(() => "");
  if (text.trim().length > 0) {
    try {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === "object" && !Array.isArray(body)) {
        const rawReason = (body as { reason?: unknown }).reason;
        if (rawReason !== undefined) {
          if (typeof rawReason !== "string") {
            return NextResponse.json<CancelLeadResponse>(
              { ok: false, error: "validation_failed", message: "invalid_reason" },
              { status: 400 },
            );
          }
          const trimmed = rawReason.trim();
          if (trimmed.length > MAX_REASON_CHARS) {
            return NextResponse.json<CancelLeadResponse>(
              { ok: false, error: "validation_failed", message: "reason_too_long" },
              { status: 400 },
            );
          }
          parsed = { reason: trimmed || undefined };
        }
      }
    } catch {
      return NextResponse.json<CancelLeadResponse>(
        { ok: false, error: "validation_failed", message: "invalid_json" },
        { status: 400 },
      );
    }
  }

  try {
    const data = await apiClient.post<LeadDetail>(
      ENDPOINTS.LEAD_CUSTOMER_CANCEL(uuid),
      parsed,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<CancelLeadResponse>(
      { ok: true, lead: data },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<CancelLeadResponse>(
        { ok: false, error: classifyCancelError(error), status: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json<CancelLeadResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
