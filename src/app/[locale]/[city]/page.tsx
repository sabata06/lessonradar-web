import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { LeadCTA } from "@/components/discovery/LeadCTA";
import { JsonLd } from "@/components/seo/JsonLd";

import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getCityBySlug, TR_CITIES } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES } from "@/lib/data/mock/disciplines";
import { getTeachersByCityAndDiscipline } from "@/lib/data/mock/teachers";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { pickLocalized, type SupportedLocale } from "@/lib/types";

interface RouteParams {
  locale: string;
  city: string;
}

export function generateStaticParams() {
  const params: { locale: string; city: string }[] = [];
  const priorityCities = TR_CITIES.filter((c) => c.isPriority);
  for (const locale of routing.locales) {
    for (const city of priorityCities) {
      params.push({ locale, city: city.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, city } = await params;
  const cityData = getCityBySlug(city);
  if (!cityData) return {};

  const cityName = locale === "tr" ? cityData.nameTr : cityData.nameEn;
  const title =
    locale === "tr"
      ? `${cityName} özel ders öğretmenleri`
      : `Private tutors in ${cityName}`;
  const description =
    locale === "tr"
      ? `${cityName}'de doğrulanmış özel ders öğretmenlerini branşa göre keşfet.`
      : `Discover verified private tutors in ${cityName} by subject.`;

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

  const cityData = getCityBySlug(city);
  if (!cityData) notFound();

  const typedLocale = locale as Locale;
  const cityName = typedLocale === "tr" ? cityData.nameTr : cityData.nameEn;

  // Discipline cards with live counts for this city
  const disciplineCards = MOCK_DISCIPLINES.map((d) => ({
    discipline: d,
    count: getTeachersByCityAndDiscipline(city, d.slug).length,
  }));

  const breadcrumbs = [
    { label: typedLocale === "tr" ? "Anasayfa" : "Home", path: "/" },
    { label: cityName, path: `/${city}` },
  ];

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
              ? `${cityName}'de özel ders öğretmenleri`
              : `Private tutors in ${cityName}`}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {typedLocale === "tr"
              ? `${cityName}'de doğrulanmış öğretmenleri branşa göre keşfet, ihtiyacına uygun olanı seç ve doğrudan iletişime geç.`
              : `Browse verified ${cityName} tutors by subject, pick the one that fits, and get in touch directly.`}
          </p>
        </header>
      </Container>

      <Container className="space-y-10 pb-16 sm:pb-20">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disciplineCards.map(({ discipline, count }) => (
            <li key={discipline.slug}>
              <Link
                href={`/${city}/${discipline.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {pickLocalized(discipline.name, typedLocale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {count > 0
                      ? typedLocale === "tr"
                        ? `${count} doğrulanmış öğretmen`
                        : `${count} verified tutors`
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

        <LeadCTA />
      </Container>

      <JsonLd
        data={breadcrumbJsonLd(
          typedLocale,
          breadcrumbs.map((b) => ({ name: b.label, path: b.path })),
        )}
      />
    </>
  );
}
