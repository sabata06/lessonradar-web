import "server-only";

import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type {
  ApiCity,
  ApiDiscipline,
  ApiListEnvelope,
  ApiTaxonomyRoot,
  ApiTeacherDetail,
  ApiTeacherListFilters,
  ApiTeacherListItem,
} from "@/lib/types/api/marketplace";

import {
  mockFetchAllDisciplines,
  mockFetchCities,
  mockFetchTaxonomyRoot,
  mockFetchTeacherDetailBySlug,
  mockFetchTeacherList,
  shouldUseMock,
} from "./use-mock";

/**
 * Cache windows. The trade-off is freshness vs. crawl/SSR cost:
 *   - Cities are seeded by migration, virtually static — long ISR window.
 *   - Teacher list (search + pSEO city/discipline) changes when admins
 *     publish or hide profiles; 10-minute window keeps it close enough
 *     to live without thrashing the backend on every render.
 *   - Teacher detail changes more often (rating recompute, profile
 *     edits); 1-hour window is the same as the legal pages.
 */
const REVALIDATE_LIST_SECONDS = 600;
const REVALIDATE_DETAIL_SECONDS = 3600;
const REVALIDATE_CITIES_SECONDS = 86_400;

/**
 * Fetch the public discovery list. Filters mirror
 * `TeacherDiscoveryQuerySerializer` field-for-field — pass them through
 * unmodified.
 *
 * `facet_option` is a repeated query param on the backend; we serialize
 * arrays as comma-joined here only when present, otherwise omit. The
 * `apiClient` helper expects scalar values per key, so for repeated
 * params we hand the URL a manual `&facet_option=a&facet_option=b` slice.
 */
export async function fetchTeacherList(
  filters: ApiTeacherListFilters = {},
  options?: { revalidate?: number; signal?: AbortSignal },
): Promise<ApiListEnvelope<ApiTeacherListItem>> {
  if (shouldUseMock()) {
    return mockFetchTeacherList(filters);
  }

  try {
    return await fetchTeacherListLive(filters, options);
  } catch (error) {
    // Treat 400 (e.g. unknown discipline / invalid filter combination)
    // as an empty result. The web's pSEO catalog can address slugs the
    // backend taxonomy hasn't onboarded yet — those pages should fall
    // through to lead-collection mode (noindex, quality_score < 50)
    // instead of crashing the build.
    if (isApiClientError(error)) return EMPTY_LIST_ENVELOPE;
    throw error;
  }
}

const EMPTY_LIST_ENVELOPE: ApiListEnvelope<ApiTeacherListItem> = {
  count: 0,
  results: [],
};

async function fetchTeacherListLive(
  filters: ApiTeacherListFilters,
  options?: { revalidate?: number; signal?: AbortSignal },
): Promise<ApiListEnvelope<ApiTeacherListItem>> {
  const { facet_option, ...rest } = filters;

  const query = stripUndefined(rest);

  // The `apiClient.query` map only takes scalar values, so multi-value
  // facet_option params need a custom URL. Bypass the helper for that
  // case to keep the type-safety on the rest of the params clean.
  if (facet_option && facet_option.length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    for (const opt of facet_option) {
      params.append("facet_option", opt);
    }
    const path = `${ENDPOINTS.MARKETPLACE_TEACHERS}?${params.toString()}`;
    return apiClient.get<ApiListEnvelope<ApiTeacherListItem>>(path, {
      cache: "force-cache",
      next: {
        revalidate: options?.revalidate ?? REVALIDATE_LIST_SECONDS,
        tags: ["marketplace:teachers"],
      },
      signal: options?.signal,
    });
  }

  return apiClient.get<ApiListEnvelope<ApiTeacherListItem>>(
    ENDPOINTS.MARKETPLACE_TEACHERS,
    {
      query,
      cache: "force-cache",
      next: {
        revalidate: options?.revalidate ?? REVALIDATE_LIST_SECONDS,
        tags: ["marketplace:teachers"],
      },
      signal: options?.signal,
    },
  );
}

/**
 * Fetch a single visible teacher profile by slug. Returns null on 404 so
 * page-level callers can render a clean `notFound()` without unwrapping
 * an `ApiError` instance.
 */
export async function fetchTeacherDetailBySlug(
  slug: string,
  options?: { revalidate?: number; signal?: AbortSignal },
): Promise<ApiTeacherDetail | null> {
  if (shouldUseMock()) {
    return mockFetchTeacherDetailBySlug(slug);
  }

  try {
    return await apiClient.get<ApiTeacherDetail>(
      ENDPOINTS.MARKETPLACE_TEACHER_DETAIL_BY_SLUG(slug),
      {
        cache: "force-cache",
        next: {
          revalidate: options?.revalidate ?? REVALIDATE_DETAIL_SECONDS,
          tags: [`marketplace:teacher:${slug}`],
        },
        signal: options?.signal,
      },
    );
  } catch (error) {
    if (isApiNotFound(error)) return null;
    throw error;
  }
}

/**
 * Fetch the bootstrap taxonomy payload (domains + featured disciplines).
 * Used for quick-pick chips and homepage subject highlight rows.
 */
export async function fetchTaxonomyRoot(options?: {
  revalidate?: number;
  signal?: AbortSignal;
}): Promise<ApiTaxonomyRoot> {
  if (shouldUseMock()) {
    return mockFetchTaxonomyRoot();
  }

  return apiClient.get<ApiTaxonomyRoot>(ENDPOINTS.MARKETPLACE_TAXONOMY, {
    cache: "force-cache",
    next: {
      revalidate: options?.revalidate ?? REVALIDATE_CITIES_SECONDS,
      tags: ["marketplace:taxonomy"],
    },
    signal: options?.signal,
  });
}

/**
 * Fetch the full active discipline catalog. The root payload only
 * carries `featured_disciplines`; this endpoint returns every active
 * discipline (capped at 300 server-side) so the search sidebar and
 * pSEO route generation can enumerate the complete catalog.
 */
export async function fetchAllDisciplines(options?: {
  revalidate?: number;
  signal?: AbortSignal;
}): Promise<ApiListEnvelope<ApiDiscipline>> {
  if (shouldUseMock()) {
    return mockFetchAllDisciplines();
  }

  return apiClient.get<ApiListEnvelope<ApiDiscipline>>(
    ENDPOINTS.MARKETPLACE_TAXONOMY_DISCIPLINES,
    {
      cache: "force-cache",
      next: {
        revalidate: options?.revalidate ?? REVALIDATE_CITIES_SECONDS,
        tags: ["marketplace:taxonomy:disciplines"],
      },
      signal: options?.signal,
    },
  );
}

/**
 * Fetch the city + districts master list. Mostly static — 24-hour cache
 * window is fine, admins rarely add cities.
 */
export async function fetchCities(options?: {
  revalidate?: number;
  signal?: AbortSignal;
}): Promise<ApiListEnvelope<ApiCity>> {
  if (shouldUseMock()) {
    return mockFetchCities();
  }

  return apiClient.get<ApiListEnvelope<ApiCity>>(ENDPOINTS.MARKETPLACE_CITIES, {
    cache: "force-cache",
    next: {
      revalidate: options?.revalidate ?? REVALIDATE_CITIES_SECONDS,
      tags: ["marketplace:cities"],
    },
    signal: options?.signal,
  });
}

// ─── helpers ────────────────────────────────────────────────────────────────

function stripUndefined<T extends Record<string, unknown>>(
  source: T,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === "") continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}

function isApiNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && status === 404;
}

function isApiClientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && status >= 400 && status < 500;
}
