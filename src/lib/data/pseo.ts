/**
 * pSEO landing data aggregation. Single entry point for the
 * /[city]/[discipline] route — keeps render-time concerns out of the page.
 *
 * Backend reads: `GET /api/marketplace/teachers/?city=<slug>&discipline=<slug>`
 * pulls the visible teachers for that combination; the city + discipline
 * master data still lives in the local mock since both are static seeds.
 *
 * Quality score is computed here so the same view-model that the page
 * uses can decide its own indexability — a pure function of the data we
 * just fetched.
 */
import type {
  City,
  District,
  MarketplaceDiscipline,
  SupportedLocale,
  TeacherProfile,
} from "@/lib/types";

import {
  fetchAllDisciplines,
  fetchCities,
  fetchTeacherList,
} from "@/lib/data/api/marketplace";
import { adaptDiscipline } from "@/lib/data/adapters/taxonomy";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import { locativeSuffix } from "@/lib/format";
import {
  computeQualityScore,
  type IndexPolicy,
  type QualityScoreBreakdown,
} from "@/lib/seo/quality-score";

export interface PSEOLandingData {
  city: City;
  discipline: MarketplaceDiscipline;
  districts: District[];
  teachers: TeacherProfile[];
  quality: QualityScoreBreakdown;
  indexPolicy: IndexPolicy;
  stats: {
    verifiedCount: number;
    totalCount: number;
    minHourly: number | null;
    maxHourly: number | null;
    medianResponseMinutes: number | null;
  };
}

export async function getPSEOLandingData(
  citySlug: string,
  disciplineSlug: string,
): Promise<PSEOLandingData | null> {
  // Three independent backend reads, all ISR-cached for 24h. The cities
  // + disciplines payloads are shared across all pSEO routes for the
  // same build, so the second + third fetches typically resolve from
  // Next's data cache without a network hop.
  const [list, citiesEnvelope, disciplinesEnvelope] = await Promise.all([
    fetchTeacherList({ city: citySlug, discipline: disciplineSlug }),
    fetchCities(),
    fetchAllDisciplines(),
  ]);

  const cityRow = citiesEnvelope.results.find((c) => c.slug === citySlug);
  const disciplineRow = disciplinesEnvelope.results.find(
    (d) => d.slug === disciplineSlug,
  );
  if (!cityRow || !disciplineRow) return null;

  const city: City = {
    slug: cityRow.slug,
    nameTr: cityRow.name_tr,
    nameEn: cityRow.name_en,
    isPriority: cityRow.is_priority,
  };
  const discipline: MarketplaceDiscipline = adaptDiscipline(disciplineRow);
  const districts: District[] = cityRow.districts.map((d) => ({
    slug: d.slug,
    citySlug: cityRow.slug,
    nameTr: d.name_tr,
    nameEn: d.name_en,
  }));

  const teachers = list.results.map((api) => adaptTeacher(api));

  const verifiedCount = teachers.filter((t) => t.trust.isVerified).length;
  const reviewedCount = teachers.filter((t) => t.trust.reviewCount > 0).length;

  // Hourly bounds for the SPECIFIC discipline (not the teacher's primary).
  // Adapter falls back to the profile-level hourly_rate when a specialty
  // has no per-discipline pricing, so this is always well-defined.
  let minHourly: number | null = null;
  let maxHourly: number | null = null;
  for (const t of teachers) {
    const pricing = t.disciplines.find(
      (d) => d.disciplineSlug === disciplineSlug,
    );
    if (!pricing) continue;
    if (pricing.hourlyMin > 0) {
      minHourly =
        minHourly === null ? pricing.hourlyMin : Math.min(minHourly, pricing.hourlyMin);
    }
    if (pricing.hourlyMax > 0) {
      maxHourly =
        maxHourly === null ? pricing.hourlyMax : Math.max(maxHourly, pricing.hourlyMax);
    }
  }

  const responses = teachers
    .map((t) => t.trust.responseTimeMinutes)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const medianResponseMinutes =
    responses.length === 0 ? null : responses[Math.floor(responses.length / 2)];

  const quality = computeQualityScore({
    teachers,
    hasUniqueIntro: true,
    hasPriceDataPoint: minHourly !== null,
    hasReviewSignal: reviewedCount > 0,
  });

  return {
    city,
    discipline,
    districts,
    teachers,
    quality,
    indexPolicy: quality.policy,
    stats: {
      verifiedCount,
      totalCount: teachers.length,
      minHourly,
      maxHourly,
      medianResponseMinutes,
    },
  };
}

/**
 * Locale-aware, deterministic intro paragraph generated from real data.
 * NOT AI-generated — it interpolates known facts so we can ship the page
 * before a human-written intro exists. Replace with editorial copy when
 * available.
 */
export function buildIntroParagraph(
  data: PSEOLandingData,
  locale: SupportedLocale,
): string {
  const cityName = locale === "tr" ? data.city.nameTr : data.city.nameEn;
  const disciplineName =
    locale === "tr" ? data.discipline.name.tr : data.discipline.name.en;
  const { totalCount, verifiedCount, minHourly, maxHourly, medianResponseMinutes } =
    data.stats;

  const cityLoc = `${cityName}'${locativeSuffix(cityName)}`;
  if (totalCount === 0) {
    return locale === "tr"
      ? `${cityLoc} ${disciplineName.toLowerCase()} kategorisinde henüz doğrulanmış öğretmenimiz yok. İlk ders talebini sen bırak, eşleşen öğretmenler sana ulaşsın.`
      : `We don't yet have verified ${disciplineName.toLowerCase()} tutors in ${cityName}. Be the first to post a request — matching tutors will reach out to you.`;
  }

  if (locale === "tr") {
    const parts = [
      `${cityLoc} ${disciplineName.toLowerCase()} arıyorsan, ${totalCount} öğretmen arasından ${verifiedCount} tanesi kimlik ve diploma doğrulamasından geçmiş durumda.`,
    ];
    if (minHourly !== null && maxHourly !== null) {
      parts.push(`Saat ücretleri ${minHourly}–${maxHourly} ₺ arasında değişiyor.`);
    }
    if (medianResponseMinutes !== null) {
      const mins = medianResponseMinutes;
      const responseLabel = mins < 60 ? `${mins} dk` : `${Math.round(mins / 60)} sa`;
      parts.push(`Ortalama yanıt süresi ${responseLabel}.`);
    }
    parts.push(
      "Profilleri karşılaştır, doğrudan iletişime geç ya da ders talebini bırak — uygun öğretmenler sana yazsın.",
    );
    return parts.join(" ");
  }

  const parts = [
    `Looking for ${disciplineName.toLowerCase()} in ${cityName}? You'll find ${totalCount} tutors here, ${verifiedCount} of whom have passed our identity and diploma checks.`,
  ];
  if (minHourly !== null && maxHourly !== null) {
    parts.push(`Hourly rates range from ₺${minHourly} to ₺${maxHourly}.`);
  }
  if (medianResponseMinutes !== null) {
    const mins = medianResponseMinutes;
    const responseLabel = mins < 60 ? `${mins} min` : `${Math.round(mins / 60)}h`;
    parts.push(`Median response time is ${responseLabel}.`);
  }
  parts.push(
    "Compare profiles, get in touch directly, or post a lesson request and let matching tutors reach out.",
  );
  return parts.join(" ");
}
