import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import {
  leadRequestSchema,
  toApiPayload,
  type LeadCreateApiResponse,
  type LeadSubmitErrorCode,
  type LeadSubmitResponse,
} from "@/lib/lead/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Map DRF field-error codes (or first message of a field) to our normalized
 * error vocabulary. The form renders i18n strings keyed by these codes.
 */
function classifyDjangoError(err: ApiError): LeadSubmitErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) {
    if (err.code === "email_unverified" || err.code === "EMAIL_NOT_VERIFIED") {
      return "email_unverified";
    }
    return "forbidden";
  }
  if (err.status === 400) {
    const code = err.code?.toLowerCase?.() ?? "";
    if (code.includes("phone_velocity")) return "phone_velocity";
    if (code.includes("kvkk")) return "kvkk_required";
    if (code.includes("phone")) return "phone_invalid";
    if (code.includes("target_teacher")) return "invalid_target_teacher";
    // Walk the detail object to spot specific codes
    const detail = err.detail;
    if (detail && typeof detail === "object") {
      const flat = JSON.stringify(detail).toLowerCase();
      if (flat.includes("phone_velocity")) return "phone_velocity";
      if (flat.includes("kvkk")) return "kvkk_required";
      if (flat.includes("phone")) return "phone_invalid";
      if (flat.includes("target_teacher")) return "invalid_target_teacher";
      if (flat.includes("slug")) return "invalid_slug";
    }
    return "validation_failed";
  }
  return "upstream_error";
}

function fieldErrorsFromApi(err: ApiError): Record<string, string[]> | undefined {
  const flat = err.fieldErrors();
  if (!flat) return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(flat)) out[k] = [v];
  return out;
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "forbidden", message: "invalid_origin" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "forbidden", message: "csrf_failed" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (session.user.role !== "customer") {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "forbidden", message: "role_not_customer" },
      { status: 403 },
    );
  }
  if (!session.user.isEmailVerified) {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "email_unverified" },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "validation_failed", message: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = leadRequestSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "validation_failed", fieldErrors },
      { status: 400 },
    );
  }

  const payload = toApiPayload(parsed.data);

  try {
    const data = await apiClient.post<LeadCreateApiResponse>(
      ENDPOINTS.LEAD_CREATE,
      payload,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<LeadSubmitResponse>(
      { ok: true, lead: data.lead, notifiedCount: data.notified_count ?? 0 },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      const code = classifyDjangoError(error);
      return NextResponse.json<LeadSubmitResponse>(
        {
          ok: false,
          error: code,
          status: error.status,
          fieldErrors: fieldErrorsFromApi(error),
        },
        { status: error.status },
      );
    }
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "network_error" },
      { status: 502 },
    );
  }
}
