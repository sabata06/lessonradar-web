"use client";

import { useEffect, useRef } from "react";
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
  const cardRef = useRef<HTMLElement>(null);

  // On mount, smooth-scroll the card into view AND move keyboard focus to it.
  // The form is long enough that without this, a user who submits from the
  // bottom never sees the error and assumes the click was silently ignored.
  // Respects prefers-reduced-motion via CSS scroll-behavior.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus after the scroll begins so screen readers announce on the new viewport.
    requestAnimationFrame(() => card.focus());
  }, [variant]); // re-run if user changes which recovery state they're in

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
      ref={cardRef}
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
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

      {/* CTA hierarchy: two primary actions on the same row (recovery path),
          'use different email' is a tertiary text link on its own row so it
          never overflows the card on narrow desktops. */}
      <div className="mt-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
        </div>
        {onUseDifferentEmail && (
          <div className="flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={onUseDifferentEmail}
              className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
            >
              {t("cta_use_different")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
