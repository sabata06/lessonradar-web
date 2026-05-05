import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { buildHreflangAlternates, buildLocaleUrl, SITE_NAME, SITE_URL } from "./site";

export interface PageMetaInput {
  locale: Locale;
  path: string;                  // localized path WITHOUT the /[locale] prefix, e.g. "/gaziantep/matematik-ozel-ders"
  title: string;
  description: string;
  noindex?: boolean;
  ogImage?: string;
  type?: "website" | "article" | "profile";
}

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const canonical = buildLocaleUrl(input.locale, input.path);
  const alternates = buildHreflangAlternates(input.path);
  const ogImage = input.ogImage ?? `${SITE_URL}/og/default.png`;

  return {
    title: input.title,
    description: input.description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical,
      languages: alternates,
    },
    robots: input.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: input.type ?? "website",
      url: canonical,
      siteName: SITE_NAME,
      locale: input.locale === "tr" ? "tr_TR" : "en_US",
      title: input.title,
      description: input.description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
  };
}
