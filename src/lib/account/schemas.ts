import { z } from "zod";

/**
 * Zod schemas for the /ayarlar surface. Every validation message is a stable
 * error code (e.g. `"first_name_required"`) — never user-facing copy. The
 * form layer renders these through a `fieldErrorMessage(code)` helper that
 * maps to `account.errors.<code>` i18n keys, mirroring the LeadForm pattern
 * locked on 2026-05-18. New codes added here MUST get an i18n entry before
 * shipping.
 *
 * Grade option values mirror the mobile `ProfileSettings.js` Turkish labels
 * verbatim — backend stores the free-form string and rendering downstream is
 * matched on the same set. Adding a new locale label here without changing
 * the app would split the population set; keep them in sync.
 */

// ── Profile (base) ────────────────────────────────────────────────────────

export const profileFormSchema = z.object({
  email: z
    .string({ message: "email_required" })
    .trim()
    .min(1, { message: "email_required" })
    .email({ message: "email_invalid" })
    .max(254, { message: "email_too_long" }),
  firstName: z
    .string({ message: "first_name_required" })
    .trim()
    .min(1, { message: "first_name_required" })
    .max(80, { message: "first_name_too_long" }),
  lastName: z
    .string({ message: "last_name_required" })
    .trim()
    .min(1, { message: "last_name_required" })
    .max(80, { message: "last_name_too_long" }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ── Customer profile (phone, education, parent) ───────────────────────────

const PHONE_CODE_REGEX = /^\+\d{1,4}$/;
// Backend's `MarketplaceDiscoveryService.normalize_phone_number` strips
// everything but digits; here we just enforce a sane visible range.
const PHONE_DIGITS_REGEX = /^\d{10}$/;

export const GRADE_VALUES = [
  "1. Sınıf",
  "2. Sınıf",
  "3. Sınıf",
  "4. Sınıf",
  "5. Sınıf",
  "6. Sınıf",
  "7. Sınıf",
  "8. Sınıf",
  "9. Sınıf (Lise 1)",
  "10. Sınıf (Lise 2)",
  "11. Sınıf (Lise 3)",
  "12. Sınıf (Lise 4)",
  "Mezun / Üniversite",
] as const;
export type GradeValue = (typeof GRADE_VALUES)[number];

/** I18n key suffix for each grade — used by form components to translate the
 * Turkish label into the active locale without storing duplicate values. */
export const GRADE_I18N_KEYS: Record<GradeValue, string> = {
  "1. Sınıf": "grade1",
  "2. Sınıf": "grade2",
  "3. Sınıf": "grade3",
  "4. Sınıf": "grade4",
  "5. Sınıf": "grade5",
  "6. Sınıf": "grade6",
  "7. Sınıf": "grade7",
  "8. Sınıf": "grade8",
  "9. Sınıf (Lise 1)": "grade9",
  "10. Sınıf (Lise 2)": "grade10",
  "11. Sınıf (Lise 3)": "grade11",
  "12. Sınıf (Lise 4)": "grade12",
  "Mezun / Üniversite": "graduate",
};

/** Birth-date sanity: ISO date string in [1900-01-01, today]. Empty string
 * (user cleared the field) is allowed and normalized to `null` at the API
 * boundary. */
function validBirthDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (parsed > today) return false;
  const earliest = new Date("1900-01-01T00:00:00Z");
  return parsed >= earliest;
}

export const customerProfileFormSchema = z.object({
  phoneCode: z
    .string()
    .trim()
    .min(1, { message: "phone_code_required" })
    .regex(PHONE_CODE_REGEX, { message: "phone_code_invalid" }),
  phoneNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(
      z
        .string()
        .min(1, { message: "phone_required" })
        .regex(PHONE_DIGITS_REGEX, { message: "phone_invalid" }),
    ),
  birthDate: z
    .string()
    .trim()
    .refine(validBirthDate, { message: "birth_date_invalid" })
    .optional()
    .default(""),
  address: z
    .string()
    .trim()
    .max(500, { message: "address_too_long" })
    .optional()
    .default(""),
  schoolName: z
    .string()
    .trim()
    .max(200, { message: "school_name_too_long" })
    .optional()
    .default(""),
  grade: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) =>
        value === "" || (GRADE_VALUES as readonly string[]).includes(value),
      { message: "grade_invalid" },
    ),
  subjects: z
    .string()
    .trim()
    .max(500, { message: "subjects_too_long" })
    .optional()
    .default(""),
  parentName: z
    .string()
    .trim()
    .max(120, { message: "parent_name_too_long" })
    .optional()
    .default(""),
  parentPhoneCode: z
    .string()
    .trim()
    .optional()
    .default("+90")
    .refine(
      (value) => value === "" || PHONE_CODE_REGEX.test(value),
      { message: "parent_phone_code_invalid" },
    ),
  parentPhone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine(
      (value) => value === "" || PHONE_DIGITS_REGEX.test(value),
      { message: "parent_phone_invalid" },
    )
    .optional()
    .default(""),
  parentEmail: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) =>
        value === "" ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      { message: "parent_email_invalid" },
    ),
});

export type CustomerProfileFormValues = z.infer<
  typeof customerProfileFormSchema
>;

// ── Change password ───────────────────────────────────────────────────────

export function buildPasswordFormSchema(hasUsablePassword: boolean) {
  // Email-based accounts must provide their current password. OAuth-only
  // accounts (Google/Apple connected, no usable password) skip that field and
  // set a password for the first time.
  const currentPassword = hasUsablePassword
    ? z.string().min(1, { message: "current_password_required" })
    : z
        .string()
        .optional()
        .default("")
        .transform(() => "");

  return z
    .object({
      currentPassword,
      newPassword: z
        .string()
        .min(8, { message: "new_password_too_short" })
        .max(128, { message: "new_password_too_long" }),
      newPasswordConfirm: z
        .string()
        .min(1, { message: "new_password_confirm_required" }),
    })
    .refine((data) => data.newPassword === data.newPasswordConfirm, {
      message: "new_password_mismatch",
      path: ["newPasswordConfirm"],
    })
    .refine(
      (data) =>
        !hasUsablePassword || data.currentPassword !== data.newPassword,
      {
        message: "new_password_same_as_current",
        path: ["newPassword"],
      },
    );
}

export type PasswordFormValues = z.infer<
  ReturnType<typeof buildPasswordFormSchema>
>;

// ── Delete account ────────────────────────────────────────────────────────

/** The dialog requires the user to type the literal Turkish word "SİL" to
 * arm the destructive button. Reason is optional and capped at 500 chars
 * (the backend caps it elsewhere). */
export const deleteAccountFormSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === "SİL", {
      message: "confirmation_mismatch",
    }),
  reason: z
    .string()
    .trim()
    .max(500, { message: "reason_too_long" })
    .optional()
    .default(""),
});

export type DeleteAccountFormValues = z.infer<typeof deleteAccountFormSchema>;
