"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  LockPasswordIcon,
  Mail01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

interface ResetPasswordFormProps {
  /** Pre-filled email from `?email=` query (forgot-password redirect). */
  initialEmail: string;
}

type ServerErrorCode =
  | "INVALID_RESET_CODE"
  | "RESET_CODE_EXPIRED"
  | "USER_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "validation_error"
  | "rate_limited"
  | "reset_failed"
  | "invalid_origin"
  | "unknown_error";

export function ResetPasswordForm({ initialEmail }: ResetPasswordFormProps) {
  const t = useTranslations("auth.reset");
  const tErrors = useTranslations("auth.errors");

  const [serverError, setServerError] = useState<ServerErrorCode | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");

  // B2.S4 spirit — strip ?email= from URL after mount so the email isn't
  // leaked via Referer / browser history when the user hits an outbound link.
  // (We mirror the verify-email flow's token strip; for reset we don't use a
  // token URL param but the email is PII enough to warrant the same hygiene.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("email")) {
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
    mode: "onSubmit",
  });

  // Mirror the InputOTP value into RHF on every change so resolver sees it.
  useEffect(() => {
    setValue("code", code, { shouldValidate: false });
  }, [code, setValue]);

  const passwordValue = watch("newPassword") ?? "";
  const strength = useMemo(
    () => computePasswordStrength(passwordValue),
    [passwordValue],
  );

  const translateError = (codeStr: string): string => {
    const key = codeStr.toLowerCase();
    try {
      return tErrors(key as never);
    } catch {
      return tErrors("unknown_error");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: values.email,
        code: values.code,
        new_password: values.newPassword,
        new_password_confirm: values.newPasswordConfirm,
      }),
    });

    if (res.ok) {
      setSuccess(true);
      return;
    }

    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    if (res.status === 429) {
      setServerError("rate_limited");
      return;
    }
    setServerError((data?.error ?? "reset_failed") as ServerErrorCode);
    setCode("");
  });

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("success_title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("success_subtitle")}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90"
        >
          <Link href="/giris">
            <span className="inline-flex items-center gap-2">
              {t("success_cta")}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                strokeWidth={2.5}
              />
            </span>
          </Link>
        </Button>
      </div>
    );
  }

  const submitDisabled = isSubmitting || code.length !== 6;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
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

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          {t("email_label")}
        </span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={2} />
          </span>
          <div className={cn("[&_input]:pl-10")}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
        </div>
        {errors.email?.message && (
          <p
            role="alert"
            className="flex items-center gap-1 text-xs text-destructive"
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
            {translateError(errors.email.message)}
          </p>
        )}
      </label>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">
          {t("code_label")}
        </span>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("code_help")}
        </p>
        {errors.code?.message && (
          <p role="alert" className="text-center text-xs text-destructive">
            {translateError(errors.code.message)}
          </p>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          {t("new_password_label")}
        </span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={2} />
          </span>
          <div className={cn("[&_input]:pl-10 [&_input]:pr-12")}>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t("new_password_placeholder")}
              aria-invalid={!!errors.newPassword}
              {...register("newPassword")}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            aria-label={showPassword ? t("hide_password") : t("show_password")}
          >
            <HugeiconsIcon
              icon={showPassword ? ViewOffSlashIcon : ViewIcon}
              size={18}
              strokeWidth={2}
            />
          </button>
        </div>
        {passwordValue && (
          <PasswordStrengthMeter score={strength.score} label={strength.label} />
        )}
        <p className="text-xs text-muted-foreground">{t("new_password_help")}</p>
        {errors.newPassword?.message && (
          <p
            role="alert"
            className="flex items-center gap-1 text-xs text-destructive"
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
            {translateError(errors.newPassword.message)}
          </p>
        )}
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          {t("new_password_confirm_label")}
        </span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={2} />
          </span>
          <div className={cn("[&_input]:pl-10")}>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.newPasswordConfirm}
              {...register("newPasswordConfirm")}
            />
          </div>
        </div>
        {errors.newPasswordConfirm?.message && (
          <p
            role="alert"
            className="flex items-center gap-1 text-xs text-destructive"
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
            {translateError(errors.newPasswordConfirm.message)}
          </p>
        )}
      </label>

      <Button
        type="submit"
        size="lg"
        disabled={submitDisabled}
        aria-busy={isSubmitting}
        className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90"
      >
        {isSubmitting ? (
          t("submitting")
        ) : (
          <span className="inline-flex items-center gap-2">
            {t("submit")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.5} />
          </span>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("resend_prefix")}{" "}
        <Link
          href="/sifremi-unuttum"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("resend_link")}
        </Link>
      </p>
    </form>
  );
}

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
  const t = useTranslations("auth.reset");
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-amber-500",
    "bg-success",
  ];
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
      <p className="text-xs text-muted-foreground">
        {t(`strength_${label}` as never)}
      </p>
    </div>
  );
}
