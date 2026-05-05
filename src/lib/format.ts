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
 */
export function formatLastActive(
  lastActiveAtIso: string,
  nowIso: string,
  locale: SupportedLocale = "tr",
): string {
  const last = new Date(lastActiveAtIso).getTime();
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

export function isRecentlyActive(lastActiveAtIso: string, nowIso: string): boolean {
  const last = new Date(lastActiveAtIso).getTime();
  const now = new Date(nowIso).getTime();
  return now - last < 1000 * 60 * 60 * 24; // last 24h
}
