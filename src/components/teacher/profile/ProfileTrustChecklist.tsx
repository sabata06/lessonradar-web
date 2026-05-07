import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  DiplomaIcon,
  IdentificationIcon,
  Time04Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type { TeacherProfile } from "@/lib/types";

interface ProfileTrustChecklistProps {
  teacher: TeacherProfile;
}

/**
 * Verification breakdown. Honest about what we have *and* don't have —
 * pending checks render in a muted state instead of being hidden, which
 * is the trust posture DESIGN.md asks for ("informed confidence — not
 * coldness, not sales pressure").
 *
 * Profile completeness is a thin progress signal that helps teachers
 * understand where they stand without gamifying review counts.
 */
export function ProfileTrustChecklist({ teacher }: ProfileTrustChecklistProps) {
  const t = useTranslations("profile.trust");
  const { trust, profileCompleteness } = teacher;

  return (
    <section
      aria-labelledby="profile-trust-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <header>
        <h2
          id="profile-trust-title"
          className="text-lg font-semibold text-foreground sm:text-xl"
        >
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <ul className="mt-4 space-y-3">
        <ChecklistItem
          ok={trust.identityVerified}
          icon={
            <HugeiconsIcon icon={IdentificationIcon} size={18} strokeWidth={2} />
          }
          label={
            trust.identityVerified ? t("identity_verified") : t("identity_pending")
          }
        />
        <ChecklistItem
          ok={trust.diplomaVerified}
          icon={<HugeiconsIcon icon={DiplomaIcon} size={18} strokeWidth={2} />}
          label={
            trust.diplomaVerified ? t("diploma_verified") : t("diploma_pending")
          }
        />
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{t("completeness", { percent: profileCompleteness })}</span>
          <span className="text-foreground">{profileCompleteness}%</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={profileCompleteness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("completeness", { percent: profileCompleteness })}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${profileCompleteness}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function ChecklistItem({
  ok,
  icon,
  label,
}: {
  ok: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          ok
            ? "bg-success-soft text-success"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <p
        className={cn(
          "text-sm font-medium",
          ok ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <span
        aria-hidden
        className={cn(
          "ml-auto",
          ok ? "text-success" : "text-muted-foreground/60",
        )}
      >
        {ok ? (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
        ) : (
          <HugeiconsIcon icon={Time04Icon} size={16} strokeWidth={2} />
        )}
      </span>
    </li>
  );
}
