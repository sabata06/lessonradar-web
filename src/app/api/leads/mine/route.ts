import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/leads/mine — list the authenticated customer's leads. Mirrors
 * Django `GET /api/customer/leads/mine/` per `docs/B4_LEAD_BACKEND_CONTRACT.md`.
 */
export async function GET() {
  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await apiClient.get(ENDPOINTS.LEAD_CUSTOMER_MINE, {
      accessToken: session.djangoAccess,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.code, detail: error.detail },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
