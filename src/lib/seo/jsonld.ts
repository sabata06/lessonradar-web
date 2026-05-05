import type { Locale } from "@/i18n/routing";
import type { TeacherProfile } from "@/lib/types";
import { SITE_NAME, SITE_URL, buildLocaleUrl } from "./site";

export type JsonLd = Record<string, unknown>;

export function websiteJsonLd(locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: buildLocaleUrl(locale, "/"),
    inLanguage: locale === "tr" ? "tr-TR" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildLocaleUrl(locale, "/ara")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbCrumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(locale: Locale, crumbs: BreadcrumbCrumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: buildLocaleUrl(locale, c.path),
    })),
  };
}

export function itemListTeachersJsonLd(
  locale: Locale,
  pagePath: string,
  teachers: TeacherProfile[]
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: buildLocaleUrl(locale, pagePath),
    numberOfItems: teachers.length,
    itemListElement: teachers.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: buildLocaleUrl(locale, `/ogretmen/${t.slug}`),
      name: t.fullName,
    })),
  };
}

export function teacherPersonJsonLd(locale: Locale, t: TeacherProfile): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: t.fullName,
    description: t.bio,
    image: t.avatarUrl,
    url: buildLocaleUrl(locale, `/ogretmen/${t.slug}`),
    address: {
      "@type": "PostalAddress",
      addressLocality: t.citySlug,
      addressCountry: "TR",
    },
    aggregateRating:
      t.trust.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: t.trust.ratingAverage,
            reviewCount: t.trust.reviewCount,
          }
        : undefined,
  };
}
