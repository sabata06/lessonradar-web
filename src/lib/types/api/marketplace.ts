/**
 * Direct mirror of the Django REST Framework `marketplace_profile` serializer
 * output. Keep field names + casing identical to the backend payload — these
 * types describe wire shape, not what the rest of the web app consumes.
 *
 * Web view-models live in `src/lib/types/teacher.ts`. The `adaptTeacher()`
 * helper converts API → view-model, so components stay decoupled from the
 * backend's snake_case + nested-signal contract.
 *
 * Source of truth: `backend/lessonradar/serializers/marketplace_profile.py`.
 * If you add a field there, add it here AND in the adapter. Drift between
 * the two is a bug.
 */

export type ApiSlug = string;

/** Nested rating block — `{average:null, count:0}` when no published reviews. */
export interface ApiRating {
  average: number | null;
  count: number;
}

/** Nested trust block — boolean flags + denormalized aggregate signals. */
export interface ApiTrust {
  verified_identity: boolean;
  verified_diploma: boolean;
  premium: boolean;
  /** ISO-8601 string or null. Backend sends as JSON datetime. */
  last_active_at: string | null;
  /** Median minutes to first reply. Null until aggregate job runs. */
  median_response_minutes: number | null;
}

/**
 * One marketplace specialty entry inside a teacher payload. The
 * `facet_option_*` fields carry taxonomy-driven extras that the web
 * doesn't render today but exposes for forward compatibility.
 */
export interface ApiSpecialty {
  discipline_slug: ApiSlug;
  /** Localized name as picked by `Accept-Language` header. */
  discipline_name: string;
  discipline_name_tr: string;
  discipline_name_en: string;
  domain_slug: ApiSlug;
  sort_order: number;
  /** Decimal-as-string ("300.00") or null when no per-disc rate set. */
  hourly_rate_min: string | null;
  hourly_rate_max: string | null;
  is_primary: boolean;
  /** facet_key → option_value[] (e.g. `{age_group: ["adult"]}`). */
  facet_option_values: Record<string, string[]>;
  /** facet_key → localized_label[] paired with the value array. */
  facet_option_labels: Record<string, string[]>;
}

/** Public review payload as exposed on the detail endpoint. */
export interface ApiReview {
  id: number;
  rating: number;
  comment: string;
  reviewer_label: string;
  is_verified_review: boolean;
  /** ISO-8601 datetime. */
  created_at: string;
}

/**
 * `/api/marketplace/teachers/` row shape.
 *
 * `subjects` / `grade_levels` / `lesson_modes` are token-list arrays
 * (legacy taxonomy). `specialties[]` is the structured taxonomy-driven
 * replacement and is what new web code should read.
 */
export interface ApiTeacherListItem {
  id: number;
  slug: ApiSlug;
  display_name: string;
  headline: string;
  city: string;
  district: string;
  city_slug: ApiSlug | null;
  district_slug: ApiSlug | null;
  subjects: string[];
  grade_levels: string[];
  specialties: ApiSpecialty[];
  primary_discipline_slug: ApiSlug | null;
  lesson_modes: string[];
  hourly_rate: string | null;
  years_of_experience: number | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  rating: ApiRating;
  trust: ApiTrust;
  /** ISO-8601 datetime, null until first publish. */
  published_at: string | null;
}

/**
 * `/api/marketplace/teachers/<id>/` and `/by-slug/<slug>/` shape.
 * Strict superset of `ApiTeacherListItem` — adds `bio`, contact channels,
 * and `reviews[]`.
 */
export interface ApiTeacherDetail extends ApiTeacherListItem {
  bio: string;
  contact_methods: string[];
  /** Only populated when `email` is in `contact_methods`, else null. */
  public_email: string | null;
  /** Only populated when `phone` is in `contact_methods`, else null. */
  public_phone_code: string | null;
  public_phone_number: string | null;
  public_phone_display: string | null;
  public_phone_e164: string | null;
  supports_in_app_messages: boolean;
  reviews: ApiReview[];
  updated_at: string;
}

/** Envelope shape for both list and city endpoints. */
export interface ApiListEnvelope<T> {
  count: number;
  results: T[];
}

/** `/api/marketplace/taxonomy/` domain row. */
export interface ApiDomain {
  slug: ApiSlug;
  name: string;
  name_tr: string;
  name_en: string;
  description: string;
  description_tr: string;
  description_en: string;
  sort_order: number;
  /** Discipline count, only present on root taxonomy response. */
  discipline_count?: number | null;
}

/** `/api/marketplace/taxonomy/` discipline row (with nested domain). */
export interface ApiDiscipline {
  slug: ApiSlug;
  name: string;
  name_tr: string;
  name_en: string;
  description: string;
  description_tr: string;
  description_en: string;
  is_featured: boolean;
  sort_order: number;
  domain: ApiDomain;
  /** Search match origin label, only set on the search endpoint. */
  match_source?: string | null;
}

/**
 * `/api/marketplace/taxonomy/` root response.
 * `featured_disciplines` is the curated quick-pick subset; `domains`
 * carries the full domain catalog sorted by `sort_order`.
 *
 * NOTE: the root endpoint does NOT return the full discipline list — to
 * load all disciplines, the search endpoint with a 2+ char query is
 * needed (or a future `/disciplines/` index endpoint). For the current
 * web use-cases (sidebar dropdown + quick chips + pSEO routes), the
 * featured set is enough; extend this shape if/when that changes.
 */
export interface ApiTaxonomyRoot {
  domains: ApiDomain[];
  featured_disciplines: ApiDiscipline[];
  meta: {
    max_discipline_count: number;
  };
}

/** `/api/marketplace/cities/` district row. */
export interface ApiDistrict {
  slug: ApiSlug;
  name_tr: string;
  name_en: string;
}

/** `/api/marketplace/cities/` city row with nested districts. */
export interface ApiCity {
  slug: ApiSlug;
  name_tr: string;
  name_en: string;
  is_priority: boolean;
  latitude: string | null;
  longitude: string | null;
  districts: ApiDistrict[];
}

/**
 * Filter dictionary accepted by the discovery list endpoint. Key names
 * line up with `TeacherDiscoveryQuerySerializer` so the web can pass
 * filters straight through without renaming.
 */
export interface ApiTeacherListFilters {
  q?: string;
  discipline?: ApiSlug;
  facet_option?: string[];
  subject?: string;
  level?: string;
  city?: string;
  district?: string;
  mode?: string;
  verified?: boolean | "1" | "true";
  min_price?: number | string;
  max_price?: number | string;
}
