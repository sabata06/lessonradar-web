import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyBody {
  email?: string;
  code?: string;
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.email || !body.code) {
    return NextResponse.json(
      { error: "validation_error" },
      { status: 400 },
    );
  }

  try {
    await apiClient.post(ENDPOINTS.AUTH_VERIFY_EMAIL, {
      email: body.email,
      code: body.code,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      const detail = error.detail as { error_code?: string } | null;
      const code = detail?.error_code ?? "verification_failed";
      return NextResponse.json(
        { error: code },
        { status: error.status >= 400 && error.status < 500 ? error.status : 502 },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
