import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResendResetCodeBody {
  email?: string;
}

/**
 * Resend password-reset code (B2 pass-3).
 *
 * Why a separate route from /api/auth/forgot-password?
 *   forgot-password is the unbounded entry point — anyone can hit it without
 *   prior context, so it requires Turnstile. Resend, by contrast, is invoked
 *   from /sifre-sifirla after the user has already passed the Turnstile gate
 *   on /sifremi-unuttum and the OTP for that email is in flight. Forcing a
 *   second Turnstile challenge on the reset page would either require an
 *   inline widget (UX confusion: "what is this for?") or be no-op security
 *   (an attacker who can solve Turnstile on /sifremi-unuttum can solve it
 *   here too). The genuine bot bar for this loop is the 30-second client
 *   cooldown plus Django's unknown-email guard.
 *
 * Forwards to the same Django endpoint as forgot-password — backend already
 * collapses unknown-email cases (account-enumeration safe).
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: ResendResetCodeBody;
  try {
    body = (await req.json()) as ResendResetCodeBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  try {
    await apiClient.post(ENDPOINTS.AUTH_FORGOT_PASSWORD, { email: body.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: "validation_error" },
        { status: error.status >= 400 && error.status < 500 ? 400 : 502 },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
