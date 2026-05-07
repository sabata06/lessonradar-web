"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface VerifyEmailFormProps {
  /** Pre-filled email from `?email=` query (registration redirect). */
  initialEmail: string;
  /** Optional `?token=<hex>` for forward-compatible link verification (D mode). */
  linkToken: string | null;
  /** Where to redirect after successful verification. */
  next: string;
}

type ServerErrorCode =
  | "INVALID_VERIFICATION_CODE"
  | "VERIFICATION_CODE_EXPIRED"
  | "EMAIL_ALREADY_VERIFIED"
  | "USER_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "rate_limited"
  | "verification_failed"
  | "unknown_error";

export function VerifyEmailForm({ initialEmail, linkToken, next }: VerifyEmailFormProps) {
  const t = useTranslations("auth.verify");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [serverError, setServerError] = useState<ServerErrorCode | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [autoState, setAutoState] = useState<
    "idle" | "verifying" | "success" | "failed"
  >(linkToken ? "verifying" : "idle");
  const [success, setSuccess] = useState(false);

  const linkTokenAttempted = useRef(false);

  const translateError = (codeStr: string): string => {
    const key = codeStr.toLowerCase();
    try {
      return tErrors(key as never);
    } catch {
      return tErrors("unknown_error");
    }
  };

  // Forward-compatible D path: when ?token=<hex> is present, attempt link
  // verification on mount. Backend doesn't support this yet, so it'll surface
  // as "auto_verify_failed" until the link_token field ships.
  useEffect(() => {
    if (!linkToken || linkTokenAttempted.current) return;
    linkTokenAttempted.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/auth/verify-email-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ token: linkToken }),
        });
        if (res.ok) {
          setAutoState("success");
          setSuccess(true);
          return;
        }
        setAutoState("failed");
      } catch {
        setAutoState("failed");
      }
      // Strip the token from the URL so refresh doesn't retry / Referer leak.
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [linkToken]);

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t("success_title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("success_subtitle")}</p>
        </div>
        <Button
          asChild
          size="lg"
          className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90"
        >
          <a href={`/giris${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            {t("success_cta")}
          </a>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\d{6}$/.test(code)) {
      setServerError("VALIDATION_ERROR");
      return;
    }
    setSubmitting(true);
    setServerError(null);
    setResendNotice(null);

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, code }),
    });
    setSubmitting(false);
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (res.ok && data?.ok) {
      setSuccess(true);
      router.refresh();
      return;
    }
    setCode("");
    setServerError((data?.error ?? "verification_failed") as ServerErrorCode);
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendNotice(null);
    setServerError(null);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email }),
    });
    setResending(false);
    if (res.ok) {
      setResendNotice(t("resent"));
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setServerError((data?.error ?? "unknown_error") as ServerErrorCode);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {autoState === "verifying" && (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center text-sm text-muted-foreground"
        >
          {t("auto_verifying")}
        </p>
      )}
      {autoState === "failed" && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
        >
          {t("auto_verify_failed")}
        </p>
      )}

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

      {resendNotice && (
        <p
          role="status"
          className="rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success"
        >
          {resendNotice}
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">{t("email_label")}</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={2} />
          </span>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </label>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">{t("code_label")}</span>
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
        <p className="text-center text-xs text-muted-foreground">{t("code_help")}</p>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting || code.length !== 6}
        aria-busy={submitting}
        className="w-full bg-action text-action-foreground shadow-action hover:bg-action/90"
      >
        {submitting ? (
          t("submitting")
        ) : (
          <span className="inline-flex items-center gap-2">
            {t("submit")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.5} />
          </span>
        )}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || !email}
        className="block w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
      >
        {resending ? t("resending") : t("resend")}
      </button>
    </form>
  );
}
