import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { TR_CITIES } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES } from "@/lib/data/mock/disciplines";
import { getPSEOLandingData } from "@/lib/data/pseo";
import { getIndexableTeacherSlugs } from "@/lib/data/profile";
import { buildHreflangAlternates, buildLocaleUrl } from "@/lib/seo/site";

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Sitemap generator.
 *
 * Inclusion policy:
 *   - Public static routes (homepage, lead form) are always included.
 *   - City landing pages are included for priority cities only.
 *   - pSEO city × discipline pages are included **only when** the
 *     quality-score policy resolves to "index" (score >= 80, real teacher
 *     supply, trust signals, content depth). Lower-scoring URLs render
 *     with `noindex` but are intentionally absent from the sitemap so we
 *     don't ask Google to spend crawl budget on weak pages.
 *
 * Multilingual handling: each entry carries `alternates.languages` with
 * both `tr`/`en` URLs so Google understands the locale cluster without
 * us shipping a separate per-locale sitemap file.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: SitemapEntry[] = [];

  // Static public routes
  // Legal pages: /yasal/gizlilik + /yasal/kosullar are included as
  // E-E-A-T trust signals (Quality Rater Guidelines value Trust pages).
  // /yasal/kvkk redirects to /yasal/gizlilik so it stays out.
  // /yasal/ogretmen-sozlesmesi is excluded while it's a draft (noindex).
  const staticPaths: { path: string; priority: number; changeFrequency: SitemapEntry["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/ders-talebi", priority: 0.8, changeFrequency: "monthly" },
    { path: "/ogretmen-ol", priority: 0.7, changeFrequency: "monthly" },
    { path: "/yasal/gizlilik", priority: 0.3, changeFrequency: "monthly" },
    { path: "/yasal/kosullar", priority: 0.3, changeFrequency: "monthly" },
  ];

  for (const { path, priority, changeFrequency } of staticPaths) {
    entries.push({
      url: buildLocaleUrl(routing.defaultLocale, path),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: buildHreflangAlternates(path) },
    });
  }

  // City landing pages — priority cities only
  for (const city of TR_CITIES.filter((c) => c.isPriority)) {
    const path = `/${city.slug}`;
    entries.push({
      url: buildLocaleUrl(routing.defaultLocale, path),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: { languages: buildHreflangAlternates(path) },
    });
  }

  // pSEO city × discipline — gated by quality score
  for (const city of TR_CITIES) {
    for (const discipline of MOCK_DISCIPLINES) {
      const data = getPSEOLandingData(city.slug, discipline.slug);
      if (!data || data.indexPolicy !== "index") continue;

      const path = `/${city.slug}/${discipline.slug}`;
      entries.push({
        url: buildLocaleUrl(routing.defaultLocale, path),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.9,
        alternates: { languages: buildHreflangAlternates(path) },
      });
    }
  }

  // Teacher profiles — only verified, reviewed, complete profiles per
  // computeProfileIndexPolicy. Other profile URLs render with `noindex`
  // so they remain accessible to anyone with a direct link without
  // burning crawl budget.
  for (const slug of getIndexableTeacherSlugs()) {
    const path = `/ogretmen/${slug}`;
    entries.push({
      url: buildLocaleUrl(routing.defaultLocale, path),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: { languages: buildHreflangAlternates(path) },
    });
  }

  return entries;
}

// Hint Next that this route is fully static — depends only on mock data.
export const dynamic = "force-static";
