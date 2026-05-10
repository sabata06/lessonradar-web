import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge04Icon } from "@hugeicons/core-free-icons";

import type { PriceBucket } from "@/lib/data/pseo";
import type { SupportedLocale } from "@/lib/types";

interface PriceSummaryTableProps {
  buckets: PriceBucket[];
  cityName: string;
  disciplineName: string;
  locale: SupportedLocale;
}

const ALL_BUCKETS_ORDER: PriceBucket["id"][] = [
  "all",
  "online",
  "in_person",
  "verified",
];

export function PriceSummaryTable({
  buckets,
  cityName,
  disciplineName,
  locale,
}: PriceSummaryTableProps) {
  const t = useTranslations("pseo.price_table");
  if (buckets.length === 0) return null;

  const sorted = [...buckets].sort(
    (a, b) => ALL_BUCKETS_ORDER.indexOf(a.id) - ALL_BUCKETS_ORDER.indexOf(b.id),
  );
  const all = buckets.find((b) => b.id === "all");
  const sampleCount = all?.count ?? 0;

  return (
    <section
      aria-labelledby="pseo-price-table-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
    >
      <header className="mb-5 space-y-1">
        <h2
          id="pseo-price-table-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {t("heading", { city: cityName, discipline: disciplineName })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { count: sampleCount })}
        </p>
      </header>

      {/* Desktop / tablet — semantic <table> for AI Overviews + screen readers */}
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="py-3 pr-4 font-semibold">
                {t("col_segment")}
              </th>
              <th scope="col" className="py-3 px-4 font-semibold">
                {t("col_range")}
              </th>
              <th scope="col" className="py-3 px-4 font-semibold">
                {t("col_median")}
              </th>
              <th scope="col" className="py-3 pl-4 text-right font-semibold">
                {t("col_sample")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr
                key={b.id}
                className="border-b border-border/60 last:border-b-0"
              >
                <th
                  scope="row"
                  className="py-3 pr-4 text-left font-medium text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {b.id === "verified" ? (
                      <HugeiconsIcon
                        icon={CheckmarkBadge04Icon}
                        size={14}
                        strokeWidth={2.5}
                        className="text-success"
                        aria-hidden
                      />
                    ) : null}
                    {t(`segment_${b.id}`)}
                  </span>
                </th>
                <td className="py-3 px-4 tabular-nums text-foreground">
                  {formatRange(b.min, b.max, locale)}
                </td>
                <td className="py-3 px-4 tabular-nums font-semibold text-foreground">
                  {formatPrice(b.median, locale)}
                </td>
                <td className="py-3 pl-4 text-right tabular-nums text-muted-foreground">
                  {b.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, same data, no horizontal scroll */}
      <ul className="space-y-2 sm:hidden">
        {sorted.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-border/70 p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                {b.id === "verified" ? (
                  <HugeiconsIcon
                    icon={CheckmarkBadge04Icon}
                    size={14}
                    strokeWidth={2.5}
                    className="text-success"
                    aria-hidden
                  />
                ) : null}
                {t(`segment_${b.id}`)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("mobile_count", { count: b.count })}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("col_range")}
              </span>
              <span className="text-sm tabular-nums text-foreground">
                {formatRange(b.min, b.max, locale)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("col_median")}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatPrice(b.median, locale)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>
    </section>
  );
}

function formatPrice(n: number, locale: SupportedLocale): string {
  const formatted = new Intl.NumberFormat(
    locale === "tr" ? "tr-TR" : "en-US",
  ).format(n);
  return locale === "tr" ? `${formatted} ₺/sa` : `₺${formatted}/h`;
}

function formatRange(min: number, max: number, locale: SupportedLocale): string {
  if (min === max) return formatPrice(min, locale);
  const lo = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(min);
  const hi = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(max);
  return locale === "tr" ? `${lo}–${hi} ₺/sa` : `₺${lo}–₺${hi}/h`;
}
