/**
 * Teacher profile view-model aggregator. Mirrors the pSEO landing pattern:
 * the page renders from this single shape, and the backend swap path is
 * "replace getTeacherProfileData with an API call returning the same data".
 *
 * Computes related teachers (same city, different teacher) and similar
 * disciplines (other featured disciplines this teacher does not yet teach,
 * useful for "related links" SEO crawl-paths).
 */
import type {
  City,
  District,
  MarketplaceDiscipline,
  TeacherDisciplineSummary,
  TeacherProfile,
} from "@/lib/types";

import { getCityBySlug, getDistrictBySlug } from "./mock/cities";
import { getDisciplineBySlug, MOCK_DISCIPLINES } from "./mock/disciplines";
import { getTeacherBySlug, MOCK_TEACHERS } from "./mock/teachers";
import {
  computeProfileIndexPolicy,
  type ProfileIndexBreakdown,
} from "@/lib/seo/profile-quality";

export interface TeacherDisciplineView {
  pricing: TeacherDisciplineSummary;
  discipline: MarketplaceDiscipline;
  isPrimary: boolean;
}

export interface TeacherProfileData {
  teacher: TeacherProfile;
  city: City | undefined;
  district: District | undefined;
  primaryDiscipline: MarketplaceDiscipline | undefined;
  disciplineViews: TeacherDisciplineView[];
  similarTeachers: TeacherProfile[];
  /** Min/max hourly across every discipline this teacher teaches. */
  pricingRange: { min: number; max: number } | null;
  index: ProfileIndexBreakdown;
}

const SIMILAR_TEACHER_LIMIT = 4;

export function getTeacherProfileData(slug: string): TeacherProfileData | null {
  const teacher = getTeacherBySlug(slug);
  if (!teacher) return null;

  const city = getCityBySlug(teacher.citySlug);
  const district = teacher.districtSlug
    ? getDistrictBySlug(teacher.citySlug, teacher.districtSlug)
    : undefined;

  const primaryDiscipline = getDisciplineBySlug(teacher.primaryDisciplineSlug);

  const disciplineViews: TeacherDisciplineView[] = teacher.disciplines
    .map((pricing) => {
      const discipline = getDisciplineBySlug(pricing.disciplineSlug);
      if (!discipline) return null;
      return {
        pricing,
        discipline,
        isPrimary: pricing.disciplineSlug === teacher.primaryDisciplineSlug,
      };
    })
    .filter((v): v is TeacherDisciplineView => v !== null)
    // Primary first, then by featured status, then alphabetical.
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.discipline.isFeatured !== b.discipline.isFeatured) {
        return a.discipline.isFeatured ? -1 : 1;
      }
      return a.discipline.sortOrder - b.discipline.sortOrder;
    });

  const allHourly = teacher.disciplines.flatMap((d) => [d.hourlyMin, d.hourlyMax]);
  const pricingRange = allHourly.length
    ? { min: Math.min(...allHourly), max: Math.max(...allHourly) }
    : null;

  // Similar teachers: same city, overlapping primary domain or any shared discipline,
  // not this teacher. Verified first, then higher rating.
  const teacherDisciplineSet = new Set(teacher.disciplines.map((d) => d.disciplineSlug));
  const similarTeachers = MOCK_TEACHERS.filter((t) => {
    if (t.id === teacher.id) return false;
    if (t.citySlug !== teacher.citySlug) return false;
    return t.disciplines.some((d) => teacherDisciplineSet.has(d.disciplineSlug)) ||
      t.primaryDisciplineSlug === teacher.primaryDisciplineSlug;
  })
    .sort((a, b) => {
      if (a.trust.isVerified !== b.trust.isVerified) {
        return a.trust.isVerified ? -1 : 1;
      }
      return b.trust.ratingAverage - a.trust.ratingAverage;
    })
    .slice(0, SIMILAR_TEACHER_LIMIT);

  const index = computeProfileIndexPolicy(teacher);

  return {
    teacher,
    city,
    district,
    primaryDiscipline,
    disciplineViews,
    similarTeachers,
    pricingRange,
    index,
  };
}

/** Returns slugs for `generateStaticParams` — every teacher in the dataset. */
export function getAllTeacherSlugs(): string[] {
  return MOCK_TEACHERS.map((t) => t.slug);
}

/** Subset of teachers eligible for inclusion in sitemap / hreflang feeds. */
export function getIndexableTeacherSlugs(): string[] {
  return MOCK_TEACHERS
    .filter((t) => computeProfileIndexPolicy(t).policy === "index")
    .map((t) => t.slug);
}

/**
 * Maps a teacher's modality enum to the set of supported lesson types,
 * including the implicit subset that "hybrid" implies.
 */
export function deriveModalities(teacher: TeacherProfile): {
  inPerson: boolean;
  online: boolean;
} {
  if (teacher.modality === "in_person") return { inPerson: true, online: false };
  if (teacher.modality === "online") return { inPerson: false, online: true };
  return { inPerson: true, online: true };
}

// Re-export the discipline list for components that build cross-links
// (e.g. "this teacher does not yet teach X — related discipline pages").
export { MOCK_DISCIPLINES };
