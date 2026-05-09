import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { SearchHero } from "@/components/discovery/SearchHero";
import { SubjectChips } from "@/components/discovery/SubjectChips";
import { FeaturedTeachers } from "@/components/discovery/FeaturedTeachers";
import { TrustStrip } from "@/components/discovery/TrustStrip";
import { HowItWorks } from "@/components/discovery/HowItWorks";
import { PopularSearches } from "@/components/discovery/PopularSearches";
import { LeadCTA } from "@/components/discovery/LeadCTA";

import type { Locale } from "@/i18n/routing";
import {
  fetchAllDisciplines,
  fetchCities,
  fetchTaxonomyRoot,
  fetchTeacherList,
} from "@/lib/data/api/marketplace";
import { adaptDiscipline, adaptDomain } from "@/lib/data/adapters/taxonomy";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import type { City, MarketplaceDiscipline, MarketplaceDomain } from "@/lib/types";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home.hero");
  const typedLocale = locale as Locale;
  const nowIso = new Date().toISOString();

  // Four parallel reads — all ISR-cached for 24h, so the homepage keeps
  // a fast TTFB and the live taxonomy stays in sync without rebuild.
  const [taxonomyRoot, allDisciplinesEnvelope, citiesEnvelope, gaziantepList] =
    await Promise.all([
      fetchTaxonomyRoot(),
      fetchAllDisciplines(),
      fetchCities(),
      fetchTeacherList({ city: "gaziantep" }),
    ]);

  const domains: MarketplaceDomain[] = taxonomyRoot.domains.map(adaptDomain);
  const disciplines: MarketplaceDiscipline[] =
    allDisciplinesEnvelope.results.map(adaptDiscipline);
  // Subject carousel surfaces the full active catalog. The horizontal
  // scroll + chevron pagination handles the long list comfortably and
  // gives users a sense of the breadth on offer (matches the Superprof
  // pattern). Featured items naturally sort to the front via
  // `sort_order`, so they're still the first chips visible.
  const carouselDisciplines = [...disciplines].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  const cities: City[] = citiesEnvelope.results.map((c) => ({
    slug: c.slug,
    nameTr: c.name_tr,
    nameEn: c.name_en,
    isPriority: c.is_priority,
  }));

  const featured = gaziantepList.results
    .map(adaptTeacher)
    .sort((a, b) => {
      const score = (x: typeof a) =>
        (x.isPremium ? 2 : 0) +
        (x.trust.isVerified ? 1 : 0) +
        x.trust.ratingAverage / 5;
      return score(b) - score(a);
    })
    .slice(0, 3);

  return (
    <>
      {/* Hero — search + quick chips inside one focal block */}
      <section
        aria-label={t("title")}
        className="relative overflow-hidden border-b border-border/60"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, oklch(0.94 0.025 195 / 0.55) 0%, transparent 70%)," +
              "radial-gradient(50% 50% at 100% 100%, oklch(0.96 0.04 80 / 0.5) 0%, transparent 70%)",
          }}
        />
        <Container className="flex flex-col items-center py-12 text-center sm:py-16 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-success"
              style={{ boxShadow: "0 0 0 3px oklch(0.94 0.04 165)" }}
            />
            {t("kicker")}
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-10 w-full max-w-3xl">
            <SearchHero
              locale={typedLocale}
              domains={domains}
              disciplines={disciplines}
              cities={cities}
            />

            <div className="mt-6">
              <SubjectChips
                disciplines={carouselDisciplines}
                citySlug="gaziantep"
                locale={typedLocale}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Featured teachers */}
      <Container className="py-14 sm:py-20">
        <FeaturedTeachers
          locale={typedLocale}
          nowIso={nowIso}
          teachers={featured}
          seeAllHref="/gaziantep"
        />
      </Container>

      {/* Trust strip */}
      <Container className="py-14 sm:py-20">
        <TrustStrip />
      </Container>

      {/* How it works */}
      <section className="border-y border-border/60 bg-card/40">
        <Container className="py-14 sm:py-20">
          <HowItWorks />
        </Container>
      </section>

      {/* Popular searches (pSEO link grid) */}
      <Container className="py-14 sm:py-20">
        <PopularSearches
          locale={typedLocale}
          cities={cities}
          disciplines={disciplines}
        />
      </Container>

      {/* Lead CTA */}
      <Container className="pb-20">
        <LeadCTA />
      </Container>
    </>
  );
}
