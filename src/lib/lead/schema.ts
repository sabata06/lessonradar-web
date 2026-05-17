import { z } from "zod";

/**
 * Source of truth for lead request validation.
 *
 * B4 contract (see `docs/B4_LEAD_BACKEND_CONTRACT.md`): the backend takes
 * `contact_email` from `request.user.email`, so the form no longer collects
 * email. Phone stays required and is normalized to `+90…`.
 */

export const STUDENT_LEVELS = [
  "primary",
  "middle",
  "high",
  "lgs",
  "yks",
  "kpss",
  "university",
  "adult",
  "other",
] as const;

export const MODALITIES = ["in_person", "online", "either"] as const;

/**
 * B8 customer contact preference. Set at lead creation, immutable for the
 * lifetime of that lead — customer must create a new lead to change channel.
 * See `docs/B8_CONNECT_BACKEND_CONTRACT.md`.
 *   - `in_app`          → site/app içi mesajlaşma, telefon hiç açılmaz
 *   - `phone_reveal`    → customer "ilerle" der, mutual phone reveal
 *   - `whatsapp_reveal` → aynı reveal, UI WhatsApp'ı vurgular
 *   - `any`             → teacher'ın tercihi hint olarak gösterilir, customer seçer
 */
export const CONTACT_PREFERENCES = [
  "in_app",
  "phone_reveal",
  "whatsapp_reveal",
  "any",
] as const;

export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

/** Active KVKK consent text version. Bump when the consent copy changes. */
export const KVKK_CONSENT_VERSION = "2026-05";

/** TR cep telefon formatları:  +905XXXXXXXXX, 05XXXXXXXXX, 5XXXXXXXXX, ya da boşluklu varyantlar */
const TR_PHONE_REGEX = /^(\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}$/;

export function normalizeTrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let core = digits;
  if (core.startsWith("90") && core.length === 12) core = core.slice(2);
  else if (core.startsWith("0") && core.length === 11) core = core.slice(1);
  if (core.length !== 10 || !core.startsWith("5")) return null;
  return `+90${core}`;
}

export const leadRequestSchema = z
  .object({
    disciplineSlug: z.string().min(1),
    level: z.enum(STUDENT_LEVELS),
    citySlug: z.string().min(1),
    districtSlug: z.string().optional(),
    teacherSlug: z.string().optional(),
    modality: z.enum(MODALITIES),
    budgetMin: z
      .union([z.number().int().min(0).max(100000), z.nan()])
      .optional()
      .transform((v) => (v === undefined || Number.isNaN(v) ? undefined : v)),
    budgetMax: z
      .union([z.number().int().min(0).max(100000), z.nan()])
      .optional()
      .transform((v) => (v === undefined || Number.isNaN(v) ? undefined : v)),
    preferredSchedule: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    contactPhone: z
      .string()
      .min(10)
      .regex(TR_PHONE_REGEX, "phone_invalid")
      .transform((v, ctx) => {
        const norm = normalizeTrPhone(v);
        if (!norm) {
          ctx.addIssue({ code: "custom", message: "phone_invalid" });
          return z.NEVER;
        }
        return norm;
      }),
    customerContactPreference: z.enum(CONTACT_PREFERENCES, {
      message: "contact_preference_required",
    }),
    consentKvkk: z.literal(true, {
      message: "kvkk_required",
    }),
  })
  .refine(
    (d) => d.budgetMin === undefined || d.budgetMax === undefined || d.budgetMin <= d.budgetMax,
    { message: "budget_range_invalid", path: ["budgetMax"] },
  );

export type LeadRequestInput = z.input<typeof leadRequestSchema>;
export type LeadRequestPayload = z.output<typeof leadRequestSchema>;

/**
 * Snake-case API payload sent to Django. Matches the contracts in
 * `docs/B4_LEAD_BACKEND_CONTRACT.md` (B4) +
 * `docs/B8_CONNECT_BACKEND_CONTRACT.md` (B8 `customer_contact_preference`).
 */
export interface LeadCreateApiPayload {
  discipline_slug: string;
  city_slug: string;
  district_slug?: string;
  teacher_slug?: string;
  level: (typeof STUDENT_LEVELS)[number];
  modality: (typeof MODALITIES)[number];
  budget_min?: string;
  budget_max?: string;
  preferred_schedule?: string;
  notes?: string;
  contact_phone: string;
  customer_contact_preference: ContactPreference;
  consent_kvkk: true;
  consent_kvkk_version: string;
  source: "web";
}

export function toApiPayload(p: LeadRequestPayload): LeadCreateApiPayload {
  return {
    discipline_slug: p.disciplineSlug,
    city_slug: p.citySlug,
    district_slug: p.districtSlug || undefined,
    teacher_slug: p.teacherSlug || undefined,
    level: p.level,
    modality: p.modality,
    budget_min: p.budgetMin !== undefined ? String(p.budgetMin) : undefined,
    budget_max: p.budgetMax !== undefined ? String(p.budgetMax) : undefined,
    preferred_schedule: p.preferredSchedule || undefined,
    notes: p.notes || undefined,
    contact_phone: p.contactPhone,
    customer_contact_preference: p.customerContactPreference,
    consent_kvkk: true,
    consent_kvkk_version: KVKK_CONSENT_VERSION,
    source: "web",
  };
}

/** Backend lead row (subset surfaced to client). */
export interface LeadApiRow {
  uuid: string;
  status: string;
  discipline_slug: string;
  discipline_name?: string;
  city_slug: string;
  city_name?: string;
  district_slug?: string | null;
  district_name?: string | null;
  target_teacher?: { slug: string; full_name: string } | null;
  level?: string;
  modality?: string;
  budget_min?: string | null;
  budget_max?: string | null;
  preferred_schedule?: string | null;
  notes?: string | null;
  contact_phone_masked?: string;
  contact_email?: string;
  customer_contact_preference?: ContactPreference;
  recipient_count: number;
  responded_count: number;
  created_at: string;
  updated_at?: string;
}

export interface LeadCreateApiResponse {
  lead: LeadApiRow;
  notified_count: number;
}

/**
 * Response shape returned by the web BFF `/api/leads` POST. Error codes are
 * normalized so the client form can render the right state without parsing
 * Django's raw error payloads.
 */
export type LeadSubmitErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "email_unverified"
  | "forbidden"
  | "invalid_slug"
  | "kvkk_required"
  | "phone_invalid"
  | "phone_velocity"
  | "invalid_target_teacher"
  | "invalid_contact_preference"
  | "upstream_error"
  | "network_error"
  | "unknown_error";

export interface LeadSubmitResponseOk {
  ok: true;
  lead: LeadApiRow;
  notifiedCount: number;
}

export interface LeadSubmitResponseError {
  ok: false;
  error: LeadSubmitErrorCode;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  status?: number;
}

export type LeadSubmitResponse = LeadSubmitResponseOk | LeadSubmitResponseError;
