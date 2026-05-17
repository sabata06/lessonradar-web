import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookmarkBlockIcon } from "@hugeicons/core-free-icons";

interface Props {
  /** Backend currently doesn't expose the teacher's decline reason on the row
   *  payload, but if/when it does, render it inline. */
  reason?: string | null;
}

/**
 * Final-state info card for a declined lead on the detail page. Muted tone,
 * no destructive accent — decline is permanent and the teacher has accepted
 * that. Mirror of the customer-side cancelled banner pattern.
 */
export async function TeacherLeadDeclinedBanner({ reason }: Props) {
  const t = await getTranslations("panel.teacher.declined_banner");
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground">
        <HugeiconsIcon icon={BookmarkBlockIcon} size={16} strokeWidth={2} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{t("title")}</p>
        <p>{t("body")}</p>
        {reason ? (
          <p className="mt-1 italic">{t("with_reason", { reason })}</p>
        ) : null}
      </div>
    </div>
  );
}
