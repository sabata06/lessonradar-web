import { ActiveFilterChips } from "./ActiveFilterChips";
import { SearchResults } from "./SearchResults";
import { SearchSummary } from "./SearchSummary";

import { TR_CITIES, TR_DISTRICTS } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES } from "@/lib/data/mock/disciplines";
import {
  searchTeachersWithRelaxation,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search";
import type { SupportedLocale } from "@/lib/types";

interface ResultsSectionProps {
  filters: TeacherSearchFilters;
  locale: SupportedLocale;
  nowIso: string;
}

/**
 * Async server component holding all data-dependent UI: summary line,
 * active filter chips, relaxation notice, and the result grid. Wrapped
 * in <Suspense> at the page level so we can paint the input + filter
 * sidebar synchronously and stream the data here.
 */
export async function ResultsSection({
  filters,
  locale,
  nowIso,
}: ResultsSectionProps) {
  const { result, relaxedDrop } = await searchTeachersWithRelaxation(
    filters,
    locale,
  );

  return (
    <>
      <SearchSummary
        filters={filters}
        resultCount={result.teachers.length}
        totalBeforeFilter={result.totalBeforeFilter}
      />

      {result.appliedFilterCount > 0 && (
        <ActiveFilterChips
          filters={filters}
          cities={TR_CITIES}
          districts={TR_DISTRICTS}
          disciplines={MOCK_DISCIPLINES}
          locale={locale}
        />
      )}

      <SearchResults
        teachers={result.teachers}
        filters={filters}
        locale={locale}
        nowIso={nowIso}
        relaxedDrop={relaxedDrop}
      />
    </>
  );
}
