"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/client";
import type {
  ApplicationApiPayload,
  ApplicationStatus,
} from "@/lib/teacher-application/types";

/**
 * Auth-aware client island for the `/ogretmen-ol` landing.
 *
 * The page itself stays SSG/indexable for SEO ("öğretmen ol" canonical
 * landing for Google). This island hydrates on the client, asks the BFF
 * for the visitor's current application state, and renders the right CTA:
 *
 *   - Anonymous / customer with no application → default "start" CTA.
 *   - Draft → "continue" CTA (deeplinks to the wizard at the saved step).
 *   - Submitted / under review / needs changes → status pill + link to
 *     `/panel-ogretmen/basvuru-durumu`.
 *   - Approved → success banner with a link to the public profile, and the
 *     default apply section is collapsed (no point pitching tutoring to
 *     someone who is already a tutor here).
 *   - Rejected → cooldown banner.
 */
export function OnboardingAuthAwareCTA({
  /** Fallback markup rendered while hydrating + for anon visitors. */
  defaultApplySection,
}: {
  defaultApplySection: React.ReactNode;
}) {
  const { user, isHydrated } = useAuth();
  const t = useTranslations("onboarding.auth_aware");
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "anon_or_no_app" }
    | { kind: "application"; payload: ApplicationApiPayload }
    | { kind: "approved_teacher"; slug: string | null }
    | { kind: "error" }
  >({ kind: "loading" });

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setState({ kind: "anon_or_no_app" });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/teacher-application/current", {
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (res.status === 404) {
          // Teacher-role users with no active application row are a quirk
          // (manual admin-created profile, legacy data). Surface a generic
          // "approved" state so they don't see the "become a tutor" pitch.
          if (user.role === "teacher") {
            setState({ kind: "approved_teacher", slug: null });
            return;
          }
          setState({ kind: "anon_or_no_app" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const payload = (await res.json()) as ApplicationApiPayload;
        if (payload.status === "approved") {
          setState({ kind: "approved_teacher", slug: null });
          return;
        }
        setState({ kind: "application", payload });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, user]);

  // Loading / hydrating / error: show the default static apply section so
  // anonymous + JS-disabled visitors always see the canonical CTA.
  if (state.kind === "loading" || state.kind === "anon_or_no_app" || state.kind === "error") {
    return <>{defaultApplySection}</>;
  }

  if (state.kind === "approved_teacher") {
    return (
      <ApprovedTeacherBanner
        slug={state.slug}
        title={t("approved_title")}
        body={t("approved_body")}
        ctaPanel={t("approved_cta_panel")}
        ctaProfile={t("approved_cta_profile")}
      />
    );
  }

  return (
    <ApplicationStatusBanner
      payload={state.payload}
      t={t}
    />
  );
}

function ApprovedTeacherBanner({
  slug,
  title,
  body,
  ctaPanel,
  ctaProfile,
}: {
  slug: string | null;
  title: string;
  body: string;
  ctaPanel: string;
  ctaProfile: string;
}) {
  return (
    <section
      aria-labelledby="onboarding-approved-title"
      className="rounded-3xl border border-success/30 bg-success-soft/40 p-8 sm:p-10"
    >
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={24}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-success"
          aria-hidden
        />
        <div className="max-w-2xl space-y-3">
          <h2
            id="onboarding-approved-title"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {body}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/panel-ogretmen"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {ctaPanel}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2.5}
                aria-hidden
              />
            </Link>
            {slug ? (
              <Link
                href={`/ogretmen/${slug}`}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border px-5 text-sm font-medium text-foreground hover:border-brand/60 hover:text-brand"
              >
                {ctaProfile}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ApplicationStatusBanner({
  payload,
  t,
}: {
  payload: ApplicationApiPayload;
  t: ReturnType<typeof useTranslations>;
}) {
  const meta = statusBannerMeta(payload.status, t);
  return (
    <section
      aria-labelledby="onboarding-status-title"
      className={`rounded-3xl border p-8 sm:p-10 ${meta.containerClass}`}
    >
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={24}
          strokeWidth={2}
          className={`mt-0.5 shrink-0 ${meta.iconClass}`}
          aria-hidden
        />
        <div className="max-w-2xl space-y-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${meta.pillClass}`}
          >
            {meta.pillLabel}
          </span>
          <h2
            id="onboarding-status-title"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {meta.title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {meta.body}
          </p>
          {payload.review_notes ? (
            <p className="rounded-xl border border-border/60 bg-card p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {payload.review_notes}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={meta.primaryHref}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-action px-6 text-sm font-semibold text-action-foreground shadow-action hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {meta.primaryCta}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2.5}
                aria-hidden
              />
            </Link>
            <Link
              href="/panel-ogretmen/basvuru-durumu"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border px-5 text-sm font-medium text-foreground hover:border-brand/60 hover:text-brand"
            >
              {t("status_link")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function statusBannerMeta(
  status: ApplicationStatus,
  t: ReturnType<typeof useTranslations>,
) {
  switch (status) {
    case "draft":
      return {
        containerClass: "border-brand/30 bg-brand-soft/40",
        iconClass: "text-brand",
        pillClass: "bg-brand-soft text-brand-soft-foreground",
        pillLabel: t("draft_pill"),
        title: t("draft_title"),
        body: t("draft_body"),
        primaryCta: t("draft_cta"),
        primaryHref: "/ogretmen-ol/olusturma",
      } as const;
    case "submitted":
    case "under_review":
      return {
        containerClass: "border-brand/30 bg-brand-soft/40",
        iconClass: "text-brand",
        pillClass: "bg-brand-soft text-brand-soft-foreground",
        pillLabel: t("review_pill"),
        title: t("review_title"),
        body: t("review_body"),
        primaryCta: t("review_cta"),
        primaryHref: "/panel-ogretmen/basvuru-durumu",
      } as const;
    case "needs_changes":
      return {
        containerClass: "border-warning/40 bg-warning/10",
        iconClass: "text-warning",
        pillClass: "bg-warning/15 text-foreground",
        pillLabel: t("needs_changes_pill"),
        title: t("needs_changes_title"),
        body: t("needs_changes_body"),
        primaryCta: t("needs_changes_cta"),
        primaryHref: "/ogretmen-ol/olusturma",
      } as const;
    case "rejected":
      return {
        containerClass: "border-destructive/30 bg-destructive/5",
        iconClass: "text-destructive",
        pillClass: "bg-destructive/10 text-destructive",
        pillLabel: t("rejected_pill"),
        title: t("rejected_title"),
        body: t("rejected_body"),
        primaryCta: t("rejected_cta"),
        primaryHref: "/panel-ogretmen/basvuru-durumu",
      } as const;
    default:
      return {
        containerClass: "border-border bg-card",
        iconClass: "text-muted-foreground",
        pillClass: "bg-muted text-foreground",
        pillLabel: status,
        title: t("review_title"),
        body: t("review_body"),
        primaryCta: t("review_cta"),
        primaryHref: "/panel-ogretmen/basvuru-durumu",
      } as const;
  }
}
