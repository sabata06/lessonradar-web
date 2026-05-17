import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CrownIcon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import type { TeacherQuotaPayload } from "@/lib/teacher-leads/types";

interface Props {
  quota: TeacherQuotaPayload;
}

/**
 * Single sticky strip rendered at the top of the inbox page (sticky on desktop
 * only — mobile renders inline). Four visual states:
 *
 *   1. Premium (`is_unlimited=true`)              → brand-soft, infinity copy
 *   2. Free, remaining > 2                         → brand-soft, "Bu ay {used}/{limit}"
 *   3. Free, remaining ≤ 2 && remaining > 0        → action-tinted (warning amber-soft)
 *   4. Free, remaining === 0                       → destructive-tinted, upgrade CTA
 *
 * Quota is a property of the teacher account, not the lead — so it lives in
 * the page chrome, never repeated per row. Mobile precedent: 2026-05-13.
 */
export async function TeacherInboxQuotaStrip({ quota }: Props) {
  const t = await getTranslations("panel.teacher.inbox.quota");
  if (quota.is_unlimited) {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 px-4 py-3 lg:sticky lg:top-4 lg:z-10">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/20 text-brand">
            <HugeiconsIcon icon={CrownIcon} size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t("premium_label")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const used = quota.used ?? 0;
  const limit = quota.limit ?? 0;
  const remaining =
    quota.remaining ?? Math.max(0, limit - used);
  const isBlocked = remaining === 0;
  const isWarning = !isBlocked && remaining <= 2;

  const tone = isBlocked
    ? "border-destructive/40 bg-destructive/10"
    : isWarning
      ? "border-action/40 bg-action/10"
      : "border-brand/25 bg-brand-soft/40";
  const iconTone = isBlocked
    ? "bg-destructive/15 text-destructive"
    : isWarning
      ? "bg-action/15 text-action-foreground"
      : "bg-brand/15 text-brand";
  const icon = isBlocked
    ? AlertCircleIcon
    : isWarning
      ? AlertCircleIcon
      : TickDouble01Icon;

  const title = isBlocked
    ? t("blocked_title")
    : isWarning
      ? t("warning_low", { remaining })
      : t("used_label", { used, limit });
  const subtitle = isBlocked
    ? t("blocked_subtitle")
    : isWarning
      ? t("used_label", { used, limit })
      : t("remaining_label", { remaining });

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 lg:sticky lg:top-4 lg:z-10",
        tone,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-lg",
            iconTone,
          )}
        >
          <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {isBlocked || isWarning ? (
          <a
            href="/ogretmen-ol"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              isBlocked
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "border border-action/40 bg-card text-action-foreground hover:bg-action/10",
            )}
          >
            {t("upgrade_cta")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2.5} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
