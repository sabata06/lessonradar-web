import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { DisciplineQuickChips } from "@/components/search/DisciplineQuickChips";
import { ResultsSection } from "@/components/search/ResultsSection";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchFilterSheet } from "@/components/search/SearchFilterSheet";
import { SearchHeader } from "@/components/search/SearchHeader";
import { SearchSkeletonGrid } from "@/components/search/SearchSkeletonGrid";
import { SearchSortSelect } from "@/components/search/SearchSortSelect";

import { routing, type Locale } from "@/i18n/routing";
import { fetchAllDisciplines, fetchCities, fetchTaxonomyRoot } from "@/lib/data/api/marketplace";
import { adaptDiscipline, adaptDomain } from "@/lib/data/adapters/taxonomy";
import {
  countAppliedFilters,
  parseSearchParams,
} from "@/lib/search/teacher-search";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type {
  City,
  District,
  MarketplaceDiscipline,
  MarketplaceDomain,
  SupportedLocale,
} from "@/lib/types";

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

  // Backend taxonomy + cities. Each fetch is ISR-cached for 24h
  // (`fetchAllDisciplines`, `fetchCities`, `fetchTaxonomyRoot`), so the
  // three parallel awaits hit the network at most once per day per route.
  const [taxonomyRoot, allDisciplinesEnvelope, citiesEnvelope] =
    await Promise.all([fetchTaxonomyRoot(), fetchAllDisciplines(), fetchCities()]);

  const domains: MarketplaceDomain[] = taxonomyRoot.domains.map(adaptDomain);
  const disciplines: MarketplaceDiscipline[] =
    allDisciplinesEnvelope.results.map(adaptDiscipline);
  const featuredDisciplines: MarketplaceDiscipline[] =
    taxonomyRoot.featured_disciplines.map(adaptDiscipline);

  const cities: City[] = citiesEnvelope.results.map((c) => ({
    slug: c.slug,
    nameTr: c.name_tr,
    nameEn: c.name_en,
    isPriority: c.is_priority,
  }));
  const districts: District[] = citiesEnvelope.results.flatMap((c) =>
    c.districts.map((d) => ({
      slug: d.slug,
      citySlug: c.slug,
      nameTr: d.name_tr,
      nameEn: d.name_en,
    })),
  );

  const knownCitySlugs = new Set(cities.map((c) => c.slug));
  const knownDistrictSlugs = new Set(districts.map((d) => d.slug));
  const knownDisciplineSlugs = new Set(disciplines.map((d) => d.slug));

  const filters = parseSearchParams(
    sp,
    knownCitySlugs,
    knownDistrictSlugs,
    knownDisciplineSlugs,
  );
  const appliedFilterCount = countAppliedFilters(filters);

  // `key` ties the Suspense boundary to the active query — when filters
  // change, React unmounts the resolved children and shows the skeleton
  // again instead of holding the old result frozen behind a transition.
  const suspenseKey = JSON.stringify(filters);

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
            domains={domains}
            disciplines={disciplines}
            cities={cities}
            districts={districts}
            locale={supportedLocale}
          />
        </aside>

        <div className="space-y-5">
          <SearchHeader filters={filters} />

          <DisciplineQuickChips
            filters={filters}
            disciplines={featuredDisciplines}
            locale={supportedLocale}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchFilterSheet appliedFilterCount={appliedFilterCount}>
              <SearchFilters
                filters={filters}
                domains={domains}
                disciplines={disciplines}
                cities={cities}
                districts={districts}
                locale={supportedLocale}
                compact
              />
            </SearchFilterSheet>
            <SearchSortSelect filters={filters} />
          </div>

          <Suspense key={suspenseKey} fallback={<SearchSkeletonGrid />}>
            <ResultsSection
              filters={filters}
              locale={supportedLocale}
              nowIso={nowIso}
              cities={cities}
              districts={districts}
              disciplines={disciplines}
            />
          </Suspense>

          <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {t("noindex_notice")}
          </p>
        </div>
      </Container>
    </>
  );
}
