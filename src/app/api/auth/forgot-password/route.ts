import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { validateOrigin } from "@/lib/security/origin";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ForgotPasswordBody {
  email?: string;
  turnstile_token?: string;
}

/**
 * Forgot-password BFF (B2 pass-3).
 *
 * Always returns `{ ok: true }` on 2xx upstream **and** when the email is
 * unknown — Django itself collapses the unknown-email case (catches
 * `CustomUser.DoesNotExist` and returns `PASSWORD_RESET_CODE_DISPATCHED`),
 * so the account-enumeration guard is shared across both layers.
 *
 * Failure modes that we do surface: invalid_origin, turnstile_failed,
 * validation_error (missing email), upstream_error (network/5xx).
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: ForgotPasswordBody;
  try {
    body = (await req.json()) as ForgotPasswordBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  if (!(await verifyTurnstile(body.turnstile_token, req))) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
  }

  try {
    await apiClient.post(ENDPOINTS.AUTH_FORGOT_PASSWORD, {
      email: body.email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      // Backend currently only 400s on invalid email format. Surface a generic
      // validation error code; do not leak field-level detail beyond that.
      return NextResponse.json(
        { error: "validation_error" },
        { status: error.status >= 400 && error.status < 500 ? 400 : 502 },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
