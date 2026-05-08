import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { type Locale } from "@/i18n/routing";
import { getLegalDocument, isLegalSlug } from "@/lib/data/legal";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { legalWebPageJsonLd } from "@/lib/seo/legal-jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * Document body comes from the backend (privacy + terms) or a local
 * draft module (teacher-agreement). Pages are rendered on demand with
 * a 1-hour ISR window so changes published from Django admin propagate
 * within an hour without a redeploy.
 *
 * `generateStaticParams` is intentionally NOT exported: backend reachability
 * shouldn't be a build prerequisite. First request after revalidation does
 * the fetch; subsequent requests in the same window are served from cache.
 */
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLegalSlug(slug)) return {};

  const doc = await getLegalDocument(slug, locale as Locale);
  const tMeta = await getTranslations({
    locale,
    namespace: "legal.metadata",
  });
  const description = doc.intro ?? tMeta("description_fallback");

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/yasal/${slug}`,
    title: doc.title,
    description,
    noindex: !doc.indexable,
  });
}

export default async function LegalSlugPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLegalSlug(slug)) notFound();

  setRequestLocale(locale as Locale);

  const doc = await getLegalDocument(slug, locale as Locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  const description = doc.intro ?? doc.title;

  const jsonLd = [
    breadcrumbJsonLd(locale as Locale, [
      { name: t("breadcrumb_home"), path: "/" },
      { name: doc.title, path: `/yasal/${slug}` },
    ]),
    legalWebPageJsonLd({
      locale: locale as Locale,
      path: `/yasal/${slug}`,
      title: doc.title,
      description,
    }),
  ];

  return (
    <>
      <LegalLayout doc={doc} />
      <JsonLd data={jsonLd} />
    </>
  );
}
