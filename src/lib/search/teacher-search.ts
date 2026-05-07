/**
 * Teacher search engine. Pure, deterministic, server-renderable.
 *
 * The /ara route is `noindex,follow` (filter-URL hard rule) so this file
 * is never the source of an indexable URL — its job is to produce a
 * trustworthy slice of the catalog for a logged-out visitor scanning
 * options. All matching is locale-aware; sorting is stable.
 *
 * Backend swap path: replace `searchTeachers` with an API call (POST
 * /api/teachers/search returning the same `TeacherProfile[]`). The page
 * stays unchanged because the input/output shapes are pinned here.
 */
import { MOCK_TEACHERS } from "@/lib/data/mock/teachers";
import { getDisciplineBySlug, MOCK_DISCIPLINES } from "@/lib/data/mock/disciplines";
import { pickLocalized, type SupportedLocale, type TeacherProfile } from "@/lib/types";

export const SORT_OPTIONS = [
  "relevance",
  "rating",
  "response_fast",
  "price_asc",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const MODALITY_FILTER_OPTIONS = ["any", "online", "in_person"] as const;
export type ModalityFilter = (typeof MODALITY_FILTER_OPTIONS)[number];

export interface TeacherSearchFilters {
  q?: string;
  citySlug?: string;
  districtSlug?: string;
  disciplineSlug?: string;
  modality?: ModalityFilter;
  verifiedOnly?: boolean;
  sort?: SortOption;
}

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

/**
 * Free-text relevance score. Used both for ranking (sort=relevance) and
 * for filtering when `q` is set. Returns 0 when no overlap so the caller
 * can reject the row entirely.
 */
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

  // Discipline names (localized)
  for (const summary of teacher.disciplines) {
    const d = getDisciplineBySlug(summary.disciplineSlug);
    if (!d) continue;
    fields.push({ weight: 5, text: fold(pickLocalized(d.name, locale)) });
    if (d.searchAliases?.[locale]) {
      fields.push({
        weight: 3,
        text: fold((d.searchAliases[locale] ?? []).join(" ")),
      });
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

export function searchTeachers(
  filters: TeacherSearchFilters,
  locale: SupportedLocale,
): TeacherSearchResult {
  const corpus = MOCK_TEACHERS;
  const totalBeforeFilter = corpus.length;

  const sort: SortOption = filters.sort ?? "relevance";
  const query = (filters.q ?? "").trim();

  const scored = corpus
    .map((teacher) => {
      // City
      if (filters.citySlug && teacher.citySlug !== filters.citySlug) return null;
      // District
      if (
        filters.districtSlug &&
        teacher.districtSlug !== filters.districtSlug
      )
        return null;
      // Discipline
      if (
        filters.disciplineSlug &&
        !teacher.disciplines.some(
          (d) => d.disciplineSlug === filters.disciplineSlug,
        )
      )
        return null;
      // Modality
      if (filters.modality && filters.modality !== "any") {
        const teaches =
          filters.modality === "online"
            ? teacher.modality === "online" || teacher.modality === "hybrid"
            : teacher.modality === "in_person" || teacher.modality === "hybrid";
        if (!teaches) return null;
      }
      // Verified-only
      if (filters.verifiedOnly && !teacher.trust.isVerified) return null;
      // Free-text
      let queryScore = 0;
      if (query) {
        queryScore = computeQueryScore(teacher, query, locale);
        if (queryScore === 0) return null;
      }
      return { teacher, queryScore };
    })
    .filter((r): r is { teacher: TeacherProfile; queryScore: number } => r !== null);

  // Hourly anchor for price_asc — uses the cheapest discipline this teacher offers
  // when no discipline filter is active, otherwise the matching discipline.
  const priceAnchor = (t: TeacherProfile): number => {
    if (filters.disciplineSlug) {
      const d = t.disciplines.find(
        (x) => x.disciplineSlug === filters.disciplineSlug,
      );
      if (d) return d.hourlyMin;
    }
    return Math.min(...t.disciplines.map((d) => d.hourlyMin));
  };

  scored.sort((a, b) => {
    switch (sort) {
      case "rating": {
        const diff = b.teacher.trust.ratingAverage - a.teacher.trust.ratingAverage;
        if (diff !== 0) return diff;
        return b.teacher.trust.reviewCount - a.teacher.trust.reviewCount;
      }
      case "response_fast":
        return (
          a.teacher.trust.responseTimeMinutes - b.teacher.trust.responseTimeMinutes
        );
      case "price_asc":
        return priceAnchor(a.teacher) - priceAnchor(b.teacher);
      case "relevance":
      default: {
        // 1. Free-text query score (when a query is present)
        if (query && b.queryScore !== a.queryScore) {
          return b.queryScore - a.queryScore;
        }
        // 2. Verified first
        if (a.teacher.trust.isVerified !== b.teacher.trust.isVerified) {
          return a.teacher.trust.isVerified ? -1 : 1;
        }
        // 3. Premium next
        if (a.teacher.isPremium !== b.teacher.isPremium) {
          return a.teacher.isPremium ? -1 : 1;
        }
        // 4. Higher rating
        const ratingDiff =
          b.teacher.trust.ratingAverage - a.teacher.trust.ratingAverage;
        if (ratingDiff !== 0) return ratingDiff;
        // 5. Faster responder
        return (
          a.teacher.trust.responseTimeMinutes - b.teacher.trust.responseTimeMinutes
        );
      }
    }
  });

  const appliedFilterCount = countAppliedFilters(filters);

  return {
    teachers: scored.map((s) => s.teacher),
    appliedFilterCount,
    totalBeforeFilter,
  };
}

export function countAppliedFilters(filters: TeacherSearchFilters): number {
  let n = 0;
  if (filters.q?.trim()) n++;
  if (filters.citySlug) n++;
  if (filters.districtSlug) n++;
  if (filters.disciplineSlug) n++;
  if (filters.modality && filters.modality !== "any") n++;
  if (filters.verifiedOnly) n++;
  return n;
}

/**
 * Normalizes raw `searchParams` from a Route Handler into the typed
 * filter shape, dropping any value that doesn't match a known slug.
 * This guards against arbitrary garbage in the URL polluting the UI
 * (active-filter chips would otherwise echo invalid input).
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
  knownCitySlugs: Set<string>,
  knownDistrictSlugs: Set<string>,
): TeacherSearchFilters {
  const get = (key: string): string | undefined => {
    const v = raw[key];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  const citySlug = get("city");
  const districtSlug = get("district");
  const disciplineSlug = get("discipline");
  const modalityRaw = get("modality");
  const sortRaw = get("sort");
  const verifiedRaw = get("verified");

  const validCity = citySlug && knownCitySlugs.has(citySlug) ? citySlug : undefined;
  const validDistrict =
    validCity && districtSlug && knownDistrictSlugs.has(districtSlug)
      ? districtSlug
      : undefined;
  const validDiscipline = disciplineSlug
    ? MOCK_DISCIPLINES.find((d) => d.slug === disciplineSlug)?.slug
    : undefined;

  const modality: ModalityFilter | undefined =
    modalityRaw && (MODALITY_FILTER_OPTIONS as readonly string[]).includes(modalityRaw)
      ? (modalityRaw as ModalityFilter)
      : undefined;

  const sort: SortOption | undefined =
    sortRaw && (SORT_OPTIONS as readonly string[]).includes(sortRaw)
      ? (sortRaw as SortOption)
      : undefined;

  return {
    q: get("q")?.slice(0, 120) || undefined,
    citySlug: validCity,
    districtSlug: validDistrict,
    disciplineSlug: validDiscipline,
    modality,
    verifiedOnly: verifiedRaw === "1" || verifiedRaw === "true",
    sort,
  };
}

/**
 * Builds a `?...` query string from the current filters, optionally
 * mutated by `override`. Used to build active-filter "remove" links and
 * "apply filter" links without resorting to client JS.
 *
 * Setting a key to `null` in `override` deletes it.
 */
export function buildSearchQuery(
  current: TeacherSearchFilters,
  override: Partial<Record<keyof TeacherSearchFilters, string | boolean | null>> = {},
): string {
  const params = new URLSearchParams();

  type Pair = [keyof TeacherSearchFilters, string];
  const next: Pair[] = [];
  const merged: TeacherSearchFilters = { ...current };

  for (const [k, v] of Object.entries(override) as [keyof TeacherSearchFilters, string | boolean | null][]) {
    if (v === null) {
      delete (merged as Record<string, unknown>)[k];
    } else if (typeof v === "boolean") {
      (merged as Record<string, unknown>)[k] = v;
    } else {
      (merged as Record<string, unknown>)[k] = v;
    }
  }

  if (merged.q?.trim()) next.push(["q", merged.q.trim()]);
  if (merged.citySlug) next.push(["citySlug", merged.citySlug]);
  if (merged.districtSlug) next.push(["districtSlug", merged.districtSlug]);
  if (merged.disciplineSlug) next.push(["disciplineSlug", merged.disciplineSlug]);
  if (merged.modality && merged.modality !== "any") next.push(["modality", merged.modality]);
  if (merged.verifiedOnly) next.push(["verifiedOnly", "1"]);
  if (merged.sort && merged.sort !== "relevance") next.push(["sort", merged.sort]);

  // Map internal keys to public URL keys
  const URL_KEYS: Record<keyof TeacherSearchFilters, string> = {
    q: "q",
    citySlug: "city",
    districtSlug: "district",
    disciplineSlug: "discipline",
    modality: "modality",
    verifiedOnly: "verified",
    sort: "sort",
  };
  for (const [k, v] of next) {
    params.set(URL_KEYS[k], v);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
