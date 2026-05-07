import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TeacherSearchFilters } from "@/lib/search/teacher-search";

interface SearchHeaderProps {
  filters: TeacherSearchFilters;
  resultCount: number;
}

/**
 * Top of the /ara route. A plain GET form so the URL becomes the source
 * of truth — bookmarkable, shareable, no client-side state to recover.
 *
 * Hidden inputs replay every other active filter so submitting the
 * search keyword preserves the filter sidebar selections.
 */
export function SearchHeader({ filters, resultCount }: SearchHeaderProps) {
  const t = useTranslations("search");

  const summary =
    resultCount === 0
      ? t("result.summary_zero")
      : resultCount === 1
        ? t("result.summary_one")
        : filters.q
          ? t("result.summary_query", { count: resultCount, q: filters.q })
          : t("result.summary_filters", { count: resultCount });

  return (
    <header className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          {t("kicker")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
      </div>

      <form
        method="get"
        action=""
        role="search"
        aria-label={t("input.label")}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        {/* Replay non-q filters as hidden inputs so they survive submit */}
        {filters.citySlug && (
          <input type="hidden" name="city" value={filters.citySlug} />
        )}
        {filters.districtSlug && (
          <input type="hidden" name="district" value={filters.districtSlug} />
        )}
        {filters.disciplineSlug && (
          <input type="hidden" name="discipline" value={filters.disciplineSlug} />
        )}
        {filters.modality && filters.modality !== "any" && (
          <input type="hidden" name="modality" value={filters.modality} />
        )}
        {filters.verifiedOnly && <input type="hidden" name="verified" value="1" />}
        {filters.sort && filters.sort !== "relevance" && (
          <input type="hidden" name="sort" value={filters.sort} />
        )}

        <label className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card pl-3 pr-1.5 py-1 shadow-card focus-within:ring-2 focus-within:ring-ring/40">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            strokeWidth={1.7}
            aria-hidden
            className="text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t("input.placeholder")}
            maxLength={120}
            className="h-11 flex-1 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
            aria-label={t("input.label")}
          />
        </label>
        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2 rounded-2xl bg-action px-5 text-action-foreground shadow-action hover:bg-action-hover sm:w-auto"
        >
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={2} aria-hidden />
          <span className="font-semibold">{t("input.submit")}</span>
        </Button>
      </form>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {summary}
      </p>
    </header>
  );
}
