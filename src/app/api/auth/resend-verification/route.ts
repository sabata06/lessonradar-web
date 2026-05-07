import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  try {
    await apiClient.post(ENDPOINTS.AUTH_RESEND_VERIFICATION, {
      email: body.email,
    });
    // Backend returns generic success even when email is unknown — pass through.
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      const detail = error.detail as { error_code?: string } | null;
      return NextResponse.json(
        { error: detail?.error_code ?? "resend_failed" },
        { status: error.status >= 400 && error.status < 500 ? error.status : 502 },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
