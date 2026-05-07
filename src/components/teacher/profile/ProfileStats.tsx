import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Clock01Icon,
  StarsIcon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type { SupportedLocale, TeacherProfile } from "@/lib/types";
import { formatResponseTime } from "@/lib/format";

interface ProfileStatsProps {
  teacher: TeacherProfile;
  locale: SupportedLocale;
}

/**
 * Four-stat grid right under the hero. Stays calm and editorial — no
 * background gradients, no over-claimed numbers. Hidden stats (acceptance
 * rate when undefined) collapse into a 3-up grid instead of empty cards.
 */
export function ProfileStats({ teacher, locale }: ProfileStatsProps) {
  const t = useTranslations("profile.stats");
  const { trust, yearsOfExperience } = teacher;
  const showAcceptance = typeof trust.acceptanceRate === "number";

  const ratingValue =
    trust.reviewCount > 0 ? trust.ratingAverage.toFixed(1) : "—";
  const ratingHint =
    trust.reviewCount > 0
      ? t("reviews_count", { count: trust.reviewCount })
      : t("rating_unrated");

  const responseValue = formatResponseTime(trust.responseTimeMinutes, locale);
  const responseHint =
    trust.responseTimeMinutes <= 30 ? t("response_fast") : null;

  return (
    <section
      aria-label={`${t("rating")} · ${t("response")} · ${t("experience")}`}
      className={cn(
        "grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5",
        showAcceptance ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
      )}
    >
      <Stat
        icon={<HugeiconsIcon icon={StarsIcon} size={18} strokeWidth={2} />}
        label={t("rating")}
        value={ratingValue}
        hint={ratingHint}
        emphasize
      />
      <Stat
        icon={<HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={2} />}
        label={t("response")}
        value={responseValue}
        hint={responseHint}
        success={Boolean(responseHint)}
      />
      <Stat
        icon={<HugeiconsIcon icon={Briefcase01Icon} size={18} strokeWidth={2} />}
        label={t("experience")}
        value={t("experience_years", { years: yearsOfExperience })}
      />
      {showAcceptance && (
        <Stat
          icon={<HugeiconsIcon icon={UserCheck01Icon} size={18} strokeWidth={2} />}
          label={t("acceptance")}
          value={`${Math.round((trust.acceptanceRate ?? 0) * 100)}%`}
        />
      )}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  emphasize,
  success,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string | null;
  emphasize?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-transparent bg-card p-3 transition-colors">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span aria-hidden className="text-brand">
          {icon}
        </span>
        {label}
      </div>
      <p
        className={cn(
          "font-semibold leading-tight text-foreground",
          emphasize ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "text-[11px] leading-none",
            success ? "text-success" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
