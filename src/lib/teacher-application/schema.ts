import { z } from "zod";

import { normalizeTrPhone } from "@/lib/lead/schema";

/**
 * Source of truth for teacher application validation. Reused by the
 * client form (UX errors) and the Route Handler (server rejections).
 *
 * First-iteration scope (intentional, see PHASE notes):
 *   - No file uploads — storage provider (R2/S3/MinIO) is an open
 *     decision. Identity & diploma documents land in a follow-up flow.
 *   - No earnings projections, no auto-acceptance.
 *   - Verification step is collected by intent only ("uploadable later");
 *     copy must say "ekibimiz inceler" rather than "anında onaylanır".
 *
 * Backend swap path: server-side route forwards parsed payload to
 * Django, which provisions a draft `Teacher` row in `pending_review`
 * status. Slug claim happens at admin-approval time.
 */

const TR_PHONE_REGEX = /^(\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}$/;

export const TEACHING_MODALITIES = ["in_person", "online"] as const;
export type TeachingModality = (typeof TEACHING_MODALITIES)[number];

export const teacherApplicationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "fullname_too_short")
      .max(80, "fullname_too_long"),
    headline: z
      .string()
      .trim()
      .min(10, "headline_too_short")
      .max(120, "headline_too_long"),
    bio: z
      .string()
      .trim()
      .min(60, "bio_too_short")
      .max(1500, "bio_too_long"),
    contactPhone: z
      .string()
      .min(10, "phone_invalid")
      .regex(TR_PHONE_REGEX, "phone_invalid")
      .transform((v, ctx) => {
        const norm = normalizeTrPhone(v);
        if (!norm) {
          ctx.addIssue({ code: "custom", message: "phone_invalid" });
          return z.NEVER;
        }
        return norm;
      }),
    contactEmail: z.string().email("email_invalid"),
    yearsExperience: z
      .union([z.number().int().min(0).max(60), z.nan()])
      .transform((v) => (Number.isNaN(v) ? 0 : v)),
    hourlyMin: z
      .number({ message: "hourly_required" })
      .int()
      .min(50, "hourly_too_low")
      .max(20000, "hourly_too_high"),
    hourlyMax: z
      .number({ message: "hourly_required" })
      .int()
      .min(50, "hourly_too_low")
      .max(20000, "hourly_too_high"),
    disciplineSlugs: z
      .array(z.string().min(1))
      .min(1, "disciplines_required")
      .max(8, "disciplines_too_many"),
    citySlug: z.string().min(1, "city_required"),
    districtSlug: z.string().optional(),
    modalities: z
      .array(z.enum(TEACHING_MODALITIES))
      .min(1, "modality_required"),
    referralSource: z.string().max(120).optional(),
    consentKvkk: z.literal(true, { message: "kvkk_required" }),
    consentTeacherTerms: z.literal(true, {
      message: "teacher_terms_required",
    }),
  })
  .refine((d) => d.hourlyMin <= d.hourlyMax, {
    message: "hourly_range_invalid",
    path: ["hourlyMax"],
  });

export type TeacherApplicationInput = z.input<typeof teacherApplicationSchema>;
export type TeacherApplicationPayload = z.output<typeof teacherApplicationSchema>;

export interface TeacherApplicationResponseOk {
  ok: true;
  id: string;
  receivedAt: string;
}

export interface TeacherApplicationResponseError {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export type TeacherApplicationResponse =
  | TeacherApplicationResponseOk
  | TeacherApplicationResponseError;
