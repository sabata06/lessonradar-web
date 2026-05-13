import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  BookmarkBlockIcon,
  Calendar03Icon,
  Coins01Icon,
  Loading03Icon,
  MapsLocation01Icon,
  Mortarboard02Icon,
  Notebook02Icon,
  SmartPhone01Icon,
  SchoolReportCardIcon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatLira } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import type { LeadDetail, LeadStatus } from "@/lib/lead/customer-lead-detail";

interface Props {
  lead: LeadDetail;
  locale: Locale;
}

export async function LeadDetailSummary({ lead, locale }: Props) {
  const t = await getTranslations("panel.customer.leads.detail");
  const tStatus = await getTranslations("panel.customer.leads.status");
  const tLevel = await getTranslations("panel.customer.leads.level");
  const tModality = await getTranslations("panel.customer.leads.modality");

  const intl = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const createdLabel = safeFormat(intl, lead.created_at);
  const cancelledLabel = lead.cancelled_at ? safeFormat(intl, lead.cancelled_at) : null;

  const cityLabel = lead.city_name ?? lead.city_slug;
  const districtLabel = lead.district_name ?? lead.district_slug ?? null;
  const disciplineLabel = lead.discipline_name ?? lead.discipline_slug;

  const budgetText = formatBudgetRange(lead.budget_min, lead.budget_max, locale);
  const isCancelled = lead.status === "cancelled";

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/panel"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
          {t("back_to_panel")}
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={lead.status} label={tStatus(lead.status as LeadStatus)} />
          {lead.target_teacher ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-soft-foreground">
              {t("direct_pill", { teacher: lead.target_teacher.full_name })}
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("title", { discipline: disciplineLabel })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("created_on", { date: createdLabel })}
        </p>
      </header>

      {isCancelled ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
        >
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground">
            <HugeiconsIcon icon={BookmarkBlockIcon} size={16} strokeWidth={2} />
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {t("cancelled_title")}
            </p>
            <p>
              {cancelledLabel
                ? t("cancelled_body_with_date", { date: cancelledLabel })
                : t("cancelled_body")}
            </p>
            {lead.cancel_reason ? (
              <p className="mt-1 italic">
                {t("cancel_reason_prefix")} “{lead.cancel_reason}”
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Mortarboard02Icon}
          label={t("stat.recipients")}
          value={String(lead.recipient_count)}
        />
        <StatTile
          icon={Loading03Icon}
          label={t("stat.responded")}
          value={String(lead.responded_count)}
          emphasize={lead.responded_count > 0 && !isCancelled}
        />
        <StatTile
          icon={SchoolReportCardIcon}
          label={t("stat.level")}
          value={tLevel(lead.level)}
        />
      </div>

      <dl className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <FactRow
          icon={MapsLocation01Icon}
          label={t("fact.location")}
          value={
            districtLabel
              ? `${cityLabel} · ${districtLabel}`
              : (cityLabel ?? "")
          }
        />
        <FactRow
          icon={Mortarboard02Icon}
          label={t("fact.modality")}
          value={tModality(lead.modality)}
        />
        {budgetText ? (
          <FactRow
            icon={Coins01Icon}
            label={t("fact.budget")}
            value={budgetText}
          />
        ) : null}
        {lead.preferred_schedule ? (
          <FactRow
            icon={Calendar03Icon}
            label={t("fact.schedule")}
            value={lead.preferred_schedule}
          />
        ) : null}
        {lead.notes ? (
          <FactRow
            icon={Notebook02Icon}
            label={t("fact.notes")}
            value={lead.notes}
            multiline
          />
        ) : null}
        {lead.contact_phone_masked ? (
          <FactRow
            icon={SmartPhone01Icon}
            label={t("fact.phone")}
            value={lead.contact_phone_masked}
            hint={t("fact.phone_hint")}
          />
        ) : null}
      </dl>
    </section>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: LeadStatus;
  label: string;
}) {
  const tone =
    status === "responded" || status === "converted"
      ? "bg-success-soft text-success"
      : status === "cancelled" || status === "closed" || status === "spam"
      ? "bg-muted text-muted-foreground"
      : "bg-brand-soft text-brand-soft-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tone,
      )}
    >
      {label}
    </span>
  );
}

interface StatTileProps {
  icon: typeof Coins01Icon;
  label: string;
  value: string;
  emphasize?: boolean;
}

function StatTile({ icon, label, value, emphasize }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-card transition",
        emphasize
          ? "border-success/40 bg-success-soft/30"
          : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            emphasize
              ? "bg-success/15 text-success"
              : "bg-primary/10 text-primary",
          )}
        >
          <HugeiconsIcon icon={icon} size={16} strokeWidth={2} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface FactRowProps {
  icon: typeof Coins01Icon;
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
}

function FactRow({ icon, label, value, hint, multiline }: FactRowProps) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted/50 text-muted-foreground">
        <HugeiconsIcon icon={icon} size={14} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd
          className={cn(
            "text-sm font-medium text-foreground",
            multiline ? "whitespace-pre-line leading-relaxed" : "break-words",
          )}
        >
          {value}
        </dd>
        {hint ? (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function safeFormat(intl: Intl.DateTimeFormat, iso: string): string {
  try {
    return intl.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatBudgetRange(
  min: string | null | undefined,
  max: string | null | undefined,
  locale: Locale,
): string | null {
  const minNum = toNumberOrNull(min);
  const maxNum = toNumberOrNull(max);
  if (minNum === null && maxNum === null) return null;
  if (minNum !== null && maxNum !== null) {
    return `${formatLira(minNum, locale)} – ${formatLira(maxNum, locale)} / ${
      locale === "tr" ? "saat" : "hour"
    }`;
  }
  if (minNum !== null) {
    return `${locale === "tr" ? "En az" : "From"} ${formatLira(minNum, locale)} / ${
      locale === "tr" ? "saat" : "hour"
    }`;
  }
  if (maxNum !== null) {
    return `${locale === "tr" ? "En çok" : "Up to"} ${formatLira(maxNum, locale)} / ${
      locale === "tr" ? "saat" : "hour"
    }`;
  }
  return null;
}

function toNumberOrNull(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
