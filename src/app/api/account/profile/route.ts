import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  AccountProfilePayload,
  ProfileUpdateErrorCode,
  ProfileUpdatePayload,
  ProfileUpdateResponse,
} from "@/lib/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — fetch the authenticated user's base profile.
 * PATCH — update email / first_name / last_name / locale.
 *
 * Origin + CSRF gates run only on PATCH (state-changing). The handler is
 * intentionally thin: zod validation lives on the form; Django is the
 * authoritative validator and field-error owner.
 */

const FIELD_ERROR_TO_CODE: Record<string, ProfileUpdateErrorCode> = {
  email: "email_invalid",
  first_name: "first_name_invalid",
  last_name: "last_name_invalid",
  locale: "locale_invalid",
};

function classifyDjangoError(err: ApiError): ProfileUpdateErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 400) {
    const code = (err.code ?? "").toLowerCase();
    const detail = err.detail;
    const flat =
      detail && typeof detail === "object" ? JSON.stringify(detail).toLowerCase() : "";

    if (
      flat.includes("already") ||
      flat.includes("exists") ||
      flat.includes("unique") ||
      code === "email_already_in_use"
    ) {
      return "email_already_in_use";
    }
    if (flat.includes("email")) return "email_invalid";
    if (flat.includes("locale")) return "locale_invalid";
    if (flat.includes("first_name")) return "first_name_invalid";
    if (flat.includes("last_name")) return "last_name_invalid";
    return "validation_error";
  }
  return "unknown";
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

export async function GET() {
  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json(
      { ok: false, code: "unauthorized" satisfies ProfileUpdateErrorCode },
      { status: 401 },
    );
  }

  try {
    const data = await apiClient.get<AccountProfilePayload>(
      ENDPOINTS.AUTH_PROFILE,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { ok: false, code: classifyDjangoError(error) },
        { status: error.status },
      );
    }
    return NextResponse.json({ ok: false, code: "network_error" }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }

  // Whitelist + trim. Anything else is silently dropped; backend is also
  // protected by serializer.fields.
  const incoming = body as Record<string, unknown>;
  const payload: ProfileUpdatePayload = {};
  if (typeof incoming.email === "string") payload.email = incoming.email.trim();
  if (typeof incoming.first_name === "string") {
    payload.first_name = incoming.first_name.trim();
  }
  if (typeof incoming.last_name === "string") {
    payload.last_name = incoming.last_name.trim();
  }
  if (typeof incoming.locale === "string") {
    payload.locale = incoming.locale.trim();
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }

  const previousEmail = session.user.email.toLowerCase();

  try {
    const data = await apiClient.patch<AccountProfilePayload>(
      ENDPOINTS.AUTH_PROFILE,
      payload,
      { accessToken: session.djangoAccess },
    );
    const emailChanged = data.email.toLowerCase() !== previousEmail;
    return NextResponse.json<ProfileUpdateResponse>({
      ok: true,
      data,
      emailChanged,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<ProfileUpdateResponse>(
        {
          ok: false,
          code: classifyDjangoError(error),
          fieldErrors: fieldErrorsFromApi(error),
        },
        { status: error.status },
      );
    }
    return NextResponse.json<ProfileUpdateResponse>(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}
