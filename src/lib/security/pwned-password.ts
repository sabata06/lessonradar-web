/**
 * Pwned password check via haveibeenpwned.com k-anonymity API.
 *
 * Privacy contract:
 *   - The full password NEVER leaves the browser.
 *   - We SHA-1 the password locally, send ONLY the first 5 hex chars of the
 *     hash to `api.pwnedpasswords.com/range/<prefix>`, and match the suffix
 *     against the returned list locally.
 *   - The remote API receives at most a 5-hex-character prefix per check,
 *     which covers ~440 candidate hashes — statistically indistinguishable
 *     from any specific password.
 *
 * Security note:
 *   - SHA-1 is cryptographically broken for collision resistance, but the
 *     HIBP corpus is keyed by SHA-1 by historical accident; we're matching
 *     against a known dataset, not building a hash primitive.
 *   - The `Add-Padding: true` header obscures response sizes from a
 *     network observer — HIBP returns a constant-size padded list.
 *
 * UX contract:
 *   - The result is a count (>0 means pwned), not a boolean. The UI shows
 *     the count to help users understand severity ("seen in 5,483 breaches").
 *   - This is a WARNING, never a block. Users can submit anyway; we just
 *     surface the risk. NIST 800-63B aligns: discourage pwned passwords
 *     but don't gatekeep behind them.
 */

/** Cache breach counts per password hash for the lifetime of the page so
 * react-hook-form re-renders don't refetch. Bounded by user lifetime; no
 * cleanup needed at this scale. */
const cache = new Map<string, number>();

export async function checkPwnedPassword(
  password: string,
  signal?: AbortSignal,
): Promise<number | null> {
  if (!password || password.length < 4) return null;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const buffer = new TextEncoder().encode(password);
  let hashBuffer: ArrayBuffer;
  try {
    hashBuffer = await subtle.digest("SHA-1", buffer);
  } catch {
    return null;
  }
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const cached = cache.get(hashHex);
  if (cached !== undefined) return cached;

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  try {
    const res = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        method: "GET",
        // Padding obscures real response size from a passive observer.
        headers: { "Add-Padding": "true" },
        signal,
        cache: "force-cache",
      },
    );
    if (!res.ok) return null;
    const text = await res.text();

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const sepIdx = line.indexOf(":");
      if (sepIdx === -1) continue;
      const lineSuffix = line.slice(0, sepIdx);
      if (lineSuffix === suffix) {
        const count = Number.parseInt(line.slice(sepIdx + 1), 10) || 1;
        cache.set(hashHex, count);
        return count;
      }
    }
    cache.set(hashHex, 0);
    return 0;
  } catch {
    // Network failure / CORS / aborted — fail closed (return null so the UI
    // simply doesn't show a warning rather than incorrectly clearing one).
    return null;
  }
}
