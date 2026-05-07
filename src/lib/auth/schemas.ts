import { z } from "zod";

/**
 * Auth form schemas (B2.1).
 *
 * Mirrors the Django backend rules:
 *   - email is the username field (USERNAME_FIELD = 'email').
 *   - password validators (NIST 800-63B aligned): min 8 chars, not numeric-only,
 *     not too similar to user attributes, not in CommonPasswordValidator list.
 *     Backend enforces all of these on register; we mirror the cheap ones here
 *     so the UI doesn't have to round-trip on obvious failures.
 *
 * All error codes are snake_case strings — UI translates them via
 * `errors.<code>` keys in the `auth` i18n namespace, same pattern as
 * `lib/lead/schema.ts` and `lib/teacher-application/schema.ts`.
 */

const emailSchema = z
  .string()
  .min(1, { message: "email_required" })
  .max(254, { message: "email_too_long" })
  .email({ message: "email_invalid" })
  .transform((v) => v.trim().toLowerCase());

/**
 * Strong password rule (registration / reset). Backend may add more via
 * AUTH_PASSWORD_VALIDATORS; surface backend errors back to the user.
 */
const strongPasswordSchema = z
  .string()
  .min(8, { message: "password_too_short" })
  .max(128, { message: "password_too_long" })
  .refine((v) => /[A-Za-z]/.test(v), { message: "password_needs_letter" })
  .refine((v) => /[0-9]/.test(v), { message: "password_needs_digit" });

/** Loose password rule for login — server is the truth, just non-empty. */
const anyPasswordSchema = z
  .string()
  .min(1, { message: "password_required" })
  .max(128, { message: "password_too_long" });

// ── Login ───────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailSchema,
  password: anyPasswordSchema,
  /** Cloudflare Turnstile response token (server verifies). Optional in dev. */
  turnstileToken: z.string().optional(),
  /** "Beni hatırla" — extends cookie to 30 days when true. */
  remember: z.boolean().optional(),
  /** Honeypot — bots fill, humans don't. Reject anything non-empty. */
  lr_extra_field: z.string().max(0, { message: "honeypot_filled" }).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Register ────────────────────────────────────────────────────────────────
// Web register intentionally has no role chooser (hybrid mimari kararı):
// the BFF hard-codes `role: "customer"`. Teachers onboard through /ogretmen-ol.
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, { message: "first_name_required" })
      .max(60, { message: "first_name_too_long" })
      .transform((v) => v.trim()),
    lastName: z
      .string()
      .min(1, { message: "last_name_required" })
      .max(60, { message: "last_name_too_long" })
      .transform((v) => v.trim()),
    email: emailSchema,
    password: strongPasswordSchema,
    passwordConfirm: z.string().min(1, { message: "password_confirm_required" }),
    /** KVKK Disclosure consent — required, must be true. */
    consentKvkk: z.literal(true, { message: "kvkk_required" }),
    /** Privacy Policy consent — required, must be true (separate from KVKK). */
    consentPrivacy: z.literal(true, { message: "privacy_required" }),
    /** Terms of Service consent — required, must be true. */
    consentTerms: z.literal(true, { message: "terms_required" }),
    turnstileToken: z.string().optional(),
    lr_extra_field: z.string().max(0, { message: "honeypot_filled" }).optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "passwords_do_not_match",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ── Forgot password ─────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
  lr_extra_field: z.string().max(0, { message: "honeypot_filled" }).optional(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ── Verify email (OTP code) ─────────────────────────────────────────────────
// Backend issues a 6-digit numeric code. Forward-compatible: when backend
// later adds `link_token`, the page accepts `?token=<hex>` and bypasses this
// form entirely (see WEB-BACKEND-INTEGRATION-PLAN decisions log: A → D path).
export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .min(1, { message: "code_required" })
    .regex(/^\d{6}$/, { message: "code_invalid" }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ── Reset password ──────────────────────────────────────────────────────────
// Backend uses a 6-digit numeric OTP (same channel as email verification),
// not a hex link token. Mirror the verify-email OTP shape; user lands on
// /sifre-sifirla?email=... from the forgot-password flow, types the code from
// the email, and picks a new password. Forward-compat for token-link mode is
// tracked in the open decisions (parallel to the verify-email A→D path).
export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z
      .string()
      .min(1, { message: "code_required" })
      .regex(/^\d{6}$/, { message: "code_invalid" }),
    newPassword: strongPasswordSchema,
    newPasswordConfirm: z
      .string()
      .min(1, { message: "password_confirm_required" }),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "passwords_do_not_match",
    path: ["newPasswordConfirm"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── Set role (post-register) ────────────────────────────────────────────────
export const setRoleSchema = z.object({
  role: z.enum(["customer", "teacher"], { message: "role_invalid" }),
});

export type SetRoleInput = z.infer<typeof setRoleSchema>;
