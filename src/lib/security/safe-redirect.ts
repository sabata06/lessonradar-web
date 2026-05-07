/**
 * Open redirect prevention (B2.S3).
 *
 * Login/register forms accept a `?next=<path>` query param to bounce the user
 * back where they came from. Without validation, an attacker can phish via a
 * crafted `next=https://evil.com/lessonradar-look-alike` URL.
 *
 * Rules: only relative paths starting with `/` are accepted, and they must not
 * be `//` (protocol-relative URL — bypasses by becoming `//evil.com`).
 *
 * Returns the safe path or the supplied `fallback` (defaults to `/`).
 */
export function safeRedirect(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next || typeof next !== "string") return fallback;
  // Reject protocol-relative URLs (//evil.com) and absolute URLs (http://...).
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  // Reject anything containing a backslash — known browser parsing quirk.
  if (next.includes("\\")) return fallback;
  // Reject control characters (newlines etc. used in header injection).
  if (/[\x00-\x1F\x7F]/.test(next)) return fallback;
  return next;
}
