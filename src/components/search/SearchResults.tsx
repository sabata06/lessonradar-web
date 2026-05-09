import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TeacherCard } from "@/components/teacher/TeacherCard";
import type { SupportedLocale, TeacherProfile } from "@/lib/types";
import {
  buildSearchQuery,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search";
import type { RelaxableFilterKey } from "@/lib/search/teacher-search";

interface SearchResultsProps {
  teachers: TeacherProfile[];
  filters: TeacherSearchFilters;
  locale: SupportedLocale;
  nowIso: string;
  /**
   * When non-null, the original filter combination returned zero
   * results and we relaxed one filter to find these teachers. We show
   * a helpful banner instead of a dead-end empty state.
   */
  relaxedDrop?: RelaxableFilterKey | null;
}

/**
 * Result grid. When the search has been relaxed (e.g. we dropped the
 * "verified only" filter to surface results), we render an informative
 * notice above the grid so the user knows the list isn't a perfect
 * match. The empty state (true zero results, even after relaxation)
 * funnels to the lead form per hard-rule "no dead ends".
 */
export function SearchResults({
  teachers,
  filters,
  locale,
  nowIso,
  relaxedDrop = null,
}: SearchResultsProps) {
  const t = useTranslations("search.empty");
  const tRelax = useTranslations("search.relaxed");

  if (teachers.length === 0) {
    const leadParams = new URLSearchParams();
    if (filters.disciplineSlug) leadParams.set("discipline", filters.disciplineSlug);
    if (filters.citySlug) leadParams.set("city", filters.citySlug);
    if (filters.districtSlug) leadParams.set("district", filters.districtSlug);
    const leadHref =
      leadParams.toString().length > 0
        ? `/ders-talebi?${leadParams.toString()}`
        : `/ders-talebi`;
    const clearHref = `/ara${buildSearchQuery({ q: filters.q })}`;

    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
        <span
          aria-hidden
          className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <HugeiconsIcon icon={Search01Icon} size={22} strokeWidth={2} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 gap-2 rounded-2xl bg-action px-5 text-action-foreground shadow-action hover:bg-action-hover"
          >
            <Link href={leadHref}>{t("cta_lead")}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-2xl"
          >
            <Link href={clearHref}>{t("cta_clear")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {relaxedDrop && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-4 py-3"
        >
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={18}
            strokeWidth={2}
            aria-hidden
            className="mt-0.5 shrink-0 text-brand"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {tRelax("notice_title")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {tRelax(`drop.${relaxedDrop}`)}
            </p>
          </div>
        </div>
      )}

      <ul
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label={`${teachers.length} ${locale === "tr" ? "öğretmen" : "tutors"}`}
      >
        {teachers.map((teacher) => (
          <li key={teacher.id}>
            <TeacherCard
              teacher={teacher}
              locale={locale}
              nowIso={nowIso}
              disciplineSlug={filters.disciplineSlug}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
