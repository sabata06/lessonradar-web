import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { setSessionCookie } from "@/lib/auth/cookies";
import { safeUserFromProfile, type SessionPayload } from "@/lib/auth/server";
import { getCsrfToken } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GoogleAuthRequestBody {
  id_token?: string;
  /**
   * Replay-attack guard generated client-side per sign-in attempt and
   * embedded into the Google ID token via `google.accounts.id.initialize`.
   * Backend cross-checks it against `idinfo.nonce`; tampering or reuse rejects
   * the token with `INVALID_GOOGLE_NONCE`. Optional for backward compat with
   * the mobile native SDK (which doesn't expose a nonce hook today), but the
   * web button always supplies it.
   */
  nonce?: string;
}

interface DjangoGoogleResponse {
  access: string;
  refresh: string;
  isNewUser?: boolean;
  user: Record<string, unknown>;
}

const ACCESS_TTL_SEC = 10 * 60;

/**
 * POST — Exchange a Google ID token for a LessonRadar session.
 *
 * Flow:
 *   1. Frontend renders the GIS button with a per-attempt `nonce`.
 *   2. User signs in → Google returns an ID token whose `nonce` claim
 *      mirrors the value we generated.
 *   3. We forward both to Django; backend verifies signature + audience
 *      (mobile or web client ID) + the nonce claim against the value we
 *      passed through. Mismatched / replayed tokens are rejected.
 *   4. Django mints a JWT pair and we wrap it in our encrypted session
 *      cookie, same as email/password login.
 *
 * Why not Turnstile here: Google's own GIS button is the bot gate (one-tap
 * UX, signed token, replay-protected). Re-adding Turnstile would just block
 * legitimate signed sessions.
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: GoogleAuthRequestBody;
  try {
    body = (await req.json()) as GoogleAuthRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.id_token !== "string" || body.id_token.length < 50) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }
  if (typeof body.nonce !== "string" || body.nonce.length < 16) {
    // The client always provides a nonce; missing it usually means a
    // tampered request, not a legitimate retry. Fail fast.
    return NextResponse.json({ error: "missing_nonce" }, { status: 400 });
  }

  let data: DjangoGoogleResponse;
  try {
    data = await apiClient.post<DjangoGoogleResponse>(ENDPOINTS.AUTH_GOOGLE, {
      id_token: body.id_token,
      nonce: body.nonce,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      // Audience / nonce / signature failures collapse to one client-facing
      // code — we never want to hint which bit failed.
      const upstreamCode = (error.code ?? "").toUpperCase();
      const knownFailure =
        upstreamCode === "INVALID_GOOGLE_TOKEN" ||
        upstreamCode === "INVALID_GOOGLE_AUDIENCE" ||
        upstreamCode === "INVALID_GOOGLE_NONCE" ||
        upstreamCode === "GOOGLE_IDENTITY_INCOMPLETE";
      if (knownFailure) {
        return NextResponse.json(
          { error: "google_auth_failed" },
          { status: 401 },
        );
      }
      if (
        upstreamCode === "ACCOUNT_INACTIVE" ||
        upstreamCode === "ACCOUNT_DELETED" ||
        upstreamCode === "ACCOUNT_DELETION_IN_PROGRESS"
      ) {
        return NextResponse.json(
          { error: upstreamCode.toLowerCase() },
          { status: 401 },
        );
      }
      if (error.status >= 400 && error.status < 500) {
        return NextResponse.json(
          { error: "google_auth_failed" },
          { status: 401 },
        );
      }
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  const user = safeUserFromProfile(data.user);
  const session: SessionPayload = {
    user,
    djangoAccess: data.access,
    djangoRefresh: data.refresh,
    accessExp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SEC,
  };
  await setSessionCookie(session);
  await getCsrfToken();

  return NextResponse.json({ user, isNewUser: Boolean(data.isNewUser) });
}
