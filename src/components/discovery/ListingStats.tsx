import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge04Icon,
  Clock01Icon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { formatHourlyRange, formatResponseTime } from "@/lib/format";
import type { SupportedLocale } from "@/lib/types";
import type { PSEOLandingData } from "@/lib/data/pseo";

interface ListingStatsProps {
  data: PSEOLandingData;
  locale: SupportedLocale;
  className?: string;
}

export function ListingStats({ data, locale, className }: ListingStatsProps) {
  const { stats } = data;
  const items: { icon: React.ReactNode; label: string; value: string }[] = [];

  items.push({
    icon: <HugeiconsIcon icon={CheckmarkBadge04Icon} size={16} strokeWidth={1.8} />,
    label: locale === "tr" ? "Doğrulanmış öğretmen" : "Verified tutors",
    value: `${stats.verifiedCount} / ${stats.totalCount}`,
  });

  if (stats.minHourly !== null && stats.maxHourly !== null) {
    items.push({
      icon: <HugeiconsIcon icon={MoneyBag02Icon} size={16} strokeWidth={1.8} />,
      label: locale === "tr" ? "Saat ücreti" : "Hourly rate",
      value: formatHourlyRange(stats.minHourly, stats.maxHourly, locale),
    });
  }

  if (stats.medianResponseMinutes !== null) {
    items.push({
      icon: <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />,
      label: locale === "tr" ? "Ortalama yanıt" : "Median response",
      value: formatResponseTime(stats.medianResponseMinutes, locale),
    });
  }

  if (items.length === 0) return null;

  return (
    <ul
      className={cn(
        "grid gap-3 sm:grid-cols-3",
        className,
      )}
    >
      {items.map((it) => (
        <li
          key={it.label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
            {it.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {it.label}
            </p>
            <p className="text-base font-semibold text-foreground">{it.value}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
