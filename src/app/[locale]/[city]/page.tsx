import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, MapsIcon } from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { LeadCTA } from "@/components/discovery/LeadCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { TeacherCard } from "@/components/teacher/TeacherCard";

import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  fetchAllDisciplines,
  fetchCities,
  fetchTeacherList,
} from "@/lib/data/api/marketplace";
import { adaptDiscipline } from "@/lib/data/adapters/taxonomy";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import type { ApiCity } from "@/lib/types/api/marketplace";
import { locativeSuffix } from "@/lib/format";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildLocaleUrl } from "@/lib/seo/site";
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";
import { pickLocalized, type SupportedLocale, type TeacherProfile } from "@/lib/types";

interface RouteParams {
  locale: string;
  city: string;
}

const TOP_TEACHERS_LIMIT = 6;

export async function generateStaticParams() {
  const params: { locale: string; city: string }[] = [];
  const cities = await fetchCities();
  const priorityCities = cities.results.filter((c) => c.is_priority);
  for (const locale of routing.locales) {
    for (const city of priorityCities) {
      params.push({ locale, city: city.slug });
    }
  }
  return params;
}

async function findCity(citySlug: string): Promise<ApiCity | null> {
  const cities = await fetchCities();
  return cities.results.find((c) => c.slug === citySlug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, city } = await params;
  const cityRow = await findCity(city);
  if (!cityRow) return {};

  const cityName = locale === "tr" ? cityRow.name_tr : cityRow.name_en;
  const title =
    locale === "tr"
      ? `${cityName} özel ders öğretmenleri`
      : `Private tutors in ${cityName}`;
  const description =
    locale === "tr"
      ? `${cityName}'${locativeSuffix(cityName)} doğrulanmış özel ders öğretmenlerini branşa ve ilçeye göre keşfet, ihtiyacına uygun olanı seç.`
      : `Discover verified private tutors in ${cityName} by subject and district.`;

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/${city}`,
    title,
    description,
  });
}

export default async function CityLandingPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, city } = await params;
  setRequestLocale(locale);

  // Three parallel reads — all ISR-cached, so this is cheap on a warm
  // build. Cities + disciplines feed the discipline cards + breadcrumbs;
  // the teacher list drives the top-teacher row and stats line.
  const [cityList, citiesEnvelope, disciplinesEnvelope] = await Promise.all([
    fetchTeacherList({ city }),
    fetchCities(),
    fetchAllDisciplines(),
  ]);

  const cityRow = citiesEnvelope.results.find((c) => c.slug === city);
  if (!cityRow) notFound();

  const typedLocale = locale as Locale;
  const supportedLocale = locale as SupportedLocale;
  const nowIso = new Date().toISOString();
  const cityName = typedLocale === "tr" ? cityRow.name_tr : cityRow.name_en;

  const cityTeachers = cityList.results.map(adaptTeacher);
  const topTeachers = rankTopTeachers(cityTeachers).slice(0, TOP_TEACHERS_LIMIT);

  const disciplines = disciplinesEnvelope.results.map(adaptDiscipline);
  // Backend taxonomy carries 50+ disciplines; the city page surfaces the
  // top 12 by teacher count plus any featured discipline that lacks
  // teachers (so the city always shows the curated quick picks even when
  // supply is still thin). Sort by (count desc, featured first, name).
  const disciplineCards = disciplines
    .map((d) => ({
      discipline: d,
      count: cityTeachers.filter((t) =>
        t.disciplines.some((dp) => dp.disciplineSlug === d.slug),
      ).length,
    }))
    .filter((entry) => entry.count > 0 || entry.discipline.isFeatured)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.discipline.isFeatured !== b.discipline.isFeatured) {
        return a.discipline.isFeatured ? -1 : 1;
      }
      return 0;
    })
    .slice(0, 12);

  const districts = cityRow.districts.map((d) => ({
    slug: d.slug,
    citySlug: cityRow.slug,
    nameTr: d.name_tr,
    nameEn: d.name_en,
  }));

  // Stats line under hero — kept boring and quantitative on purpose
  // (Calm Editorial). We explicitly avoid superlatives like "best" or
  // "elite" because the data here is just a head-count + median.
  const verifiedCount = cityTeachers.filter((t) => t.trust.isVerified).length;
  const totalCount = cityTeachers.length;
  const medianResponseMinutes = computeMedianResponse(cityTeachers);

  const breadcrumbs = [
    { label: typedLocale === "tr" ? "Anasayfa" : "Home", path: "/" },
    { label: cityName, path: `/${city}` },
  ];

  const itemListJsonLd =
    topTeachers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          url: buildLocaleUrl(typedLocale, `/${city}`),
          numberOfItems: topTeachers.length,
          itemListElement: topTeachers.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: buildLocaleUrl(typedLocale, `/ogretmen/${t.slug}`),
            name: t.fullName,
          })),
        }
      : null;

  const introCopy = buildIntroCopy({
    locale: typedLocale,
    cityName,
    totalCount,
    verifiedCount,
    medianResponseMinutes,
  });

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
            {typedLocale === "tr" ? "Şehir" : "City"}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {typedLocale === "tr"
              ? `${cityName}'${locativeSuffix(cityName)} Özel Ders Öğretmenleri`
              : `Private Tutors in ${cityName}`}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {introCopy}
          </p>
        </header>
      </Container>

      {topTeachers.length > 0 && (
        <Container className="space-y-5 pb-12 sm:pb-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {typedLocale === "tr"
                ? `${cityName}'in öne çıkan öğretmenleri`
                : `Featured tutors in ${cityName}`}
            </h2>
            <Link
              href={`/ara?city=${city}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              {typedLocale === "tr" ? "Tümünü gör" : "See all"}
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topTeachers.map((t) => (
              <li key={t.id}>
                <TeacherCard
                  teacher={t}
                  locale={supportedLocale}
                  nowIso={nowIso}
                  variant="compact"
                />
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="space-y-5 pb-12 sm:pb-16">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {typedLocale === "tr" ? "Popüler branşlar" : "Popular subjects"}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disciplineCards.map(({ discipline, count }) => (
            <li key={discipline.slug}>
              <Link
                href={`/${city}/${toPseoDisciplinePathSlug(discipline.slug)}`}
                className="group flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {pickLocalized(discipline.name, typedLocale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {count > 0
                      ? typedLocale === "tr"
                        ? `${count} öğretmen`
                        : `${count} tutors`
                      : typedLocale === "tr"
                        ? "Talep bırak, öğretmenler ulaşsın"
                        : "Post a request — tutors will reach out"}
                  </p>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={2}
                  className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {districts.length > 0 && (
        <Container className="space-y-4 pb-12 sm:pb-16">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {typedLocale === "tr"
              ? `${cityName} ilçeleri`
              : `${cityName} districts`}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {districts.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/ara?city=${city}&district=${d.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:border-brand-soft hover:bg-brand-soft hover:text-brand-soft-foreground"
                >
                  <HugeiconsIcon icon={MapsIcon} size={14} strokeWidth={2} />
                  {typedLocale === "tr" ? d.nameTr : d.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="pb-16 sm:pb-20">
        <LeadCTA />
      </Container>

      <JsonLd
        data={[
          breadcrumbJsonLd(
            typedLocale,
            breadcrumbs.map((b) => ({ name: b.label, path: b.path })),
          ),
          ...(itemListJsonLd ? [itemListJsonLd] : []),
        ]}
      />
    </>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function rankTopTeachers(teachers: TeacherProfile[]): TeacherProfile[] {
  return teachers.slice().sort((a, b) => {
    if (a.trust.isVerified !== b.trust.isVerified) {
      return a.trust.isVerified ? -1 : 1;
    }
    if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
    if (a.trust.reviewCount !== b.trust.reviewCount) {
      return b.trust.reviewCount - a.trust.reviewCount;
    }
    return b.trust.ratingAverage - a.trust.ratingAverage;
  });
}

function computeMedianResponse(teachers: TeacherProfile[]): number | null {
  const xs = teachers
    .map((t) => t.trust.responseTimeMinutes)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.floor(xs.length / 2)];
}

function buildIntroCopy(args: {
  locale: Locale;
  cityName: string;
  totalCount: number;
  verifiedCount: number;
  medianResponseMinutes: number | null;
}): string {
  const { locale, cityName, totalCount, verifiedCount, medianResponseMinutes } =
    args;
  const cityLoc = `${cityName}'${locativeSuffix(cityName)}`;
  if (totalCount === 0) {
    return locale === "tr"
      ? `${cityLoc} şu an aktif doğrulanmış öğretmenimiz yok. Talebini bırak, eşleşen öğretmenler sana ulaşsın.`
      : `No active verified tutors in ${cityName} just yet. Post a request — matching tutors will reach out to you.`;
  }
  const parts: string[] = [];
  if (locale === "tr") {
    parts.push(
      `${cityLoc} ${totalCount} öğretmen var; ${verifiedCount} tanesi kimlik ve diploma doğrulamasından geçti.`,
    );
    if (medianResponseMinutes !== null) {
      const label =
        medianResponseMinutes < 60
          ? `${medianResponseMinutes} dk`
          : `${Math.round(medianResponseMinutes / 60)} sa`;
      parts.push(`Ortalama yanıt süresi ${label}.`);
    }
    parts.push("Branşa veya ilçeye göre filtrele, doğrudan iletişime geç.");
  } else {
    parts.push(
      `${cityName} has ${totalCount} tutors; ${verifiedCount} have passed our identity and diploma checks.`,
    );
    if (medianResponseMinutes !== null) {
      const label =
        medianResponseMinutes < 60
          ? `${medianResponseMinutes} min`
          : `${Math.round(medianResponseMinutes / 60)}h`;
      parts.push(`Median response time is ${label}.`);
    }
    parts.push("Filter by subject or district and reach out directly.");
  }
  return parts.join(" ");
}
