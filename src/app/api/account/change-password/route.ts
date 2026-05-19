import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  ChangePasswordErrorCode,
  ChangePasswordPayload,
  ChangePasswordResponse,
} from "@/lib/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD_ERROR_TO_CODE: Record<string, ChangePasswordErrorCode> = {
  current_password: "current_password_incorrect",
  new_password: "new_password_too_weak",
  new_password_confirm: "new_password_mismatch",
};

/**
 * POST — change password. Email-based accounts must include `current_password`;
 * OAuth-only accounts may set their first password without it (backend
 * decides via `user.has_usable_password()`).
 *
 * Backend error codes (`ChangePasswordSerializer.validate`):
 *   - CURRENT_PASSWORD_REQUIRED
 *   - CURRENT_PASSWORD_INCORRECT
 *   - NEW_PASSWORD_SAME_AS_CURRENT
 *   - + Django password validators (length, common, similar, numeric)
 */

function classifyDjangoError(err: ApiError): ChangePasswordErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status !== 400) return "unknown";

  const detail = err.detail;
  const flat =
    detail && typeof detail === "object"
      ? JSON.stringify(detail).toLowerCase()
      : "";
  const code = (err.code ?? "").toLowerCase();

  if (
    flat.includes("current_password_required") ||
    code.includes("current_password_required")
  ) {
    return "current_password_required";
  }
  if (
    flat.includes("current_password_incorrect") ||
    code.includes("current_password_incorrect") ||
    flat.includes("mevcut şifre hatalı") ||
    flat.includes("mevcut sifre hatali")
  ) {
    return "current_password_incorrect";
  }
  if (
    flat.includes("new_password_same_as_current") ||
    code.includes("new_password_same_as_current")
  ) {
    return "new_password_same_as_current";
  }
  if (
    flat.includes("password_too_short") ||
    flat.includes("min_length") ||
    flat.includes("too short")
  ) {
    return "new_password_too_short";
  }
  if (
    flat.includes("password_too_common") ||
    flat.includes("password_entirely_numeric") ||
    flat.includes("password_too_similar") ||
    flat.includes("password_too_weak")
  ) {
    return "new_password_too_weak";
  }
  return "validation_error";
}

function fieldErrorsFromApi(err: ApiError): Record<string, string[]> | undefined {
  const flat = err.fieldErrors();
  if (!flat) return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(flat)) {
    out[k] = [FIELD_ERROR_TO_CODE[k] ?? v];
  }
  return out;
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "unauthorized" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "unauthorized" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }

  const incoming = body as Record<string, unknown>;
  const payload: ChangePasswordPayload = {
    new_password: "",
    new_password_confirm: "",
  };
  if (typeof incoming.current_password === "string") {
    payload.current_password = incoming.current_password;
  }
  if (typeof incoming.new_password === "string") {
    payload.new_password = incoming.new_password;
  }
  if (typeof incoming.new_password_confirm === "string") {
    payload.new_password_confirm = incoming.new_password_confirm;
  }
  if (
    !payload.new_password ||
    payload.new_password !== payload.new_password_confirm
  ) {
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "new_password_mismatch" },
      { status: 400 },
    );
  }

  try {
    await apiClient.post(ENDPOINTS.AUTH_CHANGE_PASSWORD, payload, {
      accessToken: session.djangoAccess,
    });
    return NextResponse.json<ChangePasswordResponse>({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<ChangePasswordResponse>(
        {
          ok: false,
          code: classifyDjangoError(error),
          fieldErrors: fieldErrorsFromApi(error),
        },
        { status: error.status },
      );
    }
    return NextResponse.json<ChangePasswordResponse>(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}
