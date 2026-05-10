/**
 * Teacher profile view-model aggregator.
 *
 * Reads from the live backend (`/api/marketplace/teachers/by-slug/<slug>/`
 * + `/api/marketplace/teachers/?city=<city_slug>` for similar teachers)
 * and normalizes the payload through `adaptTeacher` so consumers keep the
 * same shape they were built against during the mock era.
 *
 * Mock fallback (`LR_USE_MOCK=1`) routes the same fetchers through
 * `lib/data/api/use-mock` so SSG keeps working in offline/CI builds.
 */
import type {
  City,
  District,
  MarketplaceDiscipline,
  TeacherDisciplineSummary,
  TeacherProfile,
} from "@/lib/types";

import {
  fetchAllDisciplines,
  fetchCities,
  fetchTeacherDetailBySlug,
  fetchTeacherList,
} from "@/lib/data/api/marketplace";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import { adaptDiscipline } from "@/lib/data/adapters/taxonomy";
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

export async function getTeacherProfileData(
  slug: string,
): Promise<TeacherProfileData | null> {
  const apiTeacher = await fetchTeacherDetailBySlug(slug);
  if (!apiTeacher) return null;

  const teacher = adaptTeacher(apiTeacher);

  const [citiesEnvelope, disciplinesEnvelope, similarTeachers] = await Promise.all([
    fetchCities(),
    fetchAllDisciplines(),
    teacher.citySlug ? getSimilarTeachers(teacher) : Promise.resolve([]),
  ]);

  const cityRow = citiesEnvelope.results.find((c) => c.slug === teacher.citySlug);
  const city = cityRow
    ? {
        slug: cityRow.slug,
        nameTr: cityRow.name_tr,
        nameEn: cityRow.name_en,
        isPriority: cityRow.is_priority,
      }
    : teacher.citySlug && teacher.cityName
      ? {
          slug: teacher.citySlug,
          nameTr: teacher.cityName.tr,
          nameEn: teacher.cityName.en,
        }
    : undefined;
  const districtRow = cityRow?.districts.find(
    (d) => d.slug === teacher.districtSlug,
  );
  const district =
    districtRow && cityRow
      ? {
          slug: districtRow.slug,
          citySlug: cityRow.slug,
          nameTr: districtRow.name_tr,
          nameEn: districtRow.name_en,
        }
      : teacher.districtSlug && teacher.districtName
        ? {
            slug: teacher.districtSlug,
            citySlug: teacher.citySlug,
            nameTr: teacher.districtName.tr,
            nameEn: teacher.districtName.en,
          }
      : undefined;

  const disciplines = disciplinesEnvelope.results.map(adaptDiscipline);
  const disciplineBySlug = new Map(disciplines.map((d) => [d.slug, d]));

  const primaryDiscipline = disciplineBySlug.get(teacher.primaryDisciplineSlug);

  const disciplineViews: TeacherDisciplineView[] = teacher.disciplines
    .map((pricing) => {
      const discipline = disciplineBySlug.get(pricing.disciplineSlug);
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

async function getSimilarTeachers(
  teacher: TeacherProfile,
): Promise<TeacherProfile[]> {
  const list = await fetchTeacherList({ city: teacher.citySlug });
  const teacherDisciplineSet = new Set(
    teacher.disciplines.map((d) => d.disciplineSlug),
  );

  return list.results
    .map((api) => adaptTeacher(api))
    .filter((candidate) => {
      if (candidate.id === teacher.id) return false;
      // Server already filtered by city; we apply the cross-discipline
      // overlap rule here to keep the API surface generic.
      return (
        candidate.disciplines.some((d) =>
          teacherDisciplineSet.has(d.disciplineSlug),
        ) ||
        candidate.primaryDisciplineSlug === teacher.primaryDisciplineSlug
      );
    })
    .sort((a, b) => {
      if (a.trust.isVerified !== b.trust.isVerified) {
        return a.trust.isVerified ? -1 : 1;
      }
      return b.trust.ratingAverage - a.trust.ratingAverage;
    })
    .slice(0, SIMILAR_TEACHER_LIMIT);
}

/**
 * Returns slugs for `generateStaticParams`. Pulls a single list page from
 * the API and uses every visible teacher's slug. The list endpoint is
 * already filtered to "publishable" rows server-side, so no extra
 * client-side filter is needed here.
 */
export async function getAllTeacherSlugs(): Promise<string[]> {
  const list = await fetchTeacherList();
  return list.results.map((row) => row.slug).filter(Boolean);
}

/**
 * Subset eligible for sitemap inclusion (and Google index hint). Adapts
 * each row to compute the same `computeProfileIndexPolicy` verdict the
 * runtime uses, so sitemap and on-page robots meta agree.
 */
export async function getIndexableTeacherSlugs(): Promise<string[]> {
  const list = await fetchTeacherList();
  return list.results
    .map((api) => adaptTeacher(api))
    .filter((teacher) => computeProfileIndexPolicy(teacher).policy === "index")
    .map((teacher) => teacher.slug);
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
