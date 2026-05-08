/**
 * Locale-aware formatters. Server-safe (no Date.now() / Math.random()).
 * Always pass an explicit locale so SSR and CSR agree.
 */
import type { SupportedLocale } from "@/lib/types";

const TRY_FORMATTER_CACHE: Partial<Record<SupportedLocale, Intl.NumberFormat>> = {};

function getCurrencyFormatter(locale: SupportedLocale) {
  if (!TRY_FORMATTER_CACHE[locale]) {
    TRY_FORMATTER_CACHE[locale] = new Intl.NumberFormat(
      locale === "tr" ? "tr-TR" : "en-US",
      {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      },
    );
  }
  return TRY_FORMATTER_CACHE[locale]!;
}

export function formatLira(amount: number, locale: SupportedLocale = "tr"): string {
  return getCurrencyFormatter(locale).format(amount);
}

export function formatHourlyRange(
  min: number,
  max: number,
  locale: SupportedLocale = "tr",
): string {
  if (min === max) return `${formatLira(min, locale)}/saat`;
  return `${formatLira(min, locale)}–${formatLira(max, locale)}/saat`;
}

/**
 * "18 dk içinde" / "in 18 min" — keep terse; renders inside trust pills.
 */
export function formatResponseTime(
  minutes: number,
  locale: SupportedLocale = "tr",
): string {
  if (minutes < 60) {
    return locale === "tr" ? `${minutes} dk içinde` : `in ${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  return locale === "tr" ? `${hours} sa içinde` : `in ${hours}h`;
}

/**
 * Relative active marker. Server-safe because we accept "now" as input
 * (from the page's getServerSideRender request time, never Date.now() inline).
 *
 * Returns `null` when the input is null/empty/invalid. The null branch
 * is explicit so callers can drop the pill rather than render "NaN ay
 * önce" — that exact bug bit us on profiles whose backend
 * `last_active_at` was never set.
 */
export function formatLastActive(
  lastActiveAtIso: string | null | undefined,
  nowIso: string,
  locale: SupportedLocale = "tr",
): string | null {
  if (!lastActiveAtIso) return null;
  const last = new Date(lastActiveAtIso).getTime();
  if (!Number.isFinite(last)) return null;
  const now = new Date(nowIso).getTime();
  const diffMin = Math.max(0, Math.round((now - last) / 60000));

  if (diffMin < 5) return locale === "tr" ? "şimdi aktif" : "active now";
  if (diffMin < 60) {
    return locale === "tr" ? `${diffMin} dk önce` : `${diffMin} min ago`;
  }
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return locale === "tr" ? `${diffH} sa önce` : `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return locale === "tr" ? `${diffD} gün önce` : `${diffD}d ago`;
  const diffW = Math.round(diffD / 7);
  if (diffW < 5) return locale === "tr" ? `${diffW} hafta önce` : `${diffW}w ago`;
  const diffMo = Math.round(diffD / 30);
  return locale === "tr" ? `${diffMo} ay önce` : `${diffMo}mo ago`;
}

export function isRecentlyActive(
  lastActiveAtIso: string | null | undefined,
  nowIso: string,
): boolean {
  if (!lastActiveAtIso) return false;
  const last = new Date(lastActiveAtIso).getTime();
  if (!Number.isFinite(last)) return false;
  const now = new Date(nowIso).getTime();
  return now - last < 1000 * 60 * 60 * 24; // last 24h
}

/**
 * Returns the correct Turkish locative suffix ("'te" / "'de") for a
 * proper noun based on consonant-harmony rules. Sert ünsüzler (p, ç, t,
 * k, f, h, s, ş) take "-te"; everything else takes "-de".
 *
 * Why this matters: hard-coded "'de" produced "Gaziantep'de" all over
 * the marketplace pages — gramatically wrong (Gaziantep ends in "p", a
 * sert ünsüz, so "'te" is correct). The mistake is invisible in
 * dev-tooling but jumps out in SERP snippets and meta descriptions,
 * undermining the "doğrulanmış / şeffaf" trust framing.
 *
 * Usage: `${cityName}'${locativeSuffix(cityName)}` →
 *   Gaziantep + 'te
 *   İstanbul  + 'da   (last vowel is u, last consonant is l → soft)
 *   Konya     + 'da
 *   Bursa     + 'da
 *   Sivas     + 'ta   (s = sert)
 *   Erzurum   + 'da
 */
export function locativeSuffix(name: string): "te" | "ta" | "de" | "da" {
  const trimmed = name.trim();
  if (!trimmed) return "de";
  const last = trimmed[trimmed.length - 1].toLocaleLowerCase("tr");
  const hardConsonants = ["p", "ç", "t", "k", "f", "h", "s", "ş"];
  const isHard = hardConsonants.includes(last);

  // Vowel-harmony for back/front choice — last *vowel* picks a/e.
  const lower = trimmed.toLocaleLowerCase("tr");
  const backVowels = ["a", "ı", "o", "u"];
  let isBack = false;
  for (let i = lower.length - 1; i >= 0; i--) {
    const ch = lower[i];
    if ("aeıioöuü".includes(ch)) {
      isBack = backVowels.includes(ch);
      break;
    }
  }

  if (isHard) return isBack ? "ta" : "te";
  return isBack ? "da" : "de";
}
