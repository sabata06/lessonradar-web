import "server-only";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";

/**
 * Customer-owned lead detail payload from
 * `GET /api/customer/leads/<uuid>/` — see `docs/B4_LEAD_BACKEND_CONTRACT.md`.
 *
 * Only `offers` for recipients with `status="responded"` are returned. Pending,
 * notified, declined, and expired recipients are intentionally hidden so the
 * customer cannot infer how the fan-out is progressing teacher by teacher.
 *
 * Raw `contact_phone` / `contact_email` are never returned — only the masked
 * phone is included.
 */

export type LeadStatus =
  | "received"
  | "fanned_out"
  | "responded"
  | "converted"
  | "closed"
  | "cancelled"
  | "spam";

export type LeadOfferKind =
  | "premium_immediate"
  | "free_delayed"
  | "direct"
  | "premium_backup";

export interface OfferTeacherRating {
  average: number;
  count: number;
}

export interface OfferTeacherTrust {
  verified_identity: boolean;
  verified_diploma: boolean;
  premium: boolean;
  last_active_at: string | null;
  median_response_minutes: number;
}

export interface OfferTeacherSpecialty {
  discipline_slug: string;
  discipline_name?: string;
  hourly_min?: string | number | null;
  hourly_max?: string | number | null;
  is_primary?: boolean;
}

export interface OfferTeacher {
  id: number | string;
  slug: string;
  display_name: string;
  headline: string;
  city_slug?: string | null;
  city_name?: string | null;
  district_slug?: string | null;
  district_name?: string | null;
  specialties: OfferTeacherSpecialty[];
  hourly_rate?: string | number | null;
  profile_image_url?: string | null;
  rating: OfferTeacherRating;
  trust: OfferTeacherTrust;
}

export interface LeadOffer {
  uuid: string;
  kind: LeadOfferKind;
  status: "responded";
  response_message: string;
  responded_at: string;
  teacher: OfferTeacher;
}

export interface LeadDetail {
  uuid: string;
  status: LeadStatus;
  discipline_slug: string;
  discipline_name?: string;
  city_slug: string;
  city_name?: string;
  district_slug?: string | null;
  district_name?: string | null;
  target_teacher: { slug: string; full_name: string } | null;
  level: string;
  modality: string;
  budget_min?: string | null;
  budget_max?: string | null;
  preferred_schedule?: string | null;
  notes?: string | null;
  contact_phone_masked?: string;
  recipient_count: number;
  responded_count: number;
  can_cancel: boolean;
  cancelled_at: string | null;
  cancel_reason: string;
  offers: LeadOffer[];
  created_at: string;
  updated_at: string;
}

export type LeadDetailFetchOutcome =
  | { ok: true; data: LeadDetail }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "network_error" };

/**
 * Fetch a single customer lead with offers.
 *
 * Returns a tagged union so the caller can distinguish between "not signed in",
 * "this lead doesn't belong to you / doesn't exist" (both surface as 404 by
 * design — enumeration safe), and a transient upstream failure. The detail
 * page renders `notFound()` for 404 and an error state for network errors.
 */
export async function fetchCustomerLeadDetail(
  uuid: string,
): Promise<LeadDetailFetchOutcome> {
  const session = await getSession();
  if (!session) {
    return { ok: false, reason: "unauthorized" };
  }
  try {
    const data = await apiClient.get<LeadDetail>(
      ENDPOINTS.LEAD_CUSTOMER_DETAIL(uuid),
      { accessToken: session.djangoAccess },
    );
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return { ok: false, reason: "not_found" };
      if (error.status === 401) return { ok: false, reason: "unauthorized" };
      if (error.status === 403) return { ok: false, reason: "forbidden" };
    }
    return { ok: false, reason: "network_error" };
  }
}

/** Normalized client-facing error codes for cancel. */
export type CancelLeadErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "not_cancellable"
  | "upstream_error"
  | "network_error";

export interface CancelLeadRequest {
  reason?: string;
}

export type CancelLeadResponse =
  | { ok: true; lead: LeadDetail }
  | { ok: false; error: CancelLeadErrorCode; message?: string; status?: number };
