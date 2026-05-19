import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { clearSessionCookie, getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  DeleteAccountErrorCode,
  DeleteAccountResponse,
} from "@/lib/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — request account deletion. Backend creates a `AccountDeletionRequest`
 * with a 30-day cooling-off period (`AccountDeletionService.request_in_app_deletion`),
 * blacklists the refresh token, disables device tokens, and deactivates the
 * account immediately. The web BFF additionally clears its own encrypted
 * session cookie so the user is signed out of every browser tab.
 *
 * Backend method is DELETE — we wrap it in POST on the BFF because browsers
 * cannot send a body with DELETE in some contexts and same-origin form
 * semantics are cleaner.
 */

interface DeleteAccountBackendResponse {
  success?: boolean;
  code?: string;
  scheduled_for?: string | null;
  refresh_revoked?: boolean;
}

function classifyDjangoError(err: ApiError): DeleteAccountErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 400) return "validation_error";
  return "unknown";
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<DeleteAccountResponse>(
      { ok: false, code: "unauthorized" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<DeleteAccountResponse>(
      { ok: false, code: "unauthorized" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<DeleteAccountResponse>(
      { ok: false, code: "unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — reason is optional.
    body = {};
  }
  const incoming =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const reason =
    typeof incoming.reason === "string"
      ? incoming.reason.trim().slice(0, 500)
      : "";

  try {
    const data = await apiClient.delete<DeleteAccountBackendResponse>(
      ENDPOINTS.AUTH_DELETE_ACCOUNT,
      {
        accessToken: session.djangoAccess,
        body: {
          refresh: session.djangoRefresh,
          reason,
        },
      },
    );

    // Clear the BFF session cookie regardless of whether this was a
    // first-time request or an idempotent repeat — the account is
    // deactivated server-side either way.
    await clearSessionCookie();

    const alreadyRequested = data?.code === "ACCOUNT_DELETION_ALREADY_REQUESTED";

    return NextResponse.json<DeleteAccountResponse>({
      ok: true,
      alreadyRequested,
      scheduledFor: data?.scheduled_for ?? null,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      // 401 on this endpoint usually means the access token is already
      // dead — sign out to leave the user in a consistent state.
      if (error.status === 401) {
        await clearSessionCookie();
      }
      return NextResponse.json<DeleteAccountResponse>(
        { ok: false, code: classifyDjangoError(error) },
        { status: error.status },
      );
    }
    return NextResponse.json<DeleteAccountResponse>(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}
