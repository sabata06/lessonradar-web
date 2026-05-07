import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Double-submit CSRF token (B1.7).
 *
 * Defense-in-depth on top of `SameSite=Lax` + same-origin Origin validation:
 *   1. Client RSC reads the token via `getCsrfToken()` and renders it into the
 *      page (form input or `<meta>` tag).
 *   2. Browser submits state-changing request with header `x-csrf-token`.
 *   3. Server reads cookie + header, compares constant-time. Mismatch → 403.
 *
 * The token cookie is **not** HttpOnly (the client must read it for the
 * double-submit pattern), but it carries no secret value — only a random
 * identifier compared to itself. Encrypted session cookie remains HttpOnly.
 */

const CSRF_COOKIE = "lr_csrf";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TOKEN_BYTES = 32;
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day, rotates on next page render

const IS_PROD = process.env.NODE_ENV === "production";

function generate(): string {
  return randomBytes(CSRF_TOKEN_BYTES).toString("base64url");
}

/**
 * Read the current CSRF token, generating + setting one when missing.
 * Call from RSCs / server actions / route handlers.
 */
export async function getCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing) return existing;

  const token = generate();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false, // double-submit requires JS read
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
  return token;
}

/**
 * Validate the CSRF token from a request: cookie value must equal header.
 * Returns true on valid, false on missing/mismatch.
 */
export async function validateCsrf(req: Request): Promise<boolean> {
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;

  if (headerToken.length !== cookieToken.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken),
    );
  } catch {
    return false;
  }
}

export const CSRF_HEADER_NAME = CSRF_HEADER;
