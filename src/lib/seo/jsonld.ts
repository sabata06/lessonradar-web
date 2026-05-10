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

/**
 * `Service` + nested `AggregateOffer` for pSEO city × discipline pages.
 * Tells Google + AI Overviews: "this URL is the canonical service offering
 * for {discipline} private tutoring in {city}, with N teacher offerings
 * priced between X and Y TRY." Strong signal for shopping/price-related
 * SERP features and AI citations.
 *
 * `lowPrice` / `highPrice` MUST come from real teacher data — never invent
 * a range. `priceCurrency` is "TRY" for the launch market; revisit if/when
 * we serve other currencies.
 */
export function pseoServiceOfferJsonLd(args: {
  locale: Locale;
  pagePath: string;
  cityName: string;
  disciplineName: string;
  lowPrice: number;
  highPrice: number;
  offerCount: number;
}): JsonLd {
  const {
    locale,
    pagePath,
    cityName,
    disciplineName,
    lowPrice,
    highPrice,
    offerCount,
  } = args;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType:
      locale === "tr" ? "Özel ders" : "Private tutoring",
    name:
      locale === "tr"
        ? `${disciplineName} Özel Ders · ${cityName}`
        : `${disciplineName} Private Tutoring · ${cityName}`,
    category: disciplineName,
    url: buildLocaleUrl(locale, pagePath),
    areaServed: {
      "@type": "City",
      name: cityName,
      address: {
        "@type": "PostalAddress",
        addressLocality: cityName,
        addressCountry: "TR",
      },
    },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "TRY",
      lowPrice,
      highPrice,
      offerCount,
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * `FAQPage` schema. Per project SEO Rules: "FAQ content can help users, but
 * FAQ schema should be selective and policy-aware." Callers MUST only emit
 * this for pages with index policy = `index` (real teacher supply, quality
 * score >= 80). Emitting on weak pages = thin content penalty risk.
 */
export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
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
