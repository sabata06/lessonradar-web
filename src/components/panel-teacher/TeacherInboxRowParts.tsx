import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ComputerIcon,
  Coupon02Icon,
  LockedIcon,
  MapsLocation01Icon,
  PaymentSuccess01Icon,
  TelephoneIcon,
  UserGroupIcon,
  UserIcon,
  WhatsappIcon,
  BubbleChatIcon,
  FlashIcon,
  Time04Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type {
  ContactPreference,
  LockReason,
  TeacherLeadKind,
  TeacherLeadStatus,
} from "@/lib/teacher-leads/types";

/* ───────────────────────── KindPill ───────────────────────── */

interface KindPillProps {
  kind: TeacherLeadKind | string;
  label: string;
}

/**
 * Visual differentiator on the row's top-left corner. Five lead kinds resolve
 * to three tone families: brand for premium/free, success for direct, action
 * for direct_backup (small visual signal "you're a fallback").
 */
export function TeacherInboxKindPill({ kind, label }: KindPillProps) {
  const tone =
    kind === "direct" || kind === "direct_target"
      ? "border-success/30 bg-success/10 text-success"
      : kind === "direct_backup"
        ? "border-action/30 bg-action/10 text-action-foreground"
        : kind === "free_delayed"
          ? "border-border bg-muted/50 text-muted-foreground"
          : "border-brand/30 bg-brand-soft text-brand-soft-foreground";
  const icon =
    kind === "direct" || kind === "direct_target" || kind === "direct_backup"
      ? UserIcon
      : kind === "free_delayed"
        ? Time04Icon
        : FlashIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tone,
      )}
    >
      <HugeiconsIcon icon={icon} size={11} strokeWidth={2.2} />
      {label}
    </span>
  );
}

/* ───────────────────────── StatusBanner ───────────────────────── */

interface StatusBannerProps {
  status: TeacherLeadStatus;
  threadHref?: string;
  threadCtaLabel?: string;
  respondedTitle: string;
  respondedSubtitle?: string;
  declinedTitle: string;
  expiredTitle: string;
}

/**
 * Final-state row banner. `responded` is tappable when a thread exists so the
 * teacher can re-enter the conversation; declined and expired are muted info
 * banners (no further action).
 */
export function TeacherInboxStatusBanner({
  status,
  threadHref,
  threadCtaLabel,
  respondedTitle,
  respondedSubtitle,
  declinedTitle,
  expiredTitle,
}: StatusBannerProps) {
  if (status === "responded") {
    const body = (
      <>
        <span className="grid size-8 place-items-center rounded-full bg-success/15 text-success">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={2}
          />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {respondedTitle}
          </span>
          {respondedSubtitle ? (
            <span className="block text-xs text-muted-foreground">
              {respondedSubtitle}
            </span>
          ) : null}
        </span>
      </>
    );
    if (threadHref) {
      return (
        <a
          href={threadHref}
          className="mt-3 flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-3 py-2.5 transition hover:bg-success/10"
        >
          {body}
          <span
            aria-hidden
            className="text-xs font-semibold uppercase tracking-wider text-success"
          >
            {threadCtaLabel}
          </span>
        </a>
      );
    }
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-3 py-2.5">
        {body}
      </div>
    );
  }
  if (status === "declined") {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={LockedIcon} size={16} strokeWidth={2} />
        </span>
        <span className="text-sm text-muted-foreground">{declinedTitle}</span>
      </div>
    );
  }
  if (status === "expired") {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} />
        </span>
        <span className="text-sm text-muted-foreground">{expiredTitle}</span>
      </div>
    );
  }
  return null;
}

/* ───────────────────────── LockNotice ───────────────────────── */

interface LockNoticeProps {
  label: string;
}

/**
 * Shown when `can_respond=false` AND the row is not yet a final-state
 * (responded/declined/expired). E.g., `not_visible_yet`, `quota_exceeded`.
 */
export function TeacherInboxLockNotice({ label }: LockNoticeProps) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2">
      <HugeiconsIcon
        icon={AlertCircleIcon}
        size={14}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-muted-foreground"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/* ───────────────────────── ContactPrefHint ───────────────────────── */

interface ContactPrefHintProps {
  preference: ContactPreference;
  label: string;
}

/**
 * Tiny pill below the kind pill that surfaces customer's chosen contact
 * channel — so the teacher knows whether to expect phone reveal or stay
 * in-app. Hidden entirely when preference is "any" (no signal worth showing).
 */
export function TeacherInboxContactPrefHint({
  preference,
  label,
}: ContactPrefHintProps) {
  if (preference === "any") return null;
  const icon =
    preference === "in_app"
      ? BubbleChatIcon
      : preference === "whatsapp_reveal"
        ? WhatsappIcon
        : TelephoneIcon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft/50 px-2 py-0.5 text-[11px] font-medium text-brand-soft-foreground">
      <HugeiconsIcon icon={icon} size={11} strokeWidth={2} />
      {label}
    </span>
  );
}

/* ───────────────────────── FactChip ───────────────────────── */

interface FactChipProps {
  icon: typeof MapsLocation01Icon;
  label: string;
}

export function TeacherInboxFactChip({ icon, label }: FactChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      <HugeiconsIcon icon={icon} size={11} strokeWidth={2} />
      {label}
    </span>
  );
}

/** Resolve a modality string to a Hugeicons icon for the fact chip. */
export function modalityIcon(modality: string) {
  if (modality === "online") return ComputerIcon;
  if (modality === "in_person") return UserGroupIcon;
  return Coupon02Icon;
}

/** Re-export commonly used icons so the row doesn't need to import direct. */
export const ICONS = {
  location: MapsLocation01Icon,
  schedule: Calendar01Icon,
  phone: TelephoneIcon,
  budget: PaymentSuccess01Icon,
};

/* ───────────────────────── lockReasonToKey ───────────────────────── */

/** Server-side helper — map a lock reason code into its i18n leaf. */
export function lockReasonLabelKey(reason: LockReason | "" | string): string {
  if (!reason) return "";
  return `panel.teacher.inbox.lock_reason.${reason}`;
}
