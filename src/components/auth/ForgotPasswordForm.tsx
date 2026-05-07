"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TurnstileWidget,
  isTurnstileEnabled,
  type TurnstileWidgetHandle,
} from "./TurnstileWidget";

type ServerErrorCode =
  | "validation_error"
  | "turnstile_failed"
  | "invalid_origin"
  | "rate_limited"
  | "unknown_error";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const tErrors = useTranslations("auth.errors");

  const [serverError, setServerError] = useState<ServerErrorCode | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = isTurnstileEnabled();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", lr_extra_field: "" },
    mode: "onSubmit",
  });

  const submitBlocked =
    isSubmitting || (turnstileEnabled && !turnstileToken);

  const translateError = (code: string): string => {
    try {
      return tErrors(code as never);
    } catch {
      return tErrors("unknown_error");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: values.email,
        turnstile_token: turnstileToken ?? undefined,
      }),
    });

    setTurnstileToken(null);
    turnstileRef.current?.reset();

    if (res.ok) {
      setSubmittedEmail(values.email);
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    const code = (data?.error ?? "unknown_error") as ServerErrorCode;
    if (res.status === 429) {
      setServerError("rate_limited");
    } else {
      setServerError(code);
    }
  });

  if (submittedEmail) {
    const resetHref = `/sifre-sifirla?email=${encodeURIComponent(submittedEmail)}`;
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("sent_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t.rich("sent_body", {
              email: submittedEmail,
              strong: (chunks) => (
                <strong className="font-semibold text-foreground">
                  {chunks}
                </strong>
              ),
            })}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90"
        >
          <Link href={resetHref}>
            <span className="inline-flex items-center gap-2">
              {t("sent_cta")}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                strokeWidth={2.5}
              />
            </span>
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("sent_back_to_login_prefix")}{" "}
          <Link
            href="/giris"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("sent_back_to_login_link")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot — see LoginForm for `inert` rationale. */}
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
              placeholder={t("email_placeholder")}
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

      <p className="text-xs text-muted-foreground">{t("help_text")}</p>

      <TurnstileWidget
        ref={turnstileRef}
        onVerify={setTurnstileToken}
        onError={() => setTurnstileToken(null)}
        onExpire={() => setTurnstileToken(null)}
        action="forgot-password"
        className="flex justify-center"
      />

      <Button
        type="submit"
        size="lg"
        disabled={submitBlocked}
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
        {t("back_to_login_prefix")}{" "}
        <Link
          href="/giris"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("back_to_login_link")}
        </Link>
      </p>
    </form>
  );
}
