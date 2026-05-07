"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  InformationCircleIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Recovery card surfaces a known auth-flow conflict (e.g. "this email is
 * already registered") with concrete next-step actions, instead of a flat
 * destructive error. Implements the UX rule "Error Recovery: provide clear
 * next steps" (high severity in ui-ux-pro-max guidelines).
 *
 * Design choices (per DESIGN.md "Calm Editorial" + Warm Trust palette):
 * - Brand-soft teal background (NOT destructive red) — the user did nothing
 *   wrong; we are guiding them to the right path.
 * - Action amber on the primary CTA only (sacred — single conversion target).
 * - role="alert" + aria-live="polite" → screen-reader announcement.
 * - 8px rhythm, ≥44px tap targets, mobile-first single column.
 */

interface RecoveryCardProps {
  variant: "already_registered" | "pending_invitation";
  email: string;
  /** Path the user came from, threaded through to /giris?next=… */
  next?: string;
  /** Called when user picks "use different email" → caller resets the form. */
  onUseDifferentEmail?: () => void;
}

export function RecoveryCard({
  variant,
  email,
  next,
  onUseDifferentEmail,
}: RecoveryCardProps) {
  const t = useTranslations("auth.recovery");

  const titleKey =
    variant === "already_registered"
      ? "already_registered_title"
      : "pending_invitation_title";
  const bodyKey =
    variant === "already_registered"
      ? "already_registered_body"
      : "pending_invitation_body";

  const loginHref = next
    ? `/giris?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`
    : `/giris?email=${encodeURIComponent(email)}`;

  return (
    <section
      role="alert"
      aria-live="polite"
      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {t(titleKey)}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t(bodyKey)}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground">
            <HugeiconsIcon icon={Mail01Icon} size={12} strokeWidth={2} />
            <span className="truncate">{email}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {variant === "already_registered" ? (
          <>
            <Button
              asChild
              size="lg"
              className="bg-action text-action-foreground shadow-action hover:bg-action/90 sm:flex-1"
            >
              <Link href={loginHref}>
                <span className="inline-flex items-center gap-2">
                  {t("cta_login")}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    strokeWidth={2.5}
                  />
                </span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-primary hover:bg-primary/10 sm:flex-none"
            >
              <Link href="/sifremi-unuttum">{t("cta_forgot")}</Link>
            </Button>
          </>
        ) : (
          <Button
            asChild
            size="lg"
            className="bg-action text-action-foreground shadow-action hover:bg-action/90 sm:flex-1"
          >
            <Link href="/giris">{t("cta_login")}</Link>
          </Button>
        )}
        {onUseDifferentEmail && (
          <button
            type="button"
            onClick={onUseDifferentEmail}
            className="h-11 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
          >
            {t("cta_use_different")}
          </button>
        )}
      </div>
    </section>
  );
}
