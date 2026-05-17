import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Calendar01Icon,
  MapsLocation01Icon,
  Notebook02Icon,
  PaymentSuccess01Icon,
  TelephoneIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { TeacherLeadRow } from "@/lib/teacher-leads/types";

import {
  TeacherInboxContactPrefHint,
  TeacherInboxKindPill,
  modalityIcon,
} from "./TeacherInboxRowParts";

interface Props {
  row: TeacherLeadRow;
  locale: Locale;
}

/**
 * Teacher-side lead detail summary. Mirrors the structural rhythm of the
 * customer's `LeadDetailSummary` (back link, status badges in header, fact
 * list) but the data and labels are teacher-context. KVKK: masked phone
 * hidden when customer's contact_preference is `in_app`.
 */
export async function TeacherLeadDetailSummary({ row, locale }: Props) {
  const t = await getTranslations("panel.teacher.lead");
  const tInbox = await getTranslations("panel.teacher.inbox");

  const intl = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const notifiedLabel = row.notified_at
    ? safeFormat(intl, row.notified_at)
    : t("stat.timing_value_pending");
  const disciplineLabel = row.discipline_name || row.discipline_slug;
  const kindLabel = tInbox(`kind.${row.kind}`, { defaultValue: row.kind });

  const cityLabel = row.city_name || row.city_slug;
  const districtLabel = row.district_name ?? row.district_slug ?? null;
  const locationLine = [cityLabel, districtLabel].filter(Boolean).join(" · ");
  const levelLabel = row.level
    ? tInbox(`level.${row.level}`, { defaultValue: row.level })
    : null;
  const modalityLabel = row.modality
    ? tInbox(`modality.${row.modality}`, { defaultValue: row.modality })
    : null;
  const budgetText = formatBudgetRange(
    row.budget_min,
    row.budget_max,
    tInbox("facts.budget_range_pattern", { min: "{min}", max: "{max}" }),
  );

  const showMaskedPhone =
    row.customer_contact_preference !== "in_app" &&
    Boolean(row.contact_phone_masked);

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/panel-ogretmen/talepler"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
          {t("back_to_inbox")}
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TeacherInboxKindPill kind={row.kind} label={kindLabel} />
          {row.customer_contact_preference !== "any" ? (
            <TeacherInboxContactPrefHint
              preference={row.customer_contact_preference}
              label={tInbox(
                `contact_preference.${row.customer_contact_preference}`,
                { defaultValue: "" },
              )}
            />
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("title", { discipline: disciplineLabel })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("stat.timing_label")}: {notifiedLabel}
        </p>
      </header>

      {/* 3-stat tile grid */}
      <dl className="grid grid-cols-3 gap-2">
        <Stat
          label={t("stat.level")}
          value={levelLabel ?? "—"}
        />
        <Stat
          label={t("stat.modality")}
          value={modalityLabel ?? "—"}
        />
        <Stat
          label={tInbox("facts.budget")}
          value={budgetText ?? "—"}
        />
      </dl>

      {/* Fact list */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 md:p-5">
        {locationLine ? (
          <FactRow
            icon={MapsLocation01Icon}
            label={tInbox("facts.location")}
            value={locationLine}
          />
        ) : null}
        {row.preferred_schedule ? (
          <FactRow
            icon={Calendar01Icon}
            label={tInbox("facts.schedule")}
            value={row.preferred_schedule}
          />
        ) : null}
        <FactRow
          icon={UserIcon}
          label={tInbox("contact_preference.hint")}
          value={tInbox(
            `contact_preference.${row.customer_contact_preference}`,
            { defaultValue: row.customer_contact_preference },
          )}
        />
        {showMaskedPhone ? (
          <FactRow
            icon={TelephoneIcon}
            label={tInbox("facts.phone")}
            value={row.contact_phone_masked}
            mono
          />
        ) : null}
        {row.notes ? (
          <div className="mt-2 rounded-lg bg-muted/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {tInbox("facts.notes")}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">
              {row.notes}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FactRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: typeof MapsLocation01Icon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <HugeiconsIcon icon={icon} size={12} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm",
            mono ? "font-mono" : "font-medium",
            "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function formatBudgetRange(
  min: string | null,
  max: string | null,
  template: string,
): string | null {
  if (!min && !max) return null;
  if (min && max) {
    if (min === max) return `${min}₺`;
    return template.replace("{min}", `${min}₺`).replace("{max}", `${max}₺`);
  }
  if (min) return `${min}₺+`;
  if (max) return `≤ ${max}₺`;
  return null;
}

function safeFormat(intl: Intl.DateTimeFormat, iso: string): string {
  try {
    return intl.format(new Date(iso));
  } catch {
    return iso;
  }
}
