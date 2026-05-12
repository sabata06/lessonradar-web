"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Notification02Icon,
  SmartPhone01Icon,
  HourglassIcon,
  UserGroup03Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { SupportedLocale } from "@/lib/types";
import {
  readLeadSubmission,
  type LeadSubmissionHandoff,
} from "@/lib/lead/handoff";
import { StoreBadge } from "./StoreBadge";

interface SuccessStateProps {
  locale: SupportedLocale;
  leadId?: string;
}

export function SuccessState({ locale, leadId }: SuccessStateProps) {
  const t = useTranslations("lead.success");
  const [handoff, setHandoff] = useState<LeadSubmissionHandoff | null>(null);

  useEffect(() => {
    setHandoff(readLeadSubmission(leadId));
  }, [leadId]);

  const shortId = handoff?.lead.uuid ?? leadId ?? null;
  const recipientCount = handoff?.lead.recipient_count ?? null;
  const notifiedCount = handoff?.notifiedCount ?? null;
  const isDirect = Boolean(handoff?.lead.target_teacher);
  const targetName = handoff?.lead.target_teacher?.full_name ?? null;
  const maskedPhone = handoff?.lead.contact_phone_masked ?? null;

  return (
    <article className="space-y-8">
      <div className="text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} strokeWidth={1.7} />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {isDirect && targetName
            ? t("subtitle_direct", { teacher: targetName })
            : t("subtitle")}
        </p>
        {shortId && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
            {locale === "tr" ? "Talep no:" : "Request id:"} {shortId.slice(0, 8)}
          </p>
        )}
      </div>

      {(recipientCount !== null || notifiedCount !== null || maskedPhone) && (
        <section
          aria-label={locale === "tr" ? "Talep özeti" : "Request summary"}
          className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-card sm:grid-cols-3"
        >
          {recipientCount !== null && (
            <SummaryItem
              icon={UserGroup03Icon}
              label={t("summary.recipient_count_label")}
              value={String(recipientCount)}
            />
          )}
          {notifiedCount !== null && (
            <SummaryItem
              icon={Notification02Icon}
              label={t("summary.notified_count_label")}
              value={String(notifiedCount)}
            />
          )}
          {maskedPhone && (
            <SummaryItem
              icon={SmartPhone01Icon}
              label={t("summary.contact_phone_label")}
              value={maskedPhone}
              mono
            />
          )}
        </section>
      )}

      <section
        aria-label={locale === "tr" ? "Sonraki adımlar" : "Next steps"}
        className="grid gap-4 sm:grid-cols-2"
      >
        <NextStepCard
          icon={<HugeiconsIcon icon={Notification02Icon} size={22} strokeWidth={1.7} />}
          title={t("step1_title")}
          description={t("step1_description")}
        />
        <NextStepCard
          icon={<HugeiconsIcon icon={HourglassIcon} size={22} strokeWidth={1.7} />}
          title={t("step_delayed_title")}
          description={t("step_delayed_description")}
        />
      </section>

      <section
        aria-label={locale === "tr" ? "Mobil uygulama" : "Mobile app"}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(80% 60% at 100% 0%, oklch(0.94 0.025 195 / 0.55) 0%, transparent 60%)",
          }}
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t("app_title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("app_description")}
            </p>
          </div>
          <div className="flex gap-3">
            <StoreBadge platform="ios" locale={locale} />
            <StoreBadge platform="android" locale={locale} />
          </div>
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="bg-action text-action-foreground shadow-action hover:bg-action/90">
          <Link href="/panel">{t("cta_panel")}</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">{t("back_home")}</Link>
        </Button>
      </div>
    </article>
  );
}

function NextStepCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: typeof Notification02Icon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm font-semibold text-foreground ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
