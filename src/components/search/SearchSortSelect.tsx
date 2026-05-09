"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildSearchQuery,
  SORT_OPTIONS,
  type SortOption,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search-types";

interface SearchSortSelectProps {
  filters: TeacherSearchFilters;
}

/**
 * Sort dropdown. Client island — on selection it pushes a new URL with
 * the same filters but a different `sort=` param. The page is dynamic,
 * so the new URL re-renders on the server and returns the re-sorted
 * list without a full reload feel.
 *
 * Uses the shadcn Select primitive for visual consistency with the
 * filter sidebar (rounded pill trigger, animated dropdown, brand
 * highlight on hover/selection).
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

  function onValueChange(next: string) {
    const value = next as SortOption;
    const qs = buildSearchQuery(filters, {
      sort: value === "relevance" ? null : value,
    });
    startTransition(() => {
      router.push(`/ara${qs}`);
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("label")}
      </span>
      <Select value={current} onValueChange={onValueChange}>
        <SelectTrigger
          aria-label={t("label")}
          aria-busy={isPending}
          className={cn(
            "h-10 w-auto rounded-xl border-border bg-card px-3 text-sm font-medium text-foreground transition-colors",
            "hover:border-brand/40",
          )}
        >
          <SelectValue placeholder={labels.relevance} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="end"
          sideOffset={6}
          className="min-w-[var(--radix-select-trigger-width)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {labels[opt]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
