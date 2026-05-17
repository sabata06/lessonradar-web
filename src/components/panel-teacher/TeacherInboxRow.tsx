import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Sent02Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { TeacherLeadRow } from "@/lib/teacher-leads/types";

import { DeclineLeadButton } from "./DeclineLeadButton";
import {
  ICONS,
  TeacherInboxContactPrefHint,
  TeacherInboxFactChip,
  TeacherInboxKindPill,
  TeacherInboxLockNotice,
  TeacherInboxStatusBanner,
  modalityIcon,
} from "./TeacherInboxRowParts";

interface Props {
  row: TeacherLeadRow;
  locale: Locale;
  quotaExhausted: boolean;
}

/**
 * Single inbox row. Full anatomy (top→bottom): kind pill + timestamp →
 * contact-pref hint (if !== "any") → discipline title → location → fact chips
 * (level/modality/budget) → schedule → masked phone (hidden when customer's
 * preference is in_app, KVKK respect) → notes (clamped) → conditional final
 * state banner OR lock notice OR action row (decline + Respond Link).
 *
 * Row itself is NOT a Link — tap-target conflict with the action buttons
 * inside (Link + nested <Button> creates accidental nav on iOS Safari). The
 * "Talep detayı" tertiary text-link at the bottom navigates to detail.
 */
export async function TeacherInboxRow({ row, locale, quotaExhausted }: Props) {
  const t = await getTranslations("panel.teacher.inbox");
  const tCommon = await getTranslations("panel.teacher");

  const detailHref = `/panel-ogretmen/talepler/${row.uuid}`;
  const responded = row.status === "responded";
  const declined = row.status === "declined";
  const expired = row.status === "expired";
  const isFinalState = responded || declined || expired;
  const canRespond = row.can_respond && !isFinalState;
  const showLockNotice =
    !canRespond &&
    !isFinalState &&
    Boolean(row.response_locked_reason);

  const kindLabel = t(`kind.${row.kind}`, {
    defaultValue: row.kind,
  });
  const locationLine = [row.city_name, row.district_name]
    .filter(Boolean)
    .join(" · ");
  const levelLabel = row.level
    ? t(`level.${row.level}`, { defaultValue: row.level })
    : null;
  const modalityLabel = row.modality
    ? t(`modality.${row.modality}`, { defaultValue: row.modality })
    : null;
  const budgetLabel = formatBudget(row.budget_min, row.budget_max, t);
  const showMaskedPhone =
    row.customer_contact_preference !== "in_app" &&
    Boolean(row.contact_phone_masked);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-card transition md:p-5",
        responded
          ? "border-success/30"
          : declined || expired
            ? "border-border opacity-80"
            : quotaExhausted
              ? "border-border opacity-90"
              : "border-border hover:border-brand/40",
      )}
    >
      {/* Top row: kind pill + relative timestamp */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <TeacherInboxKindPill kind={row.kind} label={kindLabel} />
        <time
          dateTime={row.notified_at ?? row.created_at ?? undefined}
          className="text-[11px] text-muted-foreground"
        >
          {formatTimestamp(row.notified_at ?? row.created_at, locale)}
        </time>
      </header>

      {/* Contact preference hint — small pill below the kind */}
      {row.customer_contact_preference !== "any" ? (
        <div className="mt-2">
          <TeacherInboxContactPrefHint
            preference={row.customer_contact_preference}
            label={t(
              `contact_preference.${row.customer_contact_preference}`,
              { defaultValue: "" },
            )}
          />
        </div>
      ) : null}

      {/* Title + location */}
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {row.discipline_name || row.discipline_slug}
      </h3>
      {locationLine ? (
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={ICONS.location} size={12} strokeWidth={2} />
          {locationLine}
        </p>
      ) : null}

      {/* Fact chips: level / modality / budget */}
      {(levelLabel || modalityLabel || budgetLabel) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {levelLabel ? (
            <TeacherInboxFactChip
              icon={ICONS.schedule}
              label={levelLabel}
            />
          ) : null}
          {modalityLabel ? (
            <TeacherInboxFactChip
              icon={modalityIcon(row.modality)}
              label={modalityLabel}
            />
          ) : null}
          {budgetLabel ? (
            <TeacherInboxFactChip
              icon={ICONS.budget}
              label={budgetLabel}
            />
          ) : null}
        </div>
      ) : null}

      {/* Schedule */}
      {row.preferred_schedule ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={ICONS.schedule} size={12} strokeWidth={2} />
          <span className="line-clamp-1">{row.preferred_schedule}</span>
        </p>
      ) : null}

      {/* Masked phone — hidden when customer chose in_app only */}
      {showMaskedPhone ? (
        <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <HugeiconsIcon icon={ICONS.phone} size={12} strokeWidth={2} />
          {row.contact_phone_masked}
        </p>
      ) : null}

      {/* Notes — line-clamp on row; full text on detail page */}
      {row.notes ? (
        <p className="mt-2 line-clamp-2 rounded-lg bg-muted/40 p-2.5 text-xs text-foreground/85">
          "{row.notes}"
        </p>
      ) : null}

      {/* Final state banner OR lock notice OR action row */}
      {isFinalState ? (
        <TeacherInboxStatusBanner
          status={row.status}
          threadHref={
            responded && row.thread_uuid ? detailHref : undefined
          }
          threadCtaLabel={t("action.view_thread")}
          respondedTitle={t("status_banner.responded_title")}
          respondedSubtitle={t("status_banner.responded_subtitle")}
          declinedTitle={t("status_banner.declined_title")}
          expiredTitle={t("status_banner.expired_title")}
        />
      ) : showLockNotice ? (
        <TeacherInboxLockNotice
          label={t(
            `lock_reason.${row.response_locked_reason}`,
            { defaultValue: row.response_locked_reason },
          )}
        />
      ) : canRespond ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <DeclineLeadButton
            recipientUuid={row.uuid}
            labels={{
              trigger: t("action.decline"),
              title: tCommon("decline.title"),
              description: tCommon("decline.description"),
              reason_label: tCommon("decline.reason_label"),
              reason_placeholder: tCommon("decline.reason_placeholder"),
              reason_hint: tCommon("decline.reason_hint"),
              cancel: tCommon("decline.cancel"),
              confirm: tCommon("decline.confirm"),
              confirming: tCommon("decline.confirming"),
              error: {
                unauthorized: tCommon("decline.errors.unauthorized"),
                forbidden: tCommon("decline.errors.forbidden"),
                not_found: tCommon("decline.errors.not_found"),
                already_declined: tCommon("decline.errors.already_declined"),
                already_responded: tCommon("decline.errors.already_responded"),
                lead_cancelled: tCommon("decline.errors.lead_cancelled"),
                lead_completed: tCommon("decline.errors.lead_completed"),
                lead_expired: tCommon("decline.errors.lead_expired"),
                recipient_inactive: tCommon(
                  "decline.errors.recipient_inactive",
                ),
                validation_failed: tCommon(
                  "decline.errors.validation_failed",
                ),
                upstream_error: tCommon("decline.errors.upstream_error"),
                network_error: tCommon("decline.errors.network_error"),
              },
            }}
          />
          {quotaExhausted ? (
            <span
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground"
              title={t("action.disabled_quota_exhausted")}
            >
              <HugeiconsIcon icon={Sent02Icon} size={14} strokeWidth={2} />
              {t("action.disabled_quota_exhausted")}
            </span>
          ) : (
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3.5 py-2 text-sm font-semibold text-action-foreground shadow-action transition hover:bg-action/90"
            >
              <HugeiconsIcon icon={Sent02Icon} size={14} strokeWidth={2.2} />
              {t("action.respond")}
            </Link>
          )}
        </div>
      ) : null}

      {/* Tertiary text-link to detail page — always visible */}
      <div className="mt-3 flex justify-end">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {t("action.view_detail")}
          <HugeiconsIcon icon={ArrowRight01Icon} size={11} strokeWidth={2.5} />
        </Link>
      </div>
    </article>
  );
}

function formatBudget(
  min: string | null,
  max: string | null,
  t: Awaited<ReturnType<typeof getTranslations<"panel.teacher.inbox">>>,
): string | null {
  if (!min && !max) return null;
  if (min && max) {
    if (min === max) return `${min}₺`;
    return t("facts.budget_range_pattern", { min: `${min}₺`, max: `${max}₺` });
  }
  if (min) return `${min}₺+`;
  if (max) return `≤ ${max}₺`;
  return null;
}

function formatTimestamp(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
