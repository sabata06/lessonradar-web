import "server-only";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Set `TURNSTILE_SECRET_KEY` in env. When unset (local dev without Turnstile
 * keys), `verifyTurnstile` returns `true` so flows stay testable — flagged in
 * logs so we don't accidentally ship without a key.
 *
 * Public site key (for the widget) is exposed as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let warnedMissing = false;

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
}

function clientIpFrom(req: Request): string | null {
  // Trust X-Forwarded-For only behind our own Nginx (production).
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("cf-connecting-ip") ?? null;
}

export async function verifyTurnstile(
  token: string | undefined | null,
  req: Request,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (!warnedMissing && process.env.NODE_ENV !== "production") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY missing — bypassing verification (dev only).",
      );
      warnedMissing = true;
    }
    return process.env.NODE_ENV !== "production";
  }

  if (!token || typeof token !== "string") return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const ip = clientIpFrom(req);
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      // 5s timeout — Turnstile is normally <500ms.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TurnstileVerifyResponse;
    return data.success === true;
  } catch {
    return false;
  }
}
