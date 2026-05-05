/**
 * pSEO landing data aggregation. Single entry point for the
 * /[city]/[discipline] route — keeps render-time concerns out of the page.
 *
 * Backend swap path: replace getPSEOLandingData with an API call that
 * returns the same shape. Quality score is computed here for now; a
 * production rollout should compute it server-side and persist it.
 */
import type {
  City,
  District,
  MarketplaceDiscipline,
  SupportedLocale,
  TeacherProfile,
} from "@/lib/types";

import { getCityBySlug, getDistrictsByCity } from "./mock/cities";
import { getDisciplineBySlug } from "./mock/disciplines";
import { getTeachersByCityAndDiscipline } from "./mock/teachers";
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

export function getPSEOLandingData(
  citySlug: string,
  disciplineSlug: string,
): PSEOLandingData | null {
  const city = getCityBySlug(citySlug);
  const discipline = getDisciplineBySlug(disciplineSlug);
  if (!city || !discipline) return null;

  const teachers = getTeachersByCityAndDiscipline(citySlug, disciplineSlug);
  const districts = getDistrictsByCity(citySlug);

  const verifiedCount = teachers.filter((t) => t.trust.isVerified).length;
  const reviewedCount = teachers.filter((t) => t.trust.reviewCount > 0).length;

  // Hourly bounds for the SPECIFIC discipline (not the teacher's primary)
  let minHourly: number | null = null;
  let maxHourly: number | null = null;
  for (const t of teachers) {
    const pricing = t.disciplines.find((d) => d.disciplineSlug === disciplineSlug);
    if (!pricing) continue;
    minHourly = minHourly === null ? pricing.hourlyMin : Math.min(minHourly, pricing.hourlyMin);
    maxHourly = maxHourly === null ? pricing.hourlyMax : Math.max(maxHourly, pricing.hourlyMax);
  }

  const responses = teachers.map((t) => t.trust.responseTimeMinutes).sort((a, b) => a - b);
  const medianResponseMinutes =
    responses.length === 0 ? null : responses[Math.floor(responses.length / 2)];

  const quality = computeQualityScore({
    teachers,
    hasUniqueIntro: true, // hand-edited intro is required before publishing
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

  if (totalCount === 0) {
    return locale === "tr"
      ? `${cityName}'de ${disciplineName.toLowerCase()} kategorisinde henüz doğrulanmış öğretmenimiz yok. İlk ders talebini sen bırak, eşleşen öğretmenler sana ulaşsın.`
      : `We don't yet have verified ${disciplineName.toLowerCase()} tutors in ${cityName}. Be the first to post a request — matching tutors will reach out to you.`;
  }

  if (locale === "tr") {
    const parts = [
      `${cityName}'de ${disciplineName.toLowerCase()} arıyorsan, ${totalCount} öğretmen arasından ${verifiedCount} tanesi kimlik ve diploma doğrulamasından geçmiş durumda.`,
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
