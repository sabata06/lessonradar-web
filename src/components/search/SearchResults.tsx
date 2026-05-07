import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TeacherCard } from "@/components/teacher/TeacherCard";
import type { SupportedLocale, TeacherProfile } from "@/lib/types";
import {
  buildSearchQuery,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search";

interface SearchResultsProps {
  teachers: TeacherProfile[];
  filters: TeacherSearchFilters;
  locale: SupportedLocale;
  nowIso: string;
}

/**
 * Result grid. Empty state intentionally redirects to the lead form,
 * pre-filled with whichever filters the user already chose — that way
 * a "no match" outcome still funnels to the conversion goal (web lead
 * submission) rather than a dead end.
 */
export function SearchResults({
  teachers,
  filters,
  locale,
  nowIso,
}: SearchResultsProps) {
  const t = useTranslations("search.empty");

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
  );
}
