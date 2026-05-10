import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { fetchCities } from "@/lib/data/api/marketplace";
import type { ApiCity } from "@/lib/types/api/marketplace";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildLocaleUrl } from "@/lib/seo/site";

interface RouteParams {
  locale: string;
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "directory.cities.meta" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/sehirler",
    title: t("title"),
    description: t("description"),
  });
}

export default async function CityDirectoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "directory.cities" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const citiesEnvelope = await fetchCities();
  const cities = sortCitiesByLocale(citiesEnvelope.results, locale);

  const breadcrumb = breadcrumbJsonLd(locale, [
    { name: tNav("home"), path: "/" },
    { name: t("breadcrumb"), path: "/sehirler" },
  ]);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("h1"),
    url: buildLocaleUrl(locale, "/sehirler"),
    numberOfItems: cities.length,
    itemListElement: cities.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: locale === "tr" ? c.name_tr : c.name_en,
      url: buildLocaleUrl(locale, `/${c.slug}`),
    })),
  };

  return (
    <>
      <JsonLd data={[breadcrumb, itemList]} />
      <Container className="py-10 sm:py-14">
        <Breadcrumb
          items={[
            { label: tNav("home"), href: "/" },
            { label: t("breadcrumb") },
          ]}
          className="mb-8"
        />

        <header className="mb-10 max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("h1")}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("subtitle", { count: cities.length })}
          </p>
        </header>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="group flex min-h-11 items-center justify-between rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="flex items-center gap-2">
                  <span>{locale === "tr" ? c.name_tr : c.name_en}</span>
                  {c.is_priority ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-brand"
                      aria-label={t("priority_label")}
                    />
                  ) : null}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  strokeWidth={2}
                  className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

function sortCitiesByLocale(cities: ApiCity[], locale: Locale): ApiCity[] {
  const collator = new Intl.Collator(locale === "tr" ? "tr" : "en", {
    sensitivity: "base",
  });
  return [...cities].sort((a, b) => {
    const an = locale === "tr" ? a.name_tr : a.name_en;
    const bn = locale === "tr" ? b.name_tr : b.name_en;
    return collator.compare(an, bn);
  });
}
