import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import {
  fetchAllDisciplines,
  fetchTaxonomyRoot,
} from "@/lib/data/api/marketplace";
import type {
  ApiDiscipline,
  ApiDomain,
} from "@/lib/types/api/marketplace";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildLocaleUrl } from "@/lib/seo/site";
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";

interface RouteParams {
  locale: string;
}

const ANCHOR_CITY_SLUG = "gaziantep";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "directory.subjects.meta" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/dersler",
    title: t("title"),
    description: t("description"),
  });
}

export default async function SubjectDirectoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "directory.subjects" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const [taxonomyRoot, disciplinesEnvelope] = await Promise.all([
    fetchTaxonomyRoot(),
    fetchAllDisciplines(),
  ]);

  const domainsBySlug = new Map<string, ApiDomain>(
    taxonomyRoot.domains.map((d) => [d.slug, d]),
  );
  const grouped = groupDisciplinesByDomain(
    disciplinesEnvelope.results,
    locale,
  );
  const orderedDomainSlugs = [...taxonomyRoot.domains]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => d.slug)
    .filter((slug) => grouped.has(slug));

  const breadcrumb = breadcrumbJsonLd(locale, [
    { name: tNav("home"), path: "/" },
    { name: t("breadcrumb"), path: "/dersler" },
  ]);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("h1"),
    url: buildLocaleUrl(locale, "/dersler"),
    numberOfItems: disciplinesEnvelope.results.length,
    itemListElement: disciplinesEnvelope.results.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: locale === "tr" ? d.name_tr : d.name_en,
      url: buildLocaleUrl(
        locale,
        `/${ANCHOR_CITY_SLUG}/${toPseoDisciplinePathSlug(d.slug)}`,
      ),
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

        <header className="mb-12 max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("h1")}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("subtitle", { count: disciplinesEnvelope.results.length })}
          </p>
        </header>

        <div className="space-y-12">
          {orderedDomainSlugs.map((domainSlug) => {
            const domain = domainsBySlug.get(domainSlug);
            const disciplines = grouped.get(domainSlug) ?? [];
            if (!domain || disciplines.length === 0) return null;
            const domainName = locale === "tr" ? domain.name_tr : domain.name_en;
            return (
              <section key={domainSlug}>
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {domainName}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {disciplines.length}
                  </span>
                </h2>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                  {disciplines.map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={`/${ANCHOR_CITY_SLUG}/${toPseoDisciplinePathSlug(d.slug)}`}
                        className="flex min-h-11 items-center rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {locale === "tr" ? d.name_tr : d.name_en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Container>
    </>
  );
}

function groupDisciplinesByDomain(
  disciplines: ApiDiscipline[],
  locale: Locale,
): Map<string, ApiDiscipline[]> {
  const collator = new Intl.Collator(locale === "tr" ? "tr" : "en", {
    sensitivity: "base",
  });
  const grouped = new Map<string, ApiDiscipline[]>();
  for (const d of disciplines) {
    const slug = d.domain.slug;
    const list = grouped.get(slug);
    if (list) list.push(d);
    else grouped.set(slug, [d]);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => {
      const an = locale === "tr" ? a.name_tr : a.name_en;
      const bn = locale === "tr" ? b.name_tr : b.name_en;
      return collator.compare(an, bn);
    });
  }
  return grouped;
}
