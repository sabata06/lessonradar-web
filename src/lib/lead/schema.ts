import { z } from "zod";

/**
 * Source of truth for lead request validation. Both the client form and the
 * Route Handler (/api/lead) reuse this so client UX errors mirror server-
 * side rejections exactly.
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

/** TR cep telefon formatları:  +905XXXXXXXXX, 05XXXXXXXXX, 5XXXXXXXXX, ya da boşluklu varyantlar */
const TR_PHONE_REGEX = /^(\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}$/;

export function normalizeTrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // strip leading 90 or 0 to get the 10-digit core
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
    contactEmail: z
      .string()
      .email()
      .optional()
      .or(z.literal("").transform(() => undefined)),
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

export interface LeadSubmitResponseOk {
  ok: true;
  id: string;
  receivedAt: string;
}

export interface LeadSubmitResponseError {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export type LeadSubmitResponse = LeadSubmitResponseOk | LeadSubmitResponseError;
