import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  ConnectLeadErrorCode,
  ConnectLeadResponse,
  LeadOfferConnection,
} from "@/lib/lead/customer-lead-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UUID v4 shape — strict enough to reject garbage before hitting Django.
 * Backend re-validates ownership + recipient<>lead linkage.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function classifyConnectError(err: ApiError): ConnectLeadErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("contact_preference_blocks_reveal")) {
      return "contact_preference_blocks_reveal";
    }
    return "forbidden";
  }
  if (err.status === 404) return "not_found";
  if (err.status === 400) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("recipient_not_responded")) return "recipient_not_responded";
    if (code.includes("teacher_inactive")) return "teacher_inactive";
    if (code.includes("lead_cancelled")) return "lead_cancelled";
    if (code.includes("contact_preference_blocks_reveal")) {
      return "contact_preference_blocks_reveal";
    }
    const flat =
      err.detail && typeof err.detail === "object"
        ? JSON.stringify(err.detail).toLowerCase()
        : "";
    if (flat.includes("recipient_not_responded")) return "recipient_not_responded";
    if (flat.includes("teacher_inactive")) return "teacher_inactive";
    if (flat.includes("lead_cancelled")) return "lead_cancelled";
    return "validation_failed";
  }
  return "upstream_error";
}

/**
 * POST /api/leads/[uuid]/offers/[recipientUuid]/connect — customer-driven
 * mutual reveal. Empty body. Idempotent on the Django side: calling twice
 * returns the same connection payload.
 *
 * Security gates: Origin → CSRF → UUID shape → encrypted session + role gate.
 */
export async function POST(
  req: Request,
  {
    params,
  }: { params: Promise<{ uuid: string; recipientUuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json<ConnectLeadResponse>(
      { ok: false, error: "forbidden", message: "invalid_origin" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<ConnectLeadResponse>(
      { ok: false, error: "forbidden", message: "csrf_failed" },
      { status: 403 },
    );
  }

  const { uuid, recipientUuid } = await params;
  if (!UUID_RE.test(uuid) || !UUID_RE.test(recipientUuid)) {
    return NextResponse.json<ConnectLeadResponse>(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<ConnectLeadResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  if (session.user.role !== "customer" && session.user.role !== "admin") {
    return NextResponse.json<ConnectLeadResponse>(
      { ok: false, error: "forbidden", message: "role_not_customer" },
      { status: 403 },
    );
  }

  try {
    const data = await apiClient.post<{ connection: LeadOfferConnection }>(
      ENDPOINTS.LEAD_CUSTOMER_CONNECT(uuid, recipientUuid),
      {},
      { accessToken: session.djangoAccess },
    );
    if (!data.connection || !data.connection.exists) {
      return NextResponse.json<ConnectLeadResponse>(
        { ok: false, error: "upstream_error", message: "missing_connection" },
        { status: 502 },
      );
    }
    return NextResponse.json<ConnectLeadResponse>(
      {
        ok: true,
        connection: data.connection as LeadOfferConnection & { exists: true },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      const code = classifyConnectError(error);
      return NextResponse.json<ConnectLeadResponse>(
        { ok: false, error: code, status: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json<ConnectLeadResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
