/**
 * Account data shapes — backend response mirror + discriminated outcomes for
 * the /ayarlar surface and /panel mini-profile card.
 *
 * Snake_case matches Django serializers exactly. Camel-cased view models live
 * in components when they need transformed values; this file is the raw wire
 * shape.
 */

export type AuthProvider = "email" | "google" | "apple";

/** GET /api/auth/profile/ (ProfileSerializer). */
export interface AccountProfilePayload {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  profile_image_url: string | null;
  role: "customer" | "teacher" | "admin" | null;
  account_status: string;
  onboarding_status: string;
  auth_provider: AuthProvider | null;
  locale: string;
  is_email_verified: boolean;
  has_usable_password: boolean;
  auth_methods: string[];
  apple_uses_private_email_relay: boolean;
}

/** GET /api/auth/customer-profile/ (CustomerProfileSerializer). */
export interface AccountCustomerProfilePayload {
  id: number;
  display_name: string;
  phone_code: string;
  phone_number: string;
  phone_display: string;
  phone_e164: string | null;
  city: string;
  district: string;
  profile_image_url: string | null;
  learner_count: number;
  updated_at: string;
  birth_date: string | null;
  address: string;
  school_name: string;
  grade: string;
  subjects: string;
  subjects_list: string[];
  parent_name: string;
  parent_phone_code: string;
  parent_phone: string;
  parent_email: string;
  completion_percentage: number;
}

/** GET /api/notification-preferences/ — single payload covers both roles; the
 * customer UI consumes a subset, but the wire shape carries every field so
 * teacher pages can reuse the same fetcher later. */
export interface AccountNotificationPayload {
  push_notifications_enabled: boolean;
  lesson_reminder_enabled: boolean;
  lesson_reminder_minutes: number;
  daily_summary_enabled: boolean;
  daily_summary_hour: number;
  payment_reminder_enabled: boolean;
  payment_reminder_days: number;
  overdue_payment_enabled: boolean;
  assignment_reminder_enabled: boolean;
  assignment_reminder_days: number;
  lesson_updates_enabled: boolean;
  lesson_change_updates_enabled: boolean;
  enrollment_updates_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  user_role: "customer" | "teacher" | null;
  available_sections: string[];
}

/** Combined snapshot used by the /ayarlar landing page + /panel mini-card.
 * Calling code can pick what it needs; fetcher batches the round-trips. */
export interface AccountSummary {
  profile: AccountProfilePayload;
  customer: AccountCustomerProfilePayload | null;
}

/** Tagged-union fetch outcome. Used uniformly across server fetchers so pages
 * can distinguish a real 404/forbidden from a transient blip and never
 * silently fall back to a half-rendered shell. */
export type AccountFetchOutcome<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "network_error" };

// ── Update payloads (PATCH body shape) ────────────────────────────────────

export interface ProfileUpdatePayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  locale?: string;
}

export interface CustomerProfileUpdatePayload {
  phone_code?: string;
  phone_number?: string;
  birth_date?: string | null;
  address?: string;
  school_name?: string;
  grade?: string;
  subjects?: string;
  parent_name?: string;
  parent_phone_code?: string;
  parent_phone?: string;
  parent_email?: string;
  city?: string;
  district?: string;
}

export interface ChangePasswordPayload {
  current_password?: string;
  new_password: string;
  new_password_confirm: string;
}

export interface NotificationsUpdatePayload {
  push_notifications_enabled?: boolean;
  lesson_updates_enabled?: boolean;
  lesson_change_updates_enabled?: boolean;
  enrollment_updates_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

// ── Error code unions ──────────────────────────────────────────────────────
//
// Every BFF mutation returns a discriminated `{ ok: false; code: ... }` shape
// so the client can map codes to i18n keys without parsing free-form Django
// error strings. New codes added here MUST get an i18n entry in
// `account.errors.<code>` (TR + EN) before the surface lands in production.

export type ProfileUpdateErrorCode =
  | "unauthorized"
  | "forbidden"
  | "email_invalid"
  | "email_already_in_use"
  | "first_name_invalid"
  | "last_name_invalid"
  | "locale_invalid"
  | "validation_error"
  | "network_error"
  | "unknown";

export type CustomerProfileUpdateErrorCode =
  | "unauthorized"
  | "forbidden"
  | "phone_invalid"
  | "phone_code_invalid"
  | "parent_phone_invalid"
  | "parent_email_invalid"
  | "birth_date_invalid"
  | "validation_error"
  | "network_error"
  | "unknown";

export type AvatarUploadErrorCode =
  | "unauthorized"
  | "forbidden"
  | "file_too_large"
  | "file_type_invalid"
  | "file_required"
  | "upload_failed"
  | "network_error"
  | "unknown";

export type ChangePasswordErrorCode =
  | "unauthorized"
  | "current_password_required"
  | "current_password_incorrect"
  | "new_password_too_weak"
  | "new_password_too_short"
  | "new_password_same_as_current"
  | "new_password_mismatch"
  | "validation_error"
  | "network_error"
  | "unknown";

export type DeleteAccountErrorCode =
  | "unauthorized"
  | "already_requested"
  | "validation_error"
  | "network_error"
  | "unknown";

export type NotificationsUpdateErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_value"
  | "validation_error"
  | "network_error"
  | "unknown";

// ── Discriminated mutation responses ──────────────────────────────────────

export type ProfileUpdateResponse =
  | { ok: true; data: AccountProfilePayload; emailChanged: boolean }
  | { ok: false; code: ProfileUpdateErrorCode; fieldErrors?: Record<string, string[]> };

export type CustomerProfileUpdateResponse =
  | { ok: true; data: AccountCustomerProfilePayload }
  | {
      ok: false;
      code: CustomerProfileUpdateErrorCode;
      fieldErrors?: Record<string, string[]>;
    };

export type AvatarUploadResponse =
  | { ok: true; data: AccountCustomerProfilePayload }
  | { ok: false; code: AvatarUploadErrorCode };

export type ChangePasswordResponse =
  | { ok: true }
  | {
      ok: false;
      code: ChangePasswordErrorCode;
      fieldErrors?: Record<string, string[]>;
    };

export type DeleteAccountResponse =
  | { ok: true; alreadyRequested: boolean; scheduledFor: string | null }
  | { ok: false; code: DeleteAccountErrorCode };

export type NotificationsUpdateResponse =
  | { ok: true; data: AccountNotificationPayload }
  | {
      ok: false;
      code: NotificationsUpdateErrorCode;
      fieldErrors?: Record<string, string[]>;
    };
