import type { Locale } from "@/i18n/routing";
import type { City, MarketplaceDiscipline, TeacherProfile } from "@/lib/types";
import { pickLocalized } from "@/lib/types";
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
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

/**
 * ProfilePage wrapper around `Person`. ProfilePage is the type Google
 * recommends for individual user/professional profile pages — it lets the
 * crawler treat the URL as a profile (not a generic article) and unlocks
 * "rated profile" rich result enhancements when there is enough trust
 * signal.
 *
 * `knowsAbout` carries the discipline names so generative engines (AI
 * Overviews, ChatGPT, Perplexity) can answer "who teaches X in Y" without
 * us shipping a separate Service block per discipline.
 */
export function profilePageJsonLd(
  locale: Locale,
  teacher: TeacherProfile,
  disciplines: MarketplaceDiscipline[],
  city: City | undefined,
): JsonLd {
  const profileUrl = buildLocaleUrl(locale, `/ogretmen/${teacher.slug}`);
  const knowsAbout = disciplines.map((d) => pickLocalized(d.name, locale));
  const cityName = city
    ? locale === "tr"
      ? city.nameTr
      : city.nameEn
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    inLanguage: locale === "tr" ? "tr-TR" : "en-US",
    dateCreated: undefined,
    url: profileUrl,
    mainEntity: {
      "@type": "Person",
      name: teacher.fullName,
      description: teacher.bio,
      image: teacher.avatarUrl,
      url: profileUrl,
      jobTitle:
        locale === "tr"
          ? "Özel ders öğretmeni"
          : "Private tutor",
      knowsAbout: knowsAbout.length > 0 ? knowsAbout : undefined,
      address: {
        "@type": "PostalAddress",
        addressLocality: cityName ?? teacher.citySlug,
        addressCountry: "TR",
      },
      aggregateRating:
        teacher.trust.reviewCount > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: teacher.trust.ratingAverage,
              reviewCount: teacher.trust.reviewCount,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
