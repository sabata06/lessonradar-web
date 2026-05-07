"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Mail01Icon,
  LockPasswordIcon,
  UserIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TurnstileWidget,
  isTurnstileEnabled,
  type TurnstileWidgetHandle,
} from "./TurnstileWidget";

interface RegisterFormProps {
  /** Server-validated next path (already passed through `safeRedirect`). */
  next: string;
  /** Localized URLs for legal documents — server resolves these. */
  legalUrls: {
    kvkk: string;
    privacy: string;
    terms: string;
  };
}

type ServerErrorCode =
  | "EMAIL_ALREADY_REGISTERED"
  | "ACCOUNT_HAS_PENDING_INVITATION"
  | "VALIDATION_ERROR"
  | "registration_failed"
  | "turnstile_failed"
  | "invalid_origin"
  | "rate_limited"
  | "unknown_error";

export function RegisterForm({ next, legalUrls }: RegisterFormProps) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<ServerErrorCode | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const turnstileEnabled = isTurnstileEnabled();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    // Consent flags are zod-literal(true) so TS rejects `false` defaults; cast
    // bypasses that — the schema still requires `true` at submit time.
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirm: "",
      consentKvkk: false as unknown as true,
      consentPrivacy: false as unknown as true,
      consentTerms: false as unknown as true,
      email_confirm: "",
    },
    mode: "onSubmit",
  });

  const passwordValue = watch("password");
  const strength = useMemo(() => computePasswordStrength(passwordValue), [passwordValue]);

  const submitting = isSubmitting;
  const submitBlocked = submitting || (turnstileEnabled && !turnstileToken);

  const translateError = (code: string): string => {
    const key = code.toLowerCase();
    try {
      return tErrors(key as never);
    } catch {
      return tErrors("unknown_error");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setFieldErrors({});

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        password_confirm: values.passwordConfirm,
        first_name: values.firstName,
        last_name: values.lastName,
        consent_kvkk: values.consentKvkk,
        consent_privacy: values.consentPrivacy,
        consent_terms: values.consentTerms,
        turnstile_token: turnstileToken ?? undefined,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | {
          ok?: boolean;
          email?: string;
          error?: string;
          field_errors?: Record<string, string | string[]>;
        }
      | null;

    if (res.ok && data?.ok) {
      const target = `/eposta-dogrula?email=${encodeURIComponent(
        data.email ?? values.email,
      )}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
      router.push(target);
      router.refresh();
      return;
    }

    // Token is one-time-use — regenerate after any failure
    setTurnstileToken(null);
    turnstileRef.current?.reset();

    if (data?.field_errors) {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.field_errors)) {
        flat[k] = Array.isArray(v) ? String(v[0]) : String(v);
      }
      setFieldErrors(flat);
    }
    setServerError((data?.error ?? "unknown_error") as ServerErrorCode);
  });

  // stopPropagation: link is inside a <label>, so without it a click on the
  // link would also toggle the checkbox.
  const consentLink = (href: string, label: React.ReactNode) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {label}
    </a>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
        <label>
          Email confirm
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("email_confirm")}
          />
        </label>
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <span>{translateError(serverError)}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("register.first_name_label")}
          error={
            errors.firstName?.message
              ? translateError(errors.firstName.message)
              : fieldErrors.first_name
                ? translateError(fieldErrors.first_name)
                : undefined
          }
          icon={UserIcon}
        >
          <Input
            type="text"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
        </FormField>

        <FormField
          label={t("register.last_name_label")}
          error={
            errors.lastName?.message
              ? translateError(errors.lastName.message)
              : fieldErrors.last_name
                ? translateError(fieldErrors.last_name)
                : undefined
          }
          icon={UserIcon}
        >
          <Input
            type="text"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
        </FormField>
      </div>

      <FormField
        label={t("register.email_label")}
        error={
          errors.email?.message
            ? translateError(errors.email.message)
            : fieldErrors.email
              ? translateError(fieldErrors.email)
              : undefined
        }
        icon={Mail01Icon}
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t("register.email_placeholder")}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </FormField>

      <FormField
        label={t("register.password_label")}
        hint={t("register.password_help")}
        error={
          errors.password?.message
            ? translateError(errors.password.message)
            : fieldErrors.password
              ? translateError(fieldErrors.password)
              : undefined
        }
        icon={LockPasswordIcon}
        action={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            <HugeiconsIcon
              icon={showPassword ? ViewOffSlashIcon : ViewIcon}
              size={18}
              strokeWidth={2}
            />
          </button>
        }
      >
        <Input
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </FormField>

      {passwordValue && passwordValue.length > 0 && (
        <PasswordStrengthMeter score={strength.score} label={strength.label} />
      )}

      <FormField
        label={t("register.password_confirm_label")}
        error={
          errors.passwordConfirm?.message
            ? translateError(errors.passwordConfirm.message)
            : fieldErrors.password_confirm
              ? translateError(fieldErrors.password_confirm)
              : undefined
        }
        icon={LockPasswordIcon}
      >
        <Input
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          aria-invalid={!!errors.passwordConfirm}
          {...register("passwordConfirm")}
        />
      </FormField>

      <fieldset className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("register.consents_heading")}
        </legend>
        <ConsentCheckbox
          label={t.rich("register.consent_kvkk", {
            a: (chunks) => consentLink(legalUrls.kvkk, chunks),
          })}
          error={errors.consentKvkk?.message ? translateError(errors.consentKvkk.message) : undefined}
          {...register("consentKvkk")}
        />
        <ConsentCheckbox
          label={t.rich("register.consent_privacy", {
            a: (chunks) => consentLink(legalUrls.privacy, chunks),
          })}
          error={errors.consentPrivacy?.message ? translateError(errors.consentPrivacy.message) : undefined}
          {...register("consentPrivacy")}
        />
        <ConsentCheckbox
          label={t.rich("register.consent_terms", {
            a: (chunks) => consentLink(legalUrls.terms, chunks),
          })}
          error={errors.consentTerms?.message ? translateError(errors.consentTerms.message) : undefined}
          {...register("consentTerms")}
        />
      </fieldset>

      <p className="text-center text-xs text-muted-foreground">
        {t("register.verification_notice")}
      </p>

      <TurnstileWidget
        ref={turnstileRef}
        onVerify={setTurnstileToken}
        onError={() => setTurnstileToken(null)}
        onExpire={() => setTurnstileToken(null)}
        action="register"
        className="flex justify-center"
      />

      <Button
        type="submit"
        size="lg"
        disabled={submitBlocked}
        aria-busy={submitting}
        className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90"
      >
        {submitting ? (
          t("register.submitting")
        ) : (
          <span className="inline-flex items-center gap-2">
            {t("register.submit")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.5} />
          </span>
        )}
      </Button>
    </form>
  );
}

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  icon?: typeof Mail01Icon;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function FormField({ label, hint, error, icon, action, children }: FormFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
          </span>
        )}
        <div className={cn(icon && "[&_input]:pl-10", action && "[&_input]:pr-12")}>
          {children}
        </div>
        {action && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">{action}</div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
          {error}
        </p>
      )}
    </label>
  );
}

const ConsentCheckbox = ({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  error?: string;
}) => {
  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1 pl-7 text-xs text-destructive"
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
};

ConsentCheckbox.displayName = "ConsentCheckbox";

interface StrengthInfo {
  score: 0 | 1 | 2 | 3 | 4;
  label: "weak" | "fair" | "good" | "strong";
}

function computePasswordStrength(password: string): StrengthInfo {
  if (!password) return { score: 0, label: "weak" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const label =
    clamped <= 1 ? "weak" : clamped === 2 ? "fair" : clamped === 3 ? "good" : "strong";
  return { score: clamped, label };
}

interface PasswordStrengthMeterProps {
  score: 0 | 1 | 2 | 3 | 4;
  label: "weak" | "fair" | "good" | "strong";
}

function PasswordStrengthMeter({ score, label }: PasswordStrengthMeterProps) {
  const t = useTranslations("auth.errors");
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-amber-500", "bg-success"];
  const labelTr = {
    weak: "Zayıf",
    fair: "Orta",
    good: "İyi",
    strong: "Güçlü",
  } as const;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted",
              i < score && colors[score],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labelTr[label]}</p>
    </div>
  );
}
