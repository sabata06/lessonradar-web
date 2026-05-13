import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UUID v4 shape — strict enough to reject obvious path noise without trusting
 * client input. Backend re-validates and BOLA-checks ownership.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/leads/[uuid] — customer-owned lead detail with offers.
 *
 * Proxies `GET /api/customer/leads/<uuid>/`. The encrypted session cookie
 * stays server-side; Django sees only a short-lived Bearer access token.
 *
 * GET doesn't need CSRF (no state change) but the encrypted session and role
 * gate are still enforced so an unauthenticated visitor can't probe lead
 * existence. Other customers' leads return 404, matching backend BOLA scoping.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "customer" && session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const data = await apiClient.get(ENDPOINTS.LEAD_CUSTOMER_DETAIL(uuid), {
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
