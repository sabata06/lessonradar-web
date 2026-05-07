import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResetPasswordBody {
  email?: string;
  code?: string;
  new_password?: string;
  new_password_confirm?: string;
}

/**
 * Reset-password BFF (B2 pass-3).
 *
 * Backend uses a 6-digit numeric OTP issued by `forgot-password`. Surface the
 * Django error_code so the UI can localize:
 *   - `INVALID_RESET_CODE`     — wrong code, or the user already consumed it
 *   - `RESET_CODE_EXPIRED`     — TTL elapsed (15 min)
 *   - `USER_NOT_FOUND`         — only fires when account was deleted between
 *                                forgot-password and the reset call
 *   - `VALIDATION_ERROR` / 400 — password too weak / mismatched / missing field
 *
 * No Turnstile here: the reset page is gated by the OTP itself (six-digit
 * numeric, 15-minute TTL). Adding another challenge per submit harms recovery
 * UX more than it raises the bar (an attacker who has the email's code already
 * owns the inbox).
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: ResetPasswordBody;
  try {
    body = (await req.json()) as ResetPasswordBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { email, code, new_password, new_password_confirm } = body;
  if (!email || !code || !new_password || !new_password_confirm) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  try {
    await apiClient.post(ENDPOINTS.AUTH_RESET_PASSWORD, {
      email,
      code,
      new_password,
      new_password_confirm,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      const detail = error.detail as
        | { error_code?: string; field_errors?: Record<string, unknown> }
        | null;
      const code = detail?.error_code ?? "reset_failed";
      return NextResponse.json(
        {
          error: code,
          field_errors: detail?.field_errors ?? null,
        },
        { status: error.status >= 400 && error.status < 500 ? error.status : 502 },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
