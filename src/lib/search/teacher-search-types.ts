/**
 * Client-safe types + URL helpers for the search UI.
 *
 * Pulled out of `teacher-search.ts` so that client islands (sort select,
 * filter chips, mobile filter sheet) can import the types and the
 * URL-building helpers without dragging the server-only `fetchTeacherList`
 * module into the client bundle.
 */

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
 *
 * `knownDisciplineSlugs` is optional — when omitted, discipline values
 * are passed through without validation (the backend will return an
 * empty list for unknown slugs, which the page handles gracefully).
 * Pass the live taxonomy slug set when you have it for stricter
 * client-side validation.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
  knownCitySlugs: Set<string>,
  knownDistrictSlugs: Set<string>,
  knownDisciplineSlugs?: Set<string>,
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
    ? knownDisciplineSlugs
      ? knownDisciplineSlugs.has(disciplineSlug)
        ? disciplineSlug
        : undefined
      : disciplineSlug
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
