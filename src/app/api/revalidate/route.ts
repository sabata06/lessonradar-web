import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * On-demand ISR invalidation hook called by Django admin actions
 * (teacher approval, profile edits, etc.). Without this, a newly
 * approved teacher takes the full revalidate window (10 min → 1 hour
 * depending on the page) to appear in `/tr/gaziantep` and the pSEO
 * landing pages — a launch-blocker for moderator UX.
 *
 * Security:
 *   - Secret header check (matches backend's `WEB_REVALIDATE_SECRET`
 *     env var). No CSRF cookie because the caller isn't a browser.
 *   - Hard cap on path count to prevent a stolen secret from being
 *     weaponized into a cache-stampede tool.
 *   - Each path must be absolute (starts with `/`) and free of
 *     traversal segments. Other shapes are skipped, not thrown.
 *   - Auth-bearing routes (`/api/auth/*`, `/api/teacher-application/*`)
 *     can never be revalidated through this endpoint regardless of
 *     secret — they're per-request anyway, but the guard removes a
 *     misconfiguration footgun.
 *
 * Failure-tolerant: a single bad path doesn't abort the rest; the
 * response always lists what was invalidated vs skipped so the
 * backend can log drift.
 */
const SECRET = process.env.REVALIDATE_SECRET;
const MAX_PATHS = 40;

export async function POST(req: Request): Promise<Response> {
  if (!SECRET) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (req.headers.get("x-revalidate-secret") !== SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { paths?: unknown };
  try {
    body = (await req.json()) as { paths?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const rawPaths = Array.isArray(body.paths) ? body.paths : [];
  if (rawPaths.length === 0 || rawPaths.length > MAX_PATHS) {
    return NextResponse.json({ error: "invalid_paths" }, { status: 400 });
  }

  const revalidated: string[] = [];
  const skipped: { path: string; reason: string }[] = [];

  for (const raw of rawPaths) {
    if (typeof raw !== "string") {
      skipped.push({ path: String(raw), reason: "not_string" });
      continue;
    }
    if (!raw.startsWith("/") || raw.includes("..")) {
      skipped.push({ path: raw, reason: "unsafe" });
      continue;
    }
    if (raw.startsWith("/api/")) {
      skipped.push({ path: raw, reason: "api_route" });
      continue;
    }
    try {
      revalidatePath(raw);
      revalidated.push(raw);
    } catch (err) {
      skipped.push({ path: raw, reason: String(err) });
    }
  }

  return NextResponse.json({ revalidated, skipped });
}
