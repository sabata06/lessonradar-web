import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InboxIcon,
  MessageAdd01Icon,
  ArrowRight01Icon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CustomerLeadsResponse } from "@/lib/lead/customer-leads";
import type { LeadApiRow } from "@/lib/lead/schema";

interface Props {
  data: CustomerLeadsResponse | null;
  locale: "tr" | "en";
}

function formatDate(iso: string, locale: "tr" | "en"): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export async function CustomerLeadsSection({ data, locale }: Props) {
  const t = await getTranslations("panel.customer.leads");

  // Auth/network error → soft empty state with retry CTA pointing at lead form
  if (data === null) {
    return (
      <section
        aria-labelledby="customer-leads-heading"
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
      >
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <p className="text-sm text-muted-foreground">{t("error_generic")}</p>
      </section>
    );
  }

  if (data.count === 0) {
    return (
      <section
        aria-labelledby="customer-leads-heading"
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
      >
        <SectionHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-background p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
            <HugeiconsIcon icon={InboxIcon} size={20} strokeWidth={1.8} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t("empty_title")}
            </p>
            <p className="text-sm text-muted-foreground">{t("empty_subtitle")}</p>
          </div>
          <Button
            asChild
            className="bg-action text-action-foreground shadow-action hover:bg-action/90"
          >
            <Link href="/ders-talebi">
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon icon={MessageAdd01Icon} size={16} strokeWidth={2} />
                {t("empty_cta")}
              </span>
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="customer-leads-heading"
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
    >
      <SectionHeader title={t("title")} subtitle={t("subtitle")} />
      <ul className="space-y-3">
        {data.results.map((lead) => (
          <li key={lead.uuid}>
            <LeadRow
              lead={lead}
              locale={locale}
              viewLabel={t("view_detail")}
              responsesLabel={t("has_responses")}
              statLabels={{
                recipients: t("stat.recipients"),
                responded: t("stat.responded"),
                status: t("stat.status"),
              }}
            />
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/ders-talebi">
            <span className="inline-flex items-center gap-2">
              {t("new_request_cta")}
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.5} />
            </span>
          </Link>
        </Button>
      </div>
    </section>
  );
}

interface LeadRowProps {
  lead: LeadApiRow;
  locale: "tr" | "en";
  viewLabel: string;
  responsesLabel: string;
  statLabels: {
    recipients: string;
    responded: string;
    status: string;
  };
}

/**
 * Single lead row. The whole row links to `/panel/talepler/<uuid>` so the
 * tap target is large on mobile; `responded_count > 0` adds a subtle teal
 * accent rail (brand soft) — never amber, since this is not a conversion CTA.
 */
function LeadRow({
  lead,
  locale,
  viewLabel,
  responsesLabel,
  statLabels,
}: LeadRowProps) {
  const hasResponses = lead.responded_count > 0;
  return (
    <Link
      href={`/panel/talepler/${lead.uuid}`}
      className={cn(
        "relative block overflow-hidden rounded-xl border bg-background p-4 transition",
        "hover:border-primary/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        hasResponses
          ? "border-brand/30 ring-1 ring-brand/10"
          : "border-border",
      )}
      aria-label={viewLabel}
    >
      {hasResponses ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand/50" />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {lead.discipline_name ?? lead.discipline_slug}
            {lead.city_name ? (
              <span className="text-muted-foreground"> · {lead.city_name}</span>
            ) : null}
            {lead.district_name ? (
              <span className="text-muted-foreground"> · {lead.district_name}</span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(lead.created_at, locale)}
            {lead.target_teacher ? (
              <>
                {" · "}
                <span className="text-foreground/80">
                  {lead.target_teacher.full_name}
                </span>
              </>
            ) : null}
          </p>
          {hasResponses ? (
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-success">
              <HugeiconsIcon
                icon={TickDouble01Icon}
                size={12}
                strokeWidth={2}
              />
              {responsesLabel}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={lead.status} locale={locale} />
          <span className="text-muted-foreground transition group-hover:text-foreground">
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </span>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label={statLabels.recipients} value={String(lead.recipient_count)} />
        <Stat
          label={statLabels.responded}
          value={String(lead.responded_count)}
          emphasize={hasResponses}
        />
        <Stat
          label={statLabels.status}
          value={translateStatus(lead.status, locale)}
        />
      </dl>
    </Link>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header>
      <h2
        id="customer-leads-heading"
        className="text-base font-semibold text-foreground"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-1.5",
        emphasize ? "bg-success-soft/40" : "bg-muted/40",
      )}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-semibold",
          emphasize ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusPill({
  status,
  locale,
}: {
  status: string;
  locale: "tr" | "en";
}) {
  const tone =
    status === "responded" || status === "completed"
      ? "bg-success-soft text-success"
      : status === "expired" || status === "cancelled"
      ? "bg-muted text-muted-foreground"
      : "bg-brand-soft text-brand-soft-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {translateStatus(status, locale)}
    </span>
  );
}

function translateStatus(status: string, locale: "tr" | "en"): string {
  if (locale === "tr") {
    switch (status) {
      case "fanned_out":
        return "İletildi";
      case "pending":
        return "Hazırlanıyor";
      case "responded":
        return "Yanıt geldi";
      case "completed":
        return "Tamamlandı";
      case "expired":
        return "Süresi doldu";
      case "cancelled":
        return "İptal";
      default:
        return status;
    }
  }
  switch (status) {
    case "fanned_out":
      return "Sent out";
    case "pending":
      return "Pending";
    case "responded":
      return "Replied";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
