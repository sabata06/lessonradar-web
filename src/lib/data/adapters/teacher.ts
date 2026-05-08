/**
 * Adapt the backend marketplace API payload to the view-model shape the
 * rest of the web app already understands. Centralizing the conversion
 * here lets components stay decoupled from the wire format — when we
 * later flatten the view-model or rename fields, this file is the only
 * place that has to change.
 *
 * Conversion notes:
 *   - Decimal fields arrive as strings ("300.00"); we parse to number.
 *   - `lesson_modes` is a token list ([online, yuzyuze]); we collapse
 *     it to a single primary `modality` for the existing TeacherCard UI.
 *     This drops information the new design might want — when a card
 *     starts rendering both modalities, switch the view-model.
 *   - `profileCompleteness` isn't a real backend field; we synthesise it
 *     from a small set of trust + content signals. The web's pSEO quality
 *     score consumer reads this value, so the heuristic must stay stable
 *     across calls (deterministic).
 */
import type {
  ApiCity,
  ApiDistrict,
  ApiTeacherDetail,
  ApiTeacherListItem,
} from "@/lib/types/api/marketplace";
import type { City, District } from "@/lib/types/location";
import type {
  LessonModality,
  TeacherDisciplineSummary,
  TeacherProfile,
} from "@/lib/types/teacher";

// Default fallback image; tracked once here so the rendering layer
// doesn't paper over a missing avatar with its own opinion.
const FALLBACK_AVATAR_URL = "/og/default.png";

export function adaptTeacher(
  api: ApiTeacherListItem | ApiTeacherDetail,
): TeacherProfile {
  const detail = isDetail(api) ? api : null;
  const baseHourly = parseDecimal(api.hourly_rate);
  const disciplines = api.specialties.map((spec): TeacherDisciplineSummary => {
    const min =
      parseDecimal(spec.hourly_rate_min) ?? baseHourly ?? 0;
    const max =
      parseDecimal(spec.hourly_rate_max) ?? baseHourly ?? min;
    return {
      disciplineSlug: spec.discipline_slug,
      hourlyMin: min,
      hourlyMax: max < min ? min : max,
    };
  });

  return {
    id: String(api.id),
    slug: api.slug,
    fullName: api.display_name,
    headline: api.headline,
    bio: detail?.bio ?? "",
    avatarUrl: api.profile_image_url ?? api.avatar_url ?? FALLBACK_AVATAR_URL,
    citySlug: api.city_slug ?? "",
    districtSlug: api.district_slug ?? undefined,
    modality: pickModality(api.lesson_modes),
    yearsOfExperience: api.years_of_experience ?? 0,
    disciplines,
    primaryDisciplineSlug:
      api.primary_discipline_slug ?? disciplines[0]?.disciplineSlug ?? "",
    trust: {
      isVerified:
        api.trust.verified_identity && api.trust.verified_diploma,
      identityVerified: api.trust.verified_identity,
      diplomaVerified: api.trust.verified_diploma,
      ratingAverage: api.rating.average ?? 0,
      reviewCount: api.rating.count,
      responseTimeMinutes: api.trust.median_response_minutes ?? 0,
      lastActiveAt: api.trust.last_active_at ?? "",
    },
    isPremium: api.trust.premium,
    profileCompleteness: computeCompleteness(api),
  };
}

export function adaptCity(api: ApiCity): City {
  return {
    slug: api.slug,
    nameTr: api.name_tr,
    nameEn: api.name_en,
    // `plateCode` lives only in the legacy mock; the backend doesn't
    // model it. Components that read it must already tolerate undefined.
    plateCode: 0,
    isPriority: api.is_priority,
  };
}

export function adaptDistrict(api: ApiDistrict, citySlug: string): District {
  return {
    slug: api.slug,
    citySlug,
    nameTr: api.name_tr,
    nameEn: api.name_en,
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function isDetail(
  payload: ApiTeacherListItem | ApiTeacherDetail,
): payload is ApiTeacherDetail {
  return "bio" in payload;
}

function parseDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickModality(modes: string[]): LessonModality {
  const hasOnline = modes.includes("online");
  const hasInPerson = modes.includes("yuzyuze");
  if (hasOnline && hasInPerson) return "hybrid";
  if (hasOnline) return "online";
  if (hasInPerson) return "in_person";
  // Neither token present (incomplete profile or new modality): default
  // to hybrid so search filters don't surprise-exclude these teachers.
  return "hybrid";
}

/**
 * Synthetic completeness score for the pSEO quality gate. Stable across
 * calls so the same profile always reaches the same index/noindex verdict.
 *
 * Weights are intentionally conservative — even a fully-published profile
 * without reviews tops out at ~80, so a fresh teacher with one review and
 * a primary specialty earns indexability.
 */
function computeCompleteness(
  api: ApiTeacherListItem | ApiTeacherDetail,
): number {
  let score = 0;
  if (api.specialties.length > 0) score += 20;
  if (
    api.specialties.some(
      (s) => parseDecimal(s.hourly_rate_min) || parseDecimal(s.hourly_rate_max),
    ) ||
    parseDecimal(api.hourly_rate)
  ) {
    score += 15;
  }
  if (api.rating.count > 0) score += 20;
  if (api.profile_image_url || api.avatar_url) score += 15;
  if ((api.years_of_experience ?? 0) > 0) score += 10;
  if (isDetail(api) && api.bio.length >= 80) score += 10;
  if (api.trust.verified_identity) score += 5;
  if (api.trust.verified_diploma) score += 5;
  return Math.min(score, 100);
}
