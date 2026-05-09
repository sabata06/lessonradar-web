import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { pickLocalized } from "@/lib/types";
import type {
  MarketplaceDiscipline,
  SupportedLocale,
} from "@/lib/types";
import {
  buildSearchQuery,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search-types";

interface DisciplineQuickChipsProps {
  filters: TeacherSearchFilters;
  disciplines: MarketplaceDiscipline[];
  locale: SupportedLocale;
}

/**
 * Quick-pick row of featured disciplines. Each chip is a real `<Link>`
 * that toggles the discipline filter while preserving every other
 * active filter — same pattern as ActiveFilterChips, but with positive
 * (add filter) framing instead of negative (remove filter).
 *
 * Lets users narrow by subject without opening the dropdown — biggest
 * UX win for the most common search action ("matematik öğretmen ara").
 */
export function DisciplineQuickChips({
  filters,
  disciplines,
  locale,
}: DisciplineQuickChipsProps) {
  const t = useTranslations("search");
  const featured = disciplines.filter((d) => d.isFeatured);
  if (featured.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t("quick_chips_label")}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("quick_chips_label")}
      </span>
      {featured.map((d) => {
        const isActive = filters.disciplineSlug === d.slug;
        const qs = buildSearchQuery(filters, {
          disciplineSlug: isActive ? null : d.slug,
        });
        return (
          <Link
            key={d.slug}
            href={`/ara${qs}`}
            aria-pressed={isActive}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isActive
                ? "border-brand bg-brand-soft text-brand-soft-foreground shadow-card"
                : "border-border bg-card text-foreground hover:border-brand/40 hover:text-brand",
            )}
          >
            {pickLocalized(d.name, locale)}
          </Link>
        );
      })}
    </div>
  );
}
