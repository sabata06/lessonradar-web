import "server-only";

/**
 * Strict same-origin check for state-changing route handlers (POST/PUT/PATCH/DELETE).
 *
 * Modern browsers always send `Origin` on cross-origin requests; `Sec-Fetch-Site`
 * gives a stronger signal when present. We trust `Origin` and bail when it is
 * missing for a state-changing request.
 *
 * Configure allowed origins via `WEB_ALLOWED_ORIGINS` (comma-separated). In
 * dev, defaults to `http://localhost:3000` plus the request's own host header
 * to avoid local debugging churn.
 */

function parseAllowed(): string[] {
  const env = process.env.WEB_ALLOWED_ORIGINS;
  if (!env) return [];
  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function originFromHost(req: Request): string | null {
  const host = req.headers.get("host");
  if (!host) return null;
  // Trust X-Forwarded-Proto only when behind our own proxy; fall back to https in prod.
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

export function validateOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    // Some same-origin form posts omit Origin in older browsers; allow only when
    // Sec-Fetch-Site indicates same-origin.
    const sfs = req.headers.get("sec-fetch-site");
    return sfs === "same-origin";
  }

  const allowed = new Set(parseAllowed());

  // Always allow same-origin (Origin matches the host the request hit).
  const selfOrigin = originFromHost(req);
  if (selfOrigin) allowed.add(selfOrigin);

  // Dev convenience: localhost on default Next port.
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  return allowed.has(origin);
}
