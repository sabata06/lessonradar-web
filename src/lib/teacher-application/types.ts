/**
 * Wire shape of `/api/teacher-applications/*` responses.
 *
 * Mirrors `TeacherApplicationSerializer` exactly (snake_case). Web consumers
 * project into a camelCase view-model via `toViewModel()` so component code
 * stays idiomatic.
 */

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_changes"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ApplicationModality = "" | "in_person" | "online" | "hybrid";

export interface SpecialtyMetadataItem {
  slug: string;
  hourly_min?: number | null;
  hourly_max?: number | null;
}

export interface FacetSelectionMetadataItem {
  discipline_slug: string;
  facet_key: string;
  option_value: string;
}

export interface ApplicationMetadata {
  specialty_disciplines?: SpecialtyMetadataItem[];
  facet_selections?: FacetSelectionMetadataItem[];
  service_areas?: string[];
  languages?: string[];
  levels?: string[];
  exam_types?: string[];
  [key: string]: unknown;
}

export interface ApplicationApiPayload {
  uuid: string;
  status: ApplicationStatus;
  current_step: number;
  completed_steps: number[];
  last_saved_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string;
  full_name: string;
  primary_discipline_slug?: string;
  primary_discipline_slug_out: string | null;
  city_slug?: string;
  city_slug_out: string | null;
  district_slug?: string;
  district_slug_out: string | null;
  modality: ApplicationModality;
  headline: string;
  about_lessons: string;
  about_teacher: string;
  years_of_experience: number | null;
  hourly_rate_min: string | null;
  hourly_rate_max: string | null;
  contact_phone_code: string;
  contact_phone: string;
  contact_email: string;
  metadata: ApplicationMetadata;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationPatchPayload = Partial<{
  current_step: number;
  completed_steps: number[];
  full_name: string;
  primary_discipline_slug: string;
  city_slug: string;
  district_slug: string;
  modality: ApplicationModality;
  headline: string;
  about_lessons: string;
  about_teacher: string;
  years_of_experience: number | null;
  hourly_rate_min: number | string | null;
  hourly_rate_max: number | string | null;
  contact_phone_code: string;
  contact_phone: string;
  contact_email: string;
  metadata: ApplicationMetadata;
  kvkk_version: string;
  terms_version: string;
  teacher_agreement_version: string;
}>;

export interface ApplicationFieldErrorEnvelope {
  error?: string;
  detail?: Record<string, string[] | string>;
  field_errors?: Record<string, string>;
  available_at?: string;
}

/** Convert the backend payload to a flat camelCase form-friendly view model. */
export function toViewModel(api: ApplicationApiPayload) {
  return {
    uuid: api.uuid,
    status: api.status,
    currentStep: api.current_step,
    completedSteps: api.completed_steps ?? [],
    lastSavedAt: api.last_saved_at,
    submittedAt: api.submitted_at,
    reviewedAt: api.reviewed_at,
    reviewNotes: api.review_notes,
    fullName: api.full_name,
    primaryDisciplineSlug: api.primary_discipline_slug_out ?? "",
    citySlug: api.city_slug_out ?? "",
    districtSlug: api.district_slug_out ?? "",
    modality: api.modality,
    headline: api.headline,
    aboutLessons: api.about_lessons,
    aboutTeacher: api.about_teacher,
    yearsOfExperience: api.years_of_experience ?? null,
    hourlyRateMin: api.hourly_rate_min ? Number(api.hourly_rate_min) : null,
    hourlyRateMax: api.hourly_rate_max ? Number(api.hourly_rate_max) : null,
    contactPhoneCode: api.contact_phone_code || "+90",
    contactPhone: api.contact_phone,
    contactEmail: api.contact_email,
    metadata: api.metadata ?? {},
    profileImage: api.profile_image,
  };
}

export type ApplicationViewModel = ReturnType<typeof toViewModel>;
