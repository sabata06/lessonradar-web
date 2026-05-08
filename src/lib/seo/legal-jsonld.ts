import type { Locale } from "@/i18n/routing";
import type { JsonLd } from "./jsonld";
import { SITE_NAME, SITE_URL, buildLocaleUrl } from "./site";

export interface LegalWebPageInput {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  inLanguage?: string;
}

/**
 * `WebPage` JSON-LD for static legal pages. Pairs with `BreadcrumbList`
 * (see `breadcrumbJsonLd` in `./jsonld`). We deliberately do NOT use
 * `Article` for these — they're not editorial content, they're terms.
 *
 * `isPartOf` ties the page back to the `WebSite` graph already declared
 * in the locale layout, so search engines can stitch the property tree
 * together.
 */
export function legalWebPageJsonLd(input: LegalWebPageInput): JsonLd {
  const url = buildLocaleUrl(input.locale, input.path);
  const lang =
    input.inLanguage ?? (input.locale === "tr" ? "tr-TR" : "en-US");

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url,
    name: input.title,
    description: input.description,
    inLanguage: lang,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
