import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge04Icon,
  Clock01Icon,
  CircleIcon,
  Crown02Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type { SupportedLocale, TeacherTrustSignals } from "@/lib/types";
import { formatLastActive, formatResponseTime, isRecentlyActive } from "@/lib/format";

import { RatingStars } from "./RatingStars";

export function VerifiedBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? 14 : 16;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold leading-none text-brand-soft-foreground",
        size === "md" && "text-xs",
        className,
      )}
      aria-label="Doğrulanmış öğretmen"
      title="Kimlik ve diploma doğrulanmış"
    >
      <HugeiconsIcon icon={CheckmarkBadge04Icon} size={dim} strokeWidth={2} />
      Doğrulandı
    </span>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-action/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-action-hover",
        className,
      )}
      aria-label="Premium öğretmen"
    >
      <HugeiconsIcon icon={Crown02Icon} size={12} strokeWidth={2} />
      Premium
    </span>
  );
}

export function RatingLine({
  rating,
  count,
  locale,
  className,
}: {
  rating: number;
  count: number;
  locale: SupportedLocale;
  className?: string;
}) {
  if (count === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {locale === "tr" ? "Henüz değerlendirme yok" : "No reviews yet"}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RatingStars value={rating} />
      <span className="text-xs font-medium text-foreground">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </span>
  );
}

export function ResponseTimePill({
  minutes,
  locale,
  className,
}: {
  minutes: number;
  locale: SupportedLocale;
  className?: string;
}) {
  // Backend's median_response_minutes aggregate is null/0 until the
  // analytics job runs. Don't render "0 dk içinde" — drop the pill.
  if (!minutes || minutes <= 0) return null;
  const fast = minutes <= 30;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        fast ? "text-success" : "text-muted-foreground",
        className,
      )}
    >
      <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
      {formatResponseTime(minutes, locale)}
    </span>
  );
}

export function LastActiveDot({
  lastActiveAt,
  nowIso,
  locale,
  className,
}: {
  lastActiveAt: string | null;
  nowIso: string;
  locale: SupportedLocale;
  className?: string;
}) {
  const label = formatLastActive(lastActiveAt, nowIso, locale);
  // Backend hasn't recorded a `last_active_at` for this profile yet.
  // Drop the pill rather than render a misleading "0 dk" / "NaN ay önce".
  if (label === null) return null;
  const recent = isRecentlyActive(lastActiveAt, nowIso);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <HugeiconsIcon
        icon={CircleIcon}
        size={8}
        strokeWidth={0}
        className={cn(recent ? "text-success" : "text-muted-foreground/60")}
        style={{ fill: "currentColor" }}
      />
      {label}
    </span>
  );
}

export function TrustRow({
  trust,
  locale,
  nowIso,
  className,
}: {
  trust: TeacherTrustSignals;
  locale: SupportedLocale;
  nowIso: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <ResponseTimePill minutes={trust.responseTimeMinutes} locale={locale} />
      <LastActiveDot lastActiveAt={trust.lastActiveAt} nowIso={nowIso} locale={locale} />
    </div>
  );
}
