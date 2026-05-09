import { useTranslations } from "next-intl";

import type { TeacherSearchFilters } from "@/lib/search/teacher-search";

interface SearchSummaryProps {
  filters: TeacherSearchFilters;
  resultCount: number;
  /**
   * Total count returned by the backend BEFORE local district +
   * verified refinement. When this is larger than `resultCount` AND
   * one of those local filters is active, we surface a small note so
   * users understand why the count shrank.
   */
  totalBeforeFilter?: number;
}

/**
 * Small live-region summary line shown right above the result grid.
 * Lives in a Suspense child so it streams with the data and doesn't
 * block the input above from painting.
 */
export function SearchSummary({
  filters,
  resultCount,
  totalBeforeFilter,
}: SearchSummaryProps) {
  const t = useTranslations("search.result");

  const summary =
    resultCount === 0
      ? t("summary_zero")
      : resultCount === 1
        ? t("summary_one")
        : filters.q
          ? t("summary_query", { count: resultCount, q: filters.q })
          : t("summary_filters", { count: resultCount });

  const localDrop =
    typeof totalBeforeFilter === "number" &&
    totalBeforeFilter > resultCount &&
    (filters.verifiedOnly === true || Boolean(filters.districtSlug))
      ? totalBeforeFilter - resultCount
      : 0;
  const localFilterLabel = filters.verifiedOnly
    ? t("local_filter_verified")
    : t("local_filter_district");

  return (
    <div className="space-y-1" aria-live="polite">
      <p className="text-sm text-muted-foreground">{summary}</p>
      {localDrop > 0 && (
        <p className="text-xs italic text-muted-foreground">
          {t("local_filter_note", { count: localDrop, filter: localFilterLabel })}
        </p>
      )}
    </div>
  );
}
