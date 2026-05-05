/**
 * Web-collected lesson request. Created without app install per product rule.
 * Backend mapping is open (LeadRequest vs reuse of EnrollmentRequest) — keep
 * the shape neutral so we can adapt.
 */
export type StudentLevel =
  | "primary"
  | "middle"
  | "high"
  | "yks"
  | "lgs"
  | "kpss"
  | "university"
  | "adult"
  | "other";

export type LeadStatus = "draft" | "verifying" | "active" | "matched" | "closed";

export interface LeadRequestDraft {
  disciplineSlug: string;
  level: StudentLevel;
  citySlug: string;
  districtSlug?: string;
  modality: "in_person" | "online" | "either";
  budgetMin?: number;
  budgetMax?: number;
  preferredSchedule?: string;
  notes?: string;
  contactPhone: string;
  contactEmail?: string;
  consentKvkk: boolean;
}

export interface LeadRequest extends LeadRequestDraft {
  id: string;
  status: LeadStatus;
  createdAt: string;
  verifiedAt?: string;
}
