"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  buildSearchQuery,
  SORT_OPTIONS,
  type SortOption,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search";

interface SearchSortSelectProps {
  filters: TeacherSearchFilters;
}

/**
 * Sort dropdown. Client island — on change it pushes a new URL with
 * the same filters but a different `sort=` param. The page is dynamic,
 * so the new URL re-renders on the server and returns the re-sorted
 * list without a full reload feel.
 *
 * Uses a native `<select>` rather than radix Select so the mobile
 * system picker handles it and we ship one fewer JS bundle to the
 * route.
 */
export function SearchSortSelect({ filters }: SearchSortSelectProps) {
  const t = useTranslations("search.sort");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current: SortOption = filters.sort ?? "relevance";

  const labels: Record<SortOption, string> = {
    relevance: t("relevance"),
    rating: t("rating"),
    response_fast: t("response_fast"),
    price_asc: t("price_asc"),
  };

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as SortOption;
    const qs = buildSearchQuery(filters, {
      sort: next === "relevance" ? null : next,
    });
    startTransition(() => {
      router.push(`/ara${qs}`);
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium uppercase tracking-wider">{t("label")}</span>
      <select
        value={current}
        onChange={onChange}
        aria-label={t("label")}
        aria-busy={isPending}
        className={cn(
          "h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
    </label>
  );
}
