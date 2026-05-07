import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { setSessionCookie } from "@/lib/auth/cookies";
import { safeUserFromProfile, type SessionPayload } from "@/lib/auth/server";
import { validateOrigin } from "@/lib/security/origin";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginRequestBody {
  email?: string;
  password?: string;
  turnstile_token?: string;
}

interface DjangoTokenResponse {
  access: string;
  refresh: string;
  user: Record<string, unknown>;
}

const ACCESS_TTL_SEC = 10 * 60;

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: LoginRequestBody;
  try {
    body = (await req.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  if (!(await verifyTurnstile(body.turnstile_token, req))) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
  }

  let data: DjangoTokenResponse;
  try {
    data = await apiClient.post<DjangoTokenResponse>(
      ENDPOINTS.AUTH_TOKEN_OBTAIN,
      { email: body.email, password: body.password },
    );
  } catch (error) {
    // Account enumeration prevention: collapse all auth failures to one shape.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      const code =
        error.code === "EMAIL_NOT_VERIFIED"
          ? "email_not_verified"
          : "invalid_credentials";
      return NextResponse.json({ error: code }, { status: 401 });
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

  return NextResponse.json({ user });
}
