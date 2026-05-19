import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  AccountCustomerProfilePayload,
  CustomerProfileUpdateErrorCode,
  CustomerProfileUpdatePayload,
  CustomerProfileUpdateResponse,
} from "@/lib/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — fetch CustomerProfile row (auto-created server-side on first read).
 * PATCH — partial update: phone, address, education, parent contact, city/district.
 *
 * Customer/admin only. Teacher accounts hit IsCustomerOrAdmin and 403.
 */

const FIELD_ERROR_TO_CODE: Record<string, CustomerProfileUpdateErrorCode> = {
  phone_code: "phone_code_invalid",
  phone_number: "phone_invalid",
  parent_phone: "parent_phone_invalid",
  parent_phone_code: "phone_code_invalid",
  parent_email: "parent_email_invalid",
  birth_date: "birth_date_invalid",
};

function classifyDjangoError(err: ApiError): CustomerProfileUpdateErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 400) {
    const code = (err.code ?? "").toLowerCase();
    const flat =
      err.detail && typeof err.detail === "object"
        ? JSON.stringify(err.detail).toLowerCase()
        : "";

    if (flat.includes("parent_email") || code.includes("parent_email")) {
      return "parent_email_invalid";
    }
    if (
      flat.includes("parent_phone_code") ||
      code.includes("parent_phone_code")
    ) {
      return "phone_code_invalid";
    }
    if (flat.includes("parent_phone")) return "parent_phone_invalid";
    if (flat.includes("phone_code")) return "phone_code_invalid";
    if (flat.includes("phone")) return "phone_invalid";
    if (flat.includes("birth_date") || code.includes("birth_date")) {
      return "birth_date_invalid";
    }
    return "validation_error";
  }
  return "unknown";
}

function fieldErrorsFromApi(
  err: ApiError,
): Record<string, string[]> | undefined {
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
      { ok: false, code: "unauthorized" satisfies CustomerProfileUpdateErrorCode },
      { status: 401 },
    );
  }

  try {
    const data = await apiClient.get<AccountCustomerProfilePayload>(
      ENDPOINTS.AUTH_CUSTOMER_PROFILE,
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
    return NextResponse.json(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}

export async function PATCH(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }

  const incoming = body as Record<string, unknown>;
  const payload: CustomerProfileUpdatePayload = {};

  const stringFields: (keyof CustomerProfileUpdatePayload)[] = [
    "phone_code",
    "phone_number",
    "address",
    "school_name",
    "grade",
    "subjects",
    "parent_name",
    "parent_phone_code",
    "parent_phone",
    "parent_email",
    "city",
    "district",
  ];
  for (const key of stringFields) {
    const raw = incoming[key];
    if (typeof raw === "string") {
      // Trim only — never alter the canonical value the form sent. The
      // backend serializer's `validate_phone_*` does the real normalization.
      payload[key] = raw.trim();
    }
  }

  // birth_date: explicit null clears the column; empty string is normalized
  // to null at the boundary so the customer can wipe their entry.
  if ("birth_date" in incoming) {
    const raw = incoming.birth_date;
    if (raw === null || raw === "") {
      payload.birth_date = null;
    } else if (typeof raw === "string") {
      payload.birth_date = raw.trim();
    }
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "validation_error" },
      { status: 400 },
    );
  }

  try {
    const data = await apiClient.patch<AccountCustomerProfilePayload>(
      ENDPOINTS.AUTH_CUSTOMER_PROFILE,
      payload,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<CustomerProfileUpdateResponse>({
      ok: true,
      data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<CustomerProfileUpdateResponse>(
        {
          ok: false,
          code: classifyDjangoError(error),
          fieldErrors: fieldErrorsFromApi(error),
        },
        { status: error.status },
      );
    }
    return NextResponse.json<CustomerProfileUpdateResponse>(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}
