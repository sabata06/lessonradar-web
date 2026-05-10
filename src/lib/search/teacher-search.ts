import "server-only";

/**
 * Server-only `searchTeachers` runner.
 *
 * Purely a fetch-and-rank helper — relies on the live discovery endpoint
 * for supply/contact, district, and verification filtering.
 *
 * Client islands should import types + URL helpers from
 * `./teacher-search-types` instead of this module so they don't pull
 * `server-only` into the client bundle.
 */
import { fetchTeacherList } from "@/lib/data/api/marketplace";
import { adaptTeacher } from "@/lib/data/adapters/teacher";
import {
  type SupportedLocale,
  type TeacherProfile,
} from "@/lib/types";
import type { ApiTeacherListFilters } from "@/lib/types/api/marketplace";

import {
  countAppliedFilters,
  type SortOption,
  type TeacherSearchFilters,
} from "./teacher-search-types";

// Re-export the client-safe surface so callers that already import from
// `@/lib/search/teacher-search` keep working without an import sweep.
export {
  SORT_OPTIONS,
  MODALITY_FILTER_OPTIONS,
  countAppliedFilters,
  parseSearchParams,
  buildSearchQuery,
} from "./teacher-search-types";
export type {
  SortOption,
  ModalityFilter,
  TeacherSearchFilters,
} from "./teacher-search-types";

export interface TeacherSearchResult {
  teachers: TeacherProfile[];
  appliedFilterCount: number;
  totalBeforeFilter: number;
}

const DIACRITIC_MAP: Record<string, string> = {
  "ı": "i", "İ": "i", "ç": "c", "Ç": "c", "ş": "s", "Ş": "s",
  "ğ": "g", "Ğ": "g", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u",
};

function fold(text: string): string {
  return text
    .split("")
    .map((ch) => DIACRITIC_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .trim();
}

function computeQueryScore(
  teacher: TeacherProfile,
  query: string,
  locale: SupportedLocale,
): number {
  const needle = fold(query);
  if (!needle) return 0;
  const tokens = needle.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const fields: { weight: number; text: string }[] = [
    { weight: 6, text: fold(teacher.fullName) },
    { weight: 4, text: fold(teacher.headline) },
    { weight: 2, text: fold(teacher.bio) },
  ];

  for (const summary of teacher.disciplines) {
    const localizedName =
      locale === "tr" ? summary.name?.tr : summary.name?.en;
    if (localizedName) {
      fields.push({ weight: 5, text: fold(localizedName) });
    }
  }

  let score = 0;
  for (const token of tokens) {
    let tokenHit = 0;
    for (const f of fields) {
      if (!f.text) continue;
      if (f.text.includes(token)) {
        tokenHit = Math.max(tokenHit, f.weight);
      }
    }
    if (tokenHit === 0) {
      // a missing token in a multi-token query disqualifies the row
      return 0;
    }
    score += tokenHit;
  }
  return score;
}

function toApiFilters(filters: TeacherSearchFilters): ApiTeacherListFilters {
  const apiFilters: ApiTeacherListFilters = {};
  if (filters.q?.trim()) apiFilters.q = filters.q.trim();
  if (filters.citySlug) apiFilters.city = filters.citySlug;
  if (filters.districtSlug) apiFilters.district = filters.districtSlug;
  if (filters.disciplineSlug) apiFilters.discipline = filters.disciplineSlug;
  if (filters.verifiedOnly) apiFilters.verified = "1";
  if (filters.modality && filters.modality !== "any") {
    apiFilters.mode = filters.modality === "online" ? "online" : "yuzyuze";
  }
  return apiFilters;
}

export async function searchTeachers(
  filters: TeacherSearchFilters,
  locale: SupportedLocale,
): Promise<TeacherSearchResult> {
  const list = await fetchTeacherList(toApiFilters(filters));
  const teachers = list.results.map((api) => adaptTeacher(api));

  // Defensive client refinement keeps behavior correct against older
  // backend deploys during the rollout; the current backend handles these
  // filters server-side.
  const districtFiltered = filters.districtSlug
    ? teachers.filter((t) => t.districtSlug === filters.districtSlug)
    : teachers;

  const verifiedFiltered = filters.verifiedOnly
    ? districtFiltered.filter((t) => t.trust.isVerified)
    : districtFiltered;

  const sort: SortOption = filters.sort ?? "relevance";
  const query = (filters.q ?? "").trim();

  const scored = verifiedFiltered.map((teacher) => ({
    teacher,
    queryScore: query ? computeQueryScore(teacher, query, locale) : 0,
  }));

  // When a free-text query is set, drop rows the local relevance score
  // also rules out so the chip-count UI matches what the user sees.
  const filtered = query ? scored.filter((s) => s.queryScore > 0) : scored;

  const priceAnchor = (t: TeacherProfile): number => {
    const positive = t.disciplines
      .map((d) => d.hourlyMin)
      .filter((n) => Number.isFinite(n) && n > 0);
    if (filters.disciplineSlug) {
      const d = t.disciplines.find(
        (x) => x.disciplineSlug === filters.disciplineSlug,
      );
      if (d && d.hourlyMin > 0) return d.hourlyMin;
    }
    return positive.length ? Math.min(...positive) : Number.POSITIVE_INFINITY;
  };

  filtered.sort((a, b) => {
    switch (sort) {
      case "rating": {
        const diff = b.teacher.trust.ratingAverage - a.teacher.trust.ratingAverage;
        if (diff !== 0) return diff;
        return b.teacher.trust.reviewCount - a.teacher.trust.reviewCount;
      }
      case "response_fast":
        return (
          (a.teacher.trust.responseTimeMinutes || Number.POSITIVE_INFINITY) -
          (b.teacher.trust.responseTimeMinutes || Number.POSITIVE_INFINITY)
        );
      case "price_asc":
        return priceAnchor(a.teacher) - priceAnchor(b.teacher);
      case "relevance":
      default: {
        if (query && b.queryScore !== a.queryScore) {
          return b.queryScore - a.queryScore;
        }
        if (a.teacher.trust.isVerified !== b.teacher.trust.isVerified) {
          return a.teacher.trust.isVerified ? -1 : 1;
        }
        if (a.teacher.isPremium !== b.teacher.isPremium) {
          return a.teacher.isPremium ? -1 : 1;
        }
        const ratingDiff =
          b.teacher.trust.ratingAverage - a.teacher.trust.ratingAverage;
        if (ratingDiff !== 0) return ratingDiff;
        return (
          (a.teacher.trust.responseTimeMinutes || Number.POSITIVE_INFINITY) -
          (b.teacher.trust.responseTimeMinutes || Number.POSITIVE_INFINITY)
        );
      }
    }
  });

  return {
    teachers: filtered.map((s) => s.teacher),
    appliedFilterCount: countAppliedFilters(filters),
    // `count` is the backend total for the server-side filtered result set.
    totalBeforeFilter: list.count,
  };
}

/**
 * Filter keys we will drop, in priority order, when the original
 * search returns zero results. The order is "least painful first":
 * remove the verified gate before broadening the city, broaden modality
 * before wiping the discipline.
 */
export type RelaxableFilterKey =
  | "verifiedOnly"
  | "districtSlug"
  | "modality"
  | "citySlug";

const RELAX_ORDER: RelaxableFilterKey[] = [
  "verifiedOnly",
  "districtSlug",
  "modality",
  "citySlug",
];

export interface SearchWithRelaxResult {
  /** The original (or relaxed) search result we're showing the user. */
  result: TeacherSearchResult;
  /** Which filter, if any, we dropped to find these results. */
  relaxedDrop: RelaxableFilterKey | null;
}

/**
 * Runs the search and, on zero results, tries dropping one filter at a
 * time (in `RELAX_ORDER`) until something matches. Lets `/ara` show a
 * "we relaxed X to find these" suggestion instead of a dead end.
 */
export async function searchTeachersWithRelaxation(
  filters: TeacherSearchFilters,
  locale: SupportedLocale,
): Promise<SearchWithRelaxResult> {
  const direct = await searchTeachers(filters, locale);
  if (direct.teachers.length > 0) {
    return { result: direct, relaxedDrop: null };
  }

  for (const key of RELAX_ORDER) {
    const present =
      key === "modality"
        ? filters.modality && filters.modality !== "any"
        : Boolean(filters[key]);
    if (!present) continue;

    const relaxed: TeacherSearchFilters = { ...filters };
    if (key === "modality") {
      relaxed.modality = "any";
    } else if (key === "citySlug") {
      relaxed.citySlug = undefined;
      relaxed.districtSlug = undefined;
    } else if (key === "districtSlug") {
      relaxed.districtSlug = undefined;
    } else if (key === "verifiedOnly") {
      relaxed.verifiedOnly = false;
    }

    const candidate = await searchTeachers(relaxed, locale);
    if (candidate.teachers.length > 0) {
      return { result: candidate, relaxedDrop: key };
    }
  }

  return { result: direct, relaxedDrop: null };
}
