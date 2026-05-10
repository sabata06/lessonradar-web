import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { ListingStats } from "@/components/discovery/ListingStats";
import { DistrictChips } from "@/components/discovery/DistrictChips";
import { EmptyLeadCollection } from "@/components/discovery/EmptyLeadCollection";
import { RelatedLinks } from "@/components/discovery/RelatedLinks";
import { LeadCTA } from "@/components/discovery/LeadCTA";
import { TeacherCard } from "@/components/teacher/TeacherCard";
import { JsonLd } from "@/components/seo/JsonLd";

import { routing, type Locale } from "@/i18n/routing";
import {
  fetchAllDisciplines,
  fetchCities,
} from "@/lib/data/api/marketplace";
import { adaptDiscipline } from "@/lib/data/adapters/taxonomy";
import { buildIntroParagraph, getPSEOLandingData } from "@/lib/data/pseo";
import type { City, MarketplaceDiscipline } from "@/lib/types";
import { locativeSuffix } from "@/lib/format";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";
import {
  breadcrumbJsonLd,
  itemListTeachersJsonLd,
} from "@/lib/seo/jsonld";
import { pickLocalized, type SupportedLocale } from "@/lib/types";

interface RouteParams {
  locale: string;
  city: string;
  discipline: string;
}

/**
 * Pre-render priority cities × featured disciplines.
 * Other combos build on demand (ISR-on-first-request).
 *
 * Async because cities + featured disciplines come from the live
 * backend taxonomy now. Both fetches are ISR-cached so the build
 * picks up taxonomy changes without redeploy lag.
 */
export async function generateStaticParams() {
  const params: { locale: string; city: string; discipline: string }[] = [];
  const [citiesEnvelope, taxonomyDisciplines] = await Promise.all([
    fetchCities(),
    fetchAllDisciplines(),
  ]);
  const priorityCities = citiesEnvelope.results.filter((c) => c.is_priority);
  const featuredDisciplines = taxonomyDisciplines.results.filter(
    (d) => d.is_featured,
  );
  for (const locale of routing.locales) {
    for (const city of priorityCities) {
      for (const discipline of featuredDisciplines) {
        params.push({
          locale,
          city: city.slug,
          discipline: toPseoDisciplinePathSlug(discipline.slug),
        });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, city, discipline } = await params;
  const data = await getPSEOLandingData(city, discipline);
  if (!data) return {};

  const cityName = locale === "tr" ? data.city.nameTr : data.city.nameEn;
  const disciplineName = pickLocalized(data.discipline.name, locale as SupportedLocale);
  const path = `/${city}/${data.canonicalDisciplineSlug}`;

  const title =
    locale === "tr"
      ? `${cityName} ${disciplineName} · Doğrulanmış öğretmenler`
      : `${disciplineName} in ${cityName} · Verified tutors`;

  const description =
    locale === "tr"
      ? `${cityName}'${locativeSuffix(cityName)} ${disciplineName.toLowerCase()} arıyor musun? ${data.stats.verifiedCount} doğrulanmış öğretmen, şeffaf fiyat, hızlı yanıt.`
      : `Looking for ${disciplineName.toLowerCase()} in ${cityName}? ${data.stats.verifiedCount} verified tutors, transparent pricing, fast response.`;

  return buildPageMetadata({
    locale: locale as Locale,
    path,
    title,
    description,
    noindex: data.indexPolicy !== "index",
  });
}

export default async function PSEOLandingPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, city, discipline } = await params;
  setRequestLocale(locale);

  const [data, citiesEnvelope, allDisciplinesEnvelope] = await Promise.all([
    getPSEOLandingData(city, discipline),
    fetchCities(),
    fetchAllDisciplines(),
  ]);
  if (!data) notFound();

  const typedLocale = locale as Locale;
  if (discipline !== data.canonicalDisciplineSlug) {
    redirect({
      href: `/${city}/${data.canonicalDisciplineSlug}`,
      locale: typedLocale,
    });
  }

  const allCities: City[] = citiesEnvelope.results.map((c) => ({
    slug: c.slug,
    nameTr: c.name_tr,
    nameEn: c.name_en,
    isPriority: c.is_priority,
  }));
  const allDisciplines: MarketplaceDiscipline[] =
    allDisciplinesEnvelope.results.map(adaptDiscipline);

  const nowIso = new Date().toISOString();

  const cityName = typedLocale === "tr" ? data.city.nameTr : data.city.nameEn;
  const disciplineName = pickLocalized(data.discipline.name, typedLocale);
  const intro = buildIntroParagraph(data, typedLocale);

  const breadcrumbs = [
    { label: typedLocale === "tr" ? "Anasayfa" : "Home", path: "/" },
    { label: cityName, path: `/${city}` },
    {
      label: disciplineName,
      path: `/${city}/${data.canonicalDisciplineSlug}`,
    },
  ];

  const showListing = data.teachers.length > 0;

  return (
    <>
      <Container className="pt-6 pb-4 sm:pt-8">
        <Breadcrumb
          items={breadcrumbs.map((b, i) => ({
            label: b.label,
            href: i < breadcrumbs.length - 1 ? b.path : undefined,
          }))}
        />
      </Container>

      <Container className="space-y-6 pb-10 sm:pb-12">
        <header className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {typedLocale === "tr" ? "Özel ders" : "Private lessons"}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {typedLocale === "tr"
              ? `${cityName}'${locativeSuffix(cityName)} ${disciplineName} Öğretmenleri`
              : `${disciplineName} Tutors in ${cityName}`}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {intro}
          </p>
        </header>

        {showListing && <ListingStats data={data} locale={typedLocale} />}

        {data.districts.length > 0 && (
          <DistrictChips
            districts={data.districts}
            citySlug={city}
            disciplineSlug={data.canonicalDisciplineSlug}
            locale={typedLocale}
          />
        )}
      </Container>

      <Container className="space-y-10 pb-16 sm:pb-20">
        {showListing ? (
          <section
            aria-label={
              typedLocale === "tr"
                ? "Doğrulanmış öğretmenler"
                : "Verified tutors"
            }
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {data.teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                locale={typedLocale}
                nowIso={nowIso}
                disciplineSlug={data.taxonomyDisciplineSlug}
              />
            ))}
          </section>
        ) : (
          <EmptyLeadCollection
            locale={typedLocale}
            cityName={cityName}
            disciplineName={disciplineName}
            citySlug={city}
            disciplineSlug={data.taxonomyDisciplineSlug}
          />
        )}

        <RelatedLinks
          locale={typedLocale}
          city={data.city}
          discipline={data.discipline}
          allCities={allCities}
          allDisciplines={allDisciplines}
        />

        <LeadCTA />
      </Container>

      <JsonLd
        data={[
          breadcrumbJsonLd(
            typedLocale,
            breadcrumbs.map((b) => ({ name: b.label, path: b.path })),
          ),
          ...(showListing
            ? [
                itemListTeachersJsonLd(
                  typedLocale,
                  `/${city}/${data.canonicalDisciplineSlug}`,
                  data.teachers,
                ),
              ]
            : []),
        ]}
      />
    </>
  );
}
