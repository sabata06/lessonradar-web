"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  MailAdd01Icon,
} from "@hugeicons/core-free-icons";

interface Props {
  email: string;
  verified: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/**
 * Surface the customer's email verification state and let them re-trigger the
 * verification email when it's missing. Backend responds with a generic
 * success even for unknown emails (account enumeration safety), so we don't
 * need to leak fine-grained errors here.
 */
export function EmailVerificationCard({ email, verified }: Props) {
  const t = useTranslations("panel.settings.account.email");
  const tErrors = useTranslations("account.errors");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleResend() {
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        setState({ kind: "error", message: tErrors("unknown") });
        return;
      }
      setState({ kind: "sent" });
    } catch {
      setState({
        kind: "error",
        message: tErrors("network_error"),
      });
    }
  }

  const isVerified = verified;

  return (
    <section
      aria-labelledby="email-verification-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          className={
            isVerified
              ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success"
              : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-action/15 text-action-foreground"
          }
        >
          <HugeiconsIcon
            icon={isVerified ? CheckmarkCircle02Icon : MailAdd01Icon}
            size={20}
            strokeWidth={2}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="email-verification-heading"
            className="text-sm font-semibold text-foreground"
          >
            {isVerified ? t("verified_title") : t("unverified_title")}
          </h2>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {email}
          </p>
          {!isVerified ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t("unverified_body")}
            </p>
          ) : null}
        </div>
      </div>

      {!isVerified ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={state.kind === "sending" || state.kind === "sent"}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground shadow-action transition-colors hover:bg-action/90 disabled:opacity-60"
          >
            {state.kind === "sending"
              ? t("resend.sending")
              : state.kind === "sent"
                ? t("resend.sent")
                : t("resend.cta")}
          </button>
          {state.kind === "error" ? (
            <span
              role="alert"
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
            >
              <HugeiconsIcon icon={Alert02Icon} size={12} strokeWidth={2.5} />
              {state.message}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
