import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  buildSearchQuery,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search";
import type {
  City,
  District,
  MarketplaceDiscipline,
  SupportedLocale,
} from "@/lib/types";
import { pickLocalized } from "@/lib/types";

interface ActiveFilterChipsProps {
  filters: TeacherSearchFilters;
  cities: City[];
  districts: District[];
  disciplines: MarketplaceDiscipline[];
  locale: SupportedLocale;
}

/**
 * Removable chip strip rendering each active filter as a link that
 * removes only that filter (preserving the rest). Plain `<a>` links —
 * no client JS, plays nicely with the page's GET-form architecture.
 *
 * Renders nothing when no filter is applied to keep the layout calm.
 */
export function ActiveFilterChips({
  filters,
  cities,
  districts,
  disciplines,
  locale,
}: ActiveFilterChipsProps) {
  const t = useTranslations("search.active");

  const items: { key: keyof TeacherSearchFilters; label: string }[] = [];

  if (filters.q?.trim()) {
    items.push({ key: "q", label: t("query_label", { q: filters.q.trim() }) });
  }
  if (filters.disciplineSlug) {
    const d = disciplines.find((x) => x.slug === filters.disciplineSlug);
    if (d) items.push({ key: "disciplineSlug", label: pickLocalized(d.name, locale) });
  }
  if (filters.citySlug) {
    const c = cities.find((x) => x.slug === filters.citySlug);
    if (c) {
      items.push({
        key: "citySlug",
        label: locale === "tr" ? c.nameTr : c.nameEn,
      });
    }
  }
  if (filters.districtSlug) {
    const d = districts.find(
      (x) => x.slug === filters.districtSlug && x.citySlug === filters.citySlug,
    );
    if (d) {
      items.push({
        key: "districtSlug",
        label: locale === "tr" ? d.nameTr : d.nameEn,
      });
    }
  }
  if (filters.modality && filters.modality !== "any") {
    items.push({
      key: "modality",
      label:
        filters.modality === "online"
          ? t("modality_online")
          : t("modality_in_person"),
    });
  }
  if (filters.verifiedOnly) {
    items.push({ key: "verifiedOnly", label: t("verified_label") });
  }

  if (items.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t("all_label")}
    >
      {items.map((item) => {
        const removeQS = buildSearchQuery(filters, {
          [item.key]: null,
          // Removing the city also clears any selected district to keep
          // the URL self-consistent.
          ...(item.key === "citySlug" ? { districtSlug: null } : {}),
        });
        return (
          <Link
            key={item.key}
            href={`/ara${removeQS}`}
            aria-label={t("remove_label", { label: item.label })}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors",
              "hover:border-brand/50 hover:text-brand",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            {item.label}
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={12}
              strokeWidth={2}
              aria-hidden
              className="text-muted-foreground"
            />
          </Link>
        );
      })}
      <Link
        href="/ara"
        className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
      >
        {t("all_label")}
      </Link>
    </div>
  );
}
