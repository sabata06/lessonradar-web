import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import {
  fetchAllDisciplines,
  fetchCities,
  fetchTeacherList,
} from "@/lib/data/api/marketplace";
import { adaptDiscipline } from "@/lib/data/adapters/taxonomy";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import { computeProfileIndexPolicy } from "@/lib/seo/profile-quality";
import { computeQualityScore } from "@/lib/seo/quality-score";
import type { TeacherProfile } from "@/lib/types";
import { buildHreflangAlternates, buildLocaleUrl } from "@/lib/seo/site";

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Sitemap generator.
 *
 * Inclusion policy:
 *   - Public static routes (homepage, lead form, legal trust pages) are
 *     always included.
 *   - City landing pages are included for priority cities only.
 *   - pSEO city × discipline pages are included **only when** the
 *     quality-score policy resolves to "index" (score >= 80, real teacher
 *     supply, trust signals, content depth). Lower-scoring URLs render
 *     with `noindex` but are intentionally absent from the sitemap so we
 *     don't ask Google to spend crawl budget on weak pages.
 *
 * Implementation note: a single `/api/marketplace/teachers/` fetch
 * supplies the entire sitemap. Per-combination calls would balloon to
 * 80×N requests at build time; instead we group the response locally and
 * compute quality scores per `(city, discipline)` bucket here.
 *
 * Multilingual handling: each entry carries `alternates.languages` with
 * both `tr`/`en` URLs so Google understands the locale cluster without
 * shipping a separate per-locale sitemap file.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: SitemapEntry[] = [];

  // Static public routes
  // Legal pages: /yasal/gizlilik + /yasal/kosullar are E-E-A-T trust
  // signals (Quality Rater Guidelines). /yasal/kvkk redirects to gizlilik.
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

  // ── Single API fetch round-trip for all marketplace + taxonomy data ──────
  const [teacherList, citiesEnvelope, disciplinesEnvelope] = await Promise.all([
    fetchTeacherList(),
    fetchCities(),
    fetchAllDisciplines(),
  ]);
  const teachers = teacherList.results.map((api) => adaptTeacher(api));
  const cities = citiesEnvelope.results;
  const disciplines = disciplinesEnvelope.results.map(adaptDiscipline);

  // City landing pages — priority cities only
  for (const city of cities.filter((c) => c.is_priority)) {
    const path = `/${city.slug}`;
    entries.push({
      url: buildLocaleUrl(routing.defaultLocale, path),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: { languages: buildHreflangAlternates(path) },
    });
  }

  // pSEO city × discipline — gated by quality score, computed once per bucket.
  const cityDisciplineBuckets = groupByCityDiscipline(teachers);
  for (const city of cities) {
    for (const discipline of disciplines) {
      const bucket = cityDisciplineBuckets.get(
        `${city.slug}|${discipline.slug}`,
      ) ?? [];
      const minHourly = minPerDiscipline(bucket, discipline.slug);
      const reviewedCount = bucket.filter((t) => t.trust.reviewCount > 0).length;
      const quality = computeQualityScore({
        teachers: bucket,
        hasUniqueIntro: true,
        hasPriceDataPoint: minHourly !== null,
        hasReviewSignal: reviewedCount > 0,
      });
      if (quality.policy !== "index") continue;

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
  for (const teacher of teachers) {
    if (computeProfileIndexPolicy(teacher).policy !== "index") continue;
    const path = `/ogretmen/${teacher.slug}`;
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

function groupByCityDiscipline(
  teachers: TeacherProfile[],
): Map<string, TeacherProfile[]> {
  const buckets = new Map<string, TeacherProfile[]>();
  for (const teacher of teachers) {
    if (!teacher.citySlug) continue;
    for (const pricing of teacher.disciplines) {
      const key = `${teacher.citySlug}|${pricing.disciplineSlug}`;
      const list = buckets.get(key);
      if (list) {
        if (!list.includes(teacher)) list.push(teacher);
      } else {
        buckets.set(key, [teacher]);
      }
    }
  }
  return buckets;
}

function minPerDiscipline(
  bucket: TeacherProfile[],
  disciplineSlug: string,
): number | null {
  let min: number | null = null;
  for (const t of bucket) {
    const pricing = t.disciplines.find(
      (d) => d.disciplineSlug === disciplineSlug,
    );
    if (!pricing || pricing.hourlyMin <= 0) continue;
    min = min === null ? pricing.hourlyMin : Math.min(min, pricing.hourlyMin);
  }
  return min;
}

// `force-static` with the API call inside is fine: Next will execute
// this once per build (or on revalidation tick), cache the result, and
// the underlying `fetchTeacherList` already opts into `force-cache` +
// `revalidate=600` for its own ISR window.
export const dynamic = "force-static";
