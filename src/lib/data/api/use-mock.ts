import "server-only";

import type {
  ApiCity,
  ApiDiscipline,
  ApiDomain,
  ApiListEnvelope,
  ApiSpecialty,
  ApiTaxonomyRoot,
  ApiTeacherDetail,
  ApiTeacherListFilters,
  ApiTeacherListItem,
} from "@/lib/types/api/marketplace";
import type { TeacherProfile } from "@/lib/types/teacher";

import { TR_CITIES, TR_DISTRICTS } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES, MOCK_DOMAINS } from "@/lib/data/mock/disciplines";
import { MOCK_TEACHERS } from "@/lib/data/mock/teachers";
import type { MarketplaceDomain, MarketplaceDiscipline } from "@/lib/types/discipline";

/**
 * Mock fallback layer for the marketplace API.
 *
 * Activated by `LR_USE_MOCK=1` — typically in CI / local builds where the
 * Django backend isn't reachable and we still want a representative SSG
 * pass. The mock dataset lives in `lib/data/mock/` and is converted into
 * the API wire shape here so consumers (the fetch wrappers) only see one
 * surface.
 *
 * This layer is the inverse of `src/lib/data/adapters/teacher.ts`: that
 * adapter goes API → view-model, this one goes view-model → API. The
 * round-trip is lossy on a few fields (the mock doesn't store some
 * backend-only signals) but produces a payload the adapter can consume
 * without crashes, which is all the SSG pipeline needs.
 */

export function shouldUseMock(): boolean {
  return process.env.LR_USE_MOCK === "1";
}

const ZERO_PAD = (n: number) => Math.max(1, Math.floor(n));

function mockTeacherIdToInt(id: string): number {
  // Mock IDs follow `t-001` / `t-002` etc. Pull the numeric tail; fall
  // back to a 1-based index if the format ever changes.
  const match = /(\d+)/.exec(id);
  return match ? parseInt(match[1], 10) : 1;
}

function modalityToTokens(
  modality: TeacherProfile["modality"],
): string[] {
  if (modality === "hybrid") return ["online", "yuzyuze"];
  if (modality === "online") return ["online"];
  return ["yuzyuze"];
}

function localeFromContext(): "tr" | "en" {
  // Adapter does not currently consume `discipline_name`, so we always
  // emit Turkish here. If a consumer ever depends on it, switch to a
  // server-only `getLocale()` lookup.
  return "tr";
}

function mockSpecialty(
  pricing: TeacherProfile["disciplines"][number],
  primarySlug: string,
  fallbackHourly: number | null,
): ApiSpecialty {
  const discipline = MOCK_DISCIPLINES.find(
    (d) => d.slug === pricing.disciplineSlug,
  );
  const localized = discipline?.name;
  const min = pricing.hourlyMin || fallbackHourly || 0;
  const max = pricing.hourlyMax || fallbackHourly || min;
  const locale = localeFromContext();

  return {
    discipline_slug: pricing.disciplineSlug,
    discipline_name: localized
      ? localized[locale] ?? localized.tr ?? localized.en
      : pricing.disciplineSlug,
    discipline_name_tr: localized?.tr ?? pricing.disciplineSlug,
    discipline_name_en: localized?.en ?? pricing.disciplineSlug,
    domain_slug: "akademik",
    sort_order: pricing.disciplineSlug === primarySlug ? 0 : 1,
    hourly_rate_min: min ? min.toFixed(2) : null,
    hourly_rate_max: max ? max.toFixed(2) : null,
    is_primary: pricing.disciplineSlug === primarySlug,
    facet_option_values: {},
    facet_option_labels: {},
  };
}

function teacherToApiListItem(t: TeacherProfile): ApiTeacherListItem {
  const hourlyAcrossAll = t.disciplines
    .flatMap((d) => [d.hourlyMin, d.hourlyMax])
    .filter((n) => Number.isFinite(n) && n > 0);
  const fallbackHourly = hourlyAcrossAll.length
    ? Math.min(...hourlyAcrossAll)
    : null;

  return {
    id: ZERO_PAD(mockTeacherIdToInt(t.id)),
    slug: t.slug,
    display_name: t.fullName,
    headline: t.headline,
    city: cityNameForSlug(t.citySlug) ?? "",
    district: districtNameForSlug(t.citySlug, t.districtSlug) ?? "",
    city_slug: t.citySlug || null,
    district_slug: t.districtSlug ?? null,
    subjects: [],
    grade_levels: [],
    specialties: t.disciplines.map((p) =>
      mockSpecialty(p, t.primaryDisciplineSlug, fallbackHourly),
    ),
    primary_discipline_slug: t.primaryDisciplineSlug || null,
    lesson_modes: modalityToTokens(t.modality),
    hourly_rate: fallbackHourly ? fallbackHourly.toFixed(2) : null,
    years_of_experience: t.yearsOfExperience,
    profile_image_url: t.avatarUrl || null,
    avatar_url: t.avatarUrl || null,
    rating: {
      average: t.trust.ratingAverage > 0 ? t.trust.ratingAverage : null,
      count: t.trust.reviewCount,
    },
    trust: {
      verified_identity: t.trust.identityVerified,
      verified_diploma: t.trust.diplomaVerified,
      premium: t.isPremium,
      last_active_at: t.trust.lastActiveAt || null,
      median_response_minutes: t.trust.responseTimeMinutes || null,
    },
    published_at: t.trust.lastActiveAt || new Date(0).toISOString(),
  };
}

function teacherToApiDetail(t: TeacherProfile): ApiTeacherDetail {
  const list = teacherToApiListItem(t);
  return {
    ...list,
    bio: t.bio,
    contact_methods: ["email"],
    public_email: null,
    public_phone_code: null,
    public_phone_number: null,
    public_phone_display: null,
    public_phone_e164: null,
    supports_in_app_messages: false,
    reviews: [],
    updated_at: new Date(0).toISOString(),
  };
}

function cityNameForSlug(slug: string): string | null {
  const city = TR_CITIES.find((c) => c.slug === slug);
  return city ? city.nameTr : null;
}

function districtNameForSlug(
  citySlug: string,
  districtSlug: string | undefined,
): string | null {
  if (!districtSlug) return null;
  const d = TR_DISTRICTS.find(
    (entry) => entry.slug === districtSlug && entry.citySlug === citySlug,
  );
  return d ? d.nameTr : null;
}

// ─── Public mock fallbacks consumed by the fetch wrappers ───────────────────

export function mockFetchTeacherList(
  filters: ApiTeacherListFilters,
): ApiListEnvelope<ApiTeacherListItem> {
  let list = MOCK_TEACHERS.slice();

  if (filters.city) {
    list = list.filter((t) => t.citySlug === filters.city);
  }
  if (filters.district) {
    list = list.filter((t) => t.districtSlug === filters.district);
  }
  if (filters.discipline) {
    list = list.filter((t) =>
      t.disciplines.some((d) => d.disciplineSlug === filters.discipline),
    );
  }
  if (filters.verified === true || filters.verified === "1" || filters.verified === "true") {
    list = list.filter((t) => t.trust.identityVerified && t.trust.diplomaVerified);
  }
  if (filters.mode) {
    if (filters.mode === "online") {
      list = list.filter(
        (t) => t.modality === "online" || t.modality === "hybrid",
      );
    } else if (filters.mode === "yuzyuze") {
      list = list.filter(
        (t) => t.modality === "in_person" || t.modality === "hybrid",
      );
    }
  }
  if (filters.q) {
    const needle = filters.q.toLocaleLowerCase("tr");
    list = list.filter((t) =>
      [t.fullName, t.headline, t.bio]
        .some((field) => field.toLocaleLowerCase("tr").includes(needle)),
    );
  }

  const items = list.map(teacherToApiListItem);
  return { count: items.length, results: items };
}

export function mockFetchTeacherDetailBySlug(
  slug: string,
): ApiTeacherDetail | null {
  const teacher = MOCK_TEACHERS.find((t) => t.slug === slug);
  if (!teacher) return null;
  return teacherToApiDetail(teacher);
}

function domainToApi(domain: MarketplaceDomain): ApiDomain {
  return {
    slug: domain.slug,
    name: domain.name.tr,
    name_tr: domain.name.tr,
    name_en: domain.name.en,
    description: "",
    description_tr: "",
    description_en: "",
    sort_order: domain.sortOrder,
    discipline_count: MOCK_DISCIPLINES.filter(
      (d) => d.domainSlug === domain.slug,
    ).length,
  };
}

function disciplineToApi(d: MarketplaceDiscipline): ApiDiscipline {
  const domain = MOCK_DOMAINS.find((dom) => dom.slug === d.domainSlug);
  return {
    slug: d.slug,
    name: d.name.tr,
    name_tr: d.name.tr,
    name_en: d.name.en,
    description: d.description?.tr ?? "",
    description_tr: d.description?.tr ?? "",
    description_en: d.description?.en ?? "",
    is_featured: Boolean(d.isFeatured),
    sort_order: d.sortOrder,
    domain: domain
      ? domainToApi(domain)
      : {
          slug: d.domainSlug,
          name: d.domainSlug,
          name_tr: d.domainSlug,
          name_en: d.domainSlug,
          description: "",
          description_tr: "",
          description_en: "",
          sort_order: 0,
          discipline_count: null,
        },
  };
}

export function mockFetchTaxonomyRoot(): ApiTaxonomyRoot {
  return {
    domains: MOCK_DOMAINS.map(domainToApi),
    featured_disciplines: MOCK_DISCIPLINES.filter((d) => d.isFeatured).map(
      disciplineToApi,
    ),
    meta: { max_discipline_count: 5 },
  };
}

export function mockFetchAllDisciplines(): ApiListEnvelope<ApiDiscipline> {
  const items = MOCK_DISCIPLINES.map(disciplineToApi);
  return { count: items.length, results: items };
}

export function mockFetchCities(): ApiListEnvelope<ApiCity> {
  const items: ApiCity[] = TR_CITIES.map((city) => ({
    slug: city.slug,
    name_tr: city.nameTr,
    name_en: city.nameEn,
    is_priority: Boolean(city.isPriority),
    latitude: null,
    longitude: null,
    districts: TR_DISTRICTS.filter((d) => d.citySlug === city.slug).map((d) => ({
      slug: d.slug,
      name_tr: d.nameTr,
      name_en: d.nameEn,
    })),
  }));
  return { count: items.length, results: items };
}
