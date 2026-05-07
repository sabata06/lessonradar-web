import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchFilterSheet } from "@/components/search/SearchFilterSheet";
import { SearchHeader } from "@/components/search/SearchHeader";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchSortSelect } from "@/components/search/SearchSortSelect";

import { routing, type Locale } from "@/i18n/routing";
import { TR_CITIES, TR_DISTRICTS } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES, MOCK_DOMAINS } from "@/lib/data/mock/disciplines";
import {
  parseSearchParams,
  searchTeachers,
} from "@/lib/search/teacher-search";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { SupportedLocale } from "@/lib/types";

interface RouteParams {
  locale: string;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

// Search route is `dynamic` — the URL is the source of truth, every
// combination is unique, and `noindex,follow` keeps Google out (filter
// URL hard rule). robots.ts already disallows the `/<locale>/ara` paths,
// so this is a defense-in-depth pair: server-rendered `noindex` plus a
// blanket robots block.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search.meta" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/ara",
    title: t("title"),
    description: t("description"),
    noindex: true,
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "search" });

  const typedLocale = locale as Locale;
  const supportedLocale = locale as SupportedLocale;
  const nowIso = new Date().toISOString();

  const knownCitySlugs = new Set(TR_CITIES.map((c) => c.slug));
  const knownDistrictSlugs = new Set(TR_DISTRICTS.map((d) => d.slug));

  const filters = parseSearchParams(sp, knownCitySlugs, knownDistrictSlugs);
  const result = searchTeachers(filters, supportedLocale);

  return (
    <>
      <Container className="pt-6 pb-4 sm:pt-8">
        <Breadcrumb
          items={[
            { label: typedLocale === "tr" ? "Anasayfa" : "Home", href: "/" },
            { label: t("breadcrumb") },
          ]}
        />
      </Container>

      <Container className="grid gap-8 pb-16 lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-10 lg:pb-20">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <SearchFilters
            filters={filters}
            domains={MOCK_DOMAINS}
            disciplines={MOCK_DISCIPLINES}
            cities={TR_CITIES}
            districts={TR_DISTRICTS}
            locale={supportedLocale}
          />
        </aside>

        <div className="space-y-5">
          <SearchHeader filters={filters} resultCount={result.teachers.length} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchFilterSheet appliedFilterCount={result.appliedFilterCount}>
              <SearchFilters
                filters={filters}
                domains={MOCK_DOMAINS}
                disciplines={MOCK_DISCIPLINES}
                cities={TR_CITIES}
                districts={TR_DISTRICTS}
                locale={supportedLocale}
                compact
              />
            </SearchFilterSheet>
            <SearchSortSelect filters={filters} />
          </div>

          {result.appliedFilterCount > 0 && (
            <ActiveFilterChips
              filters={filters}
              cities={TR_CITIES}
              districts={TR_DISTRICTS}
              disciplines={MOCK_DISCIPLINES}
              locale={supportedLocale}
            />
          )}

          <SearchResults
            teachers={result.teachers}
            filters={filters}
            locale={supportedLocale}
            nowIso={nowIso}
          />

          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {t("noindex_notice")}
          </p>
        </div>
      </Container>
    </>
  );
}
