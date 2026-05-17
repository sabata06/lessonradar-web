/**
 * B7 + B8 teacher panel — shared types between server fetchers, BFF route
 * responses, and client submitters. Snake_case fields mirror the backend
 * payload from `docs/B4_LEAD_BACKEND_CONTRACT.md` + `B8_CONNECT_BACKEND_CONTRACT.md`.
 *
 * NOTE: this file is import-safe from client code — keep it type-only, no
 * server-only imports. Server-side fetchers live in `./server.ts`.
 */

export type TeacherLeadKind =
  | "premium_immediate"
  | "free_delayed"
  | "direct"
  | "direct_target"
  | "direct_backup";

export type TeacherLeadStatus =
  | "pending"
  | "notified"
  | "responded"
  | "declined"
  | "expired";

export type LockReason =
  | "not_visible_yet"
  | "already_responded"
  | "already_declined"
  | "lead_cancelled"
  | "lead_completed"
  | "quota_exceeded"
  | "lead_expired"
  | "recipient_inactive";

/** Customer-side contact preference echoed back to the teacher inbox (B8). */
export type ContactPreference =
  | "in_app"
  | "phone_reveal"
  | "whatsapp_reveal"
  | "any";

export interface TeacherQuotaPayload {
  period: string | null;
  used: number;
  limit: number;
  remaining: number;
  is_unlimited: boolean;
}

/**
 * Single inbox row as returned by `GET /api/teacher/leads/inbox/`.
 *
 * Privacy invariants enforced by backend:
 *  - `contact_phone_masked` only — never raw phone or email
 *  - `customer_label` is the customer's display label (first name + last initial)
 *  - When `customer_contact_preference === "in_app"` the masked phone should be
 *    hidden from the UI as well (KVKK consent reflection)
 */
export interface TeacherLeadRow {
  uuid: string; // recipient UUID
  lead_uuid: string;
  kind: TeacherLeadKind;
  status: TeacherLeadStatus;
  discipline_slug: string;
  discipline_name: string;
  city_slug: string;
  city_name: string;
  district_slug: string | null;
  district_name: string | null;
  customer_label: string;
  customer_contact_preference: ContactPreference;
  level: string;
  modality: string;
  budget_min: string | null;
  budget_max: string | null;
  preferred_schedule: string | null;
  notes: string | null;
  contact_phone_masked: string;
  visible_at: string | null;
  notified_at: string | null;
  responded_at: string | null;
  declined_at: string | null;
  can_respond: boolean;
  response_locked_reason: LockReason | "";
  thread_uuid: string | null;
  quota: TeacherQuotaPayload;
  created_at: string;
  updated_at: string;
}

export interface TeacherInboxPayload {
  count: number;
  quota: TeacherQuotaPayload;
  results: TeacherLeadRow[];
}

/* ──────────────────────── Server fetcher outcomes ──────────────────────── */

export type TeacherInboxFetchOutcome =
  | { ok: true; data: TeacherInboxPayload }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "network_error" };

export type TeacherLeadDetailOutcome =
  | { ok: true; row: TeacherLeadRow; quota: TeacherQuotaPayload }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "network_error" };

/* ──────────────────────── Client submitter contracts ──────────────────────── */

export type RespondErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "email_unverified"
  | "not_found"
  | "empty_body"
  | "body_too_long"
  | "quota_exceeded"
  | "lead_cancelled"
  | "lead_completed"
  | "lead_expired"
  | "already_responded"
  | "already_declined"
  | "not_visible_yet"
  | "recipient_inactive"
  | "throttle_respond"
  | "upstream_error"
  | "network_error";

export interface RespondRequest {
  message: string;
}

export type RespondResponse =
  | {
      ok: true;
      thread_uuid: string;
      recipient: TeacherLeadRow;
    }
  | {
      ok: false;
      error: RespondErrorCode;
      message?: string;
      status?: number;
    };

export type DeclineErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "already_declined"
  | "already_responded"
  | "lead_cancelled"
  | "lead_completed"
  | "lead_expired"
  | "recipient_inactive"
  | "upstream_error"
  | "network_error";

export interface DeclineRequest {
  reason?: string;
}

export type DeclineResponse =
  | { ok: true; recipient: TeacherLeadRow }
  | {
      ok: false;
      error: DeclineErrorCode;
      message?: string;
      status?: number;
    };
