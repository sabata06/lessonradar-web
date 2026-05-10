import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { validateOrigin } from "@/lib/security/origin";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegisterRequestBody {
  email?: string;
  password?: string;
  password_confirm?: string;
  first_name?: string;
  last_name?: string;
  consent_kvkk?: boolean;
  consent_privacy?: boolean;
  consent_terms?: boolean;
  turnstile_token?: string;
}

interface DjangoRegisterResponse {
  success: true;
  success_code: "REGISTRATION_CREATED";
  email: string;
  email_sent: boolean;
}

/**
 * Register BFF (B2 pass-2).
 *
 * Forwards email/password + consents to Django, hard-codes `role: "customer"`
 * (web is student/parent-first; teachers onboard via /ogretmen-ol — see
 * decision log). Backend issues a 6-digit verification code and the user
 * confirms via /eposta-dogrula.
 *
 * Account-enumeration: when Django returns `EMAIL_ALREADY_REGISTERED` we DO
 * pass that code through, because the register UX (and email itself) makes the
 * "this email is registered" leak unavoidable. We minimize damage by surfacing
 * a CTA "Try signing in instead" rather than enabling automated harvesting.
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: RegisterRequestBody;
  try {
    body = (await req.json()) as RegisterRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!(await verifyTurnstile(body.turnstile_token, req))) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
  }

  const required: Array<[unknown, string]> = [
    [body.email, "email"],
    [body.password, "password"],
    [body.password_confirm, "password_confirm"],
    [body.first_name, "first_name"],
    [body.last_name, "last_name"],
  ];
  for (const [value, _field] of required) {
    if (typeof value !== "string" || value.trim() === "") {
      return NextResponse.json(
        { error: "validation_error", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
  }
  if (
    body.consent_kvkk !== true ||
    body.consent_privacy !== true ||
    body.consent_terms !== true
  ) {
    return NextResponse.json(
      { error: "validation_error", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const data = await apiClient.post<DjangoRegisterResponse>(
      ENDPOINTS.AUTH_REGISTER,
      {
        email: body.email,
        password: body.password,
        password_confirm: body.password_confirm,
        first_name: body.first_name,
        last_name: body.last_name,
        role: "customer", // Hard-coded — web register is student/parent-first
        accept_kvkk_disclosure: body.consent_kvkk,
        accept_privacy_policy: body.consent_privacy,
        accept_terms_of_service: body.consent_terms,
      },
    );
    return NextResponse.json({
      ok: true,
      email: data.email,
      email_sent: data.email_sent,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      // Surface the Django error code so the UI can localize it. Field-level
      // errors (e.g. password too weak) are passed back as `field_errors`.
      const detail = error.detail as
        | { error_code?: string; field_errors?: Record<string, unknown> }
        | null;
      const code = detail?.error_code ?? null;
      return NextResponse.json(
        {
          error: code ?? "registration_failed",
          field_errors: detail?.field_errors ?? null,
        },
        { status: error.status >= 400 && error.status < 500 ? error.status : 502 },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
