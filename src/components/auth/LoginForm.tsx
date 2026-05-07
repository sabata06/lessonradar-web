"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Mail01Icon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { useAuth, AuthError } from "@/lib/auth/client";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TurnstileWidget,
  isTurnstileEnabled,
  type TurnstileWidgetHandle,
} from "./TurnstileWidget";

interface LoginFormProps {
  /** Server-validated next path (already passed through `safeRedirect`). */
  next: string;
}

type ErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "turnstile_failed"
  | "invalid_origin"
  | "rate_limited"
  | "account_locked"
  | "unknown_error";

function statusToCode(status: number, raw?: string): ErrorCode {
  if (raw === "email_not_verified") return "email_not_verified";
  if (raw === "turnstile_failed") return "turnstile_failed";
  if (raw === "invalid_origin") return "invalid_origin";
  if (status === 429) return "rate_limited";
  if (status === 403 && raw === "ACCOUNT_LOCKED") return "account_locked";
  if (status === 401) return "invalid_credentials";
  if (status >= 500) return "unknown_error";
  return "invalid_credentials";
}

export function LoginForm({ next }: LoginFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { login } = useAuth();

  const [serverError, setServerError] = useState<ErrorCode | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const turnstileEnabled = isTurnstileEnabled();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
      lr_extra_field: "",
    },
    mode: "onSubmit",
  });

  const submitting = isSubmitting || isPending;
  // Block submission until the Turnstile token is present (managed mode usually
  // resolves silently within ~500ms). When the site key is unset (dev), the
  // widget is hidden and the BFF bypasses verification.
  const submitBlocked = submitting || (turnstileEnabled && !turnstileToken);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login({
        email: values.email,
        password: values.password,
        turnstileToken: turnstileToken ?? undefined,
      });
      startTransition(() => {
        router.push(next);
        router.refresh(); // pull SSR back in sync with new session
      });
    } catch (error) {
      // Token is one-time-use — regenerate after any auth/network error.
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      if (error instanceof AuthError) {
        setServerError(statusToCode(error.status, error.code));
      } else {
        setServerError("unknown_error");
      }
    }
  });

  const translateError = (code: string) => {
    try {
      return t(`errors.${code}` as never);
    } catch {
      return t("errors.unknown_error");
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot — `inert` keeps browsers (esp. Chrome autofill) from
          touching this field. `aria-hidden` alone wasn't enough, autofill
          dropped a value into the previous "email_confirm" input. The cryptic
          field name avoids triggering generic bot-form fillers too. */}
      <div
        {...({ inert: "" } as Record<string, string>)}
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          lr_extra_field
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("lr_extra_field")}
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

      <FormField
        label={t("login.email_label")}
        error={errors.email?.message ? translateError(errors.email.message) : undefined}
        icon={Mail01Icon}
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t("login.email_placeholder")}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </FormField>

      <FormField
        label={t("login.password_label")}
        error={
          errors.password?.message
            ? translateError(errors.password.message)
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
          autoComplete="current-password"
          placeholder={t("login.password_placeholder")}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </FormField>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            {...register("remember")}
          />
          <span>{t("login.remember_label")}</span>
        </label>
        <a
          href="/sifremi-unuttum"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("login.forgot_link")}
        </a>
      </div>

      <TurnstileWidget
        ref={turnstileRef}
        onVerify={setTurnstileToken}
        onError={() => setTurnstileToken(null)}
        onExpire={() => setTurnstileToken(null)}
        action="login"
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
          t("login.submitting")
        ) : (
          <span className="inline-flex items-center gap-2">
            {t("login.submit")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.5} />
          </span>
        )}
      </Button>
    </form>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  icon?: typeof Mail01Icon;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function FormField({ label, error, icon, action, children }: FormFieldProps) {
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
