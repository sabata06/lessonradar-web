import { ActiveFilterChips } from "./ActiveFilterChips";
import { SearchResults } from "./SearchResults";
import { SearchSummary } from "./SearchSummary";

import {
  searchTeachersWithRelaxation,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search";
import type {
  City,
  District,
  MarketplaceDiscipline,
  SupportedLocale,
} from "@/lib/types";

interface ResultsSectionProps {
  filters: TeacherSearchFilters;
  locale: SupportedLocale;
  nowIso: string;
  cities: City[];
  districts: District[];
  disciplines: MarketplaceDiscipline[];
}

/**
 * Async server component holding all data-dependent UI: summary line,
 * active filter chips, relaxation notice, and the result grid. Wrapped
 * in <Suspense> at the page level so we can paint the input + filter
 * sidebar synchronously and stream the data here.
 *
 * Cities / districts / disciplines are passed in from the parent page
 * (which fetches them once from the backend taxonomy + cities API)
 * instead of re-importing the mock list — keeps the search page in sync
 * with the live taxonomy.
 */
export async function ResultsSection({
  filters,
  locale,
  nowIso,
  cities,
  districts,
  disciplines,
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
          cities={cities}
          districts={districts}
          disciplines={disciplines}
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
