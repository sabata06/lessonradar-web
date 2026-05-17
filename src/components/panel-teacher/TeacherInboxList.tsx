import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon } from "@hugeicons/core-free-icons";

import type { Locale } from "@/i18n/routing";
import type {
  TeacherLeadRow,
  TeacherQuotaPayload,
} from "@/lib/teacher-leads/types";

import { TeacherInboxRow } from "./TeacherInboxRow";

interface Props {
  rows: TeacherLeadRow[];
  quota: TeacherQuotaPayload;
  locale: Locale;
}

/**
 * Inbox list orchestrator. Sorts rows into three bands:
 *   1. Actionable    (can_respond=true, not in final state)
 *   2. Engaged       (status responded or declined)
 *   3. Locked/Expired (locked reason or expired)
 *
 * Within each band, rows sort by `-created_at` (newest first). Matches teacher
 * scan priority: act on what's actionable, then revisit engaged.
 */
export async function TeacherInboxList({ rows, quota, locale }: Props) {
  const t = await getTranslations("panel.teacher.inbox");
  const sorted = sortRows(rows);
  const quotaExhausted =
    !quota.is_unlimited && (quota.remaining ?? 0) <= 0;

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
          <HugeiconsIcon icon={InboxIcon} size={22} strokeWidth={1.8} />
        </span>
        <h3 className="mt-3 text-base font-semibold text-foreground">
          {t("empty.approved_title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("empty.approved_subtitle")}
        </p>
        <a
          href="/panel-ogretmen/basvuru-durumu"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-card px-3.5 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
        >
          {t("empty.approved_profile_cta")}
        </a>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sorted.map((row) => (
        <li key={row.uuid}>
          <TeacherInboxRow
            row={row}
            locale={locale}
            quotaExhausted={quotaExhausted}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Visibility filter: rows where `visible_at` is still in the future AND there's
 * no lock reason yet (backend should already exclude these, but defense in
 * depth). Backend convention: when visible_at is in the future and the row IS
 * returned, `response_locked_reason="not_visible_yet"` is set — we want to
 * keep those visible so the teacher sees the countdown.
 */
function sortRows(rows: TeacherLeadRow[]): TeacherLeadRow[] {
  const actionable: TeacherLeadRow[] = [];
  const engaged: TeacherLeadRow[] = [];
  const locked: TeacherLeadRow[] = [];

  for (const row of rows) {
    const isFinalState =
      row.status === "responded" ||
      row.status === "declined" ||
      row.status === "expired";
    if (isFinalState) {
      engaged.push(row);
    } else if (row.can_respond) {
      actionable.push(row);
    } else {
      locked.push(row);
    }
  }

  const byCreatedDesc = (a: TeacherLeadRow, b: TeacherLeadRow) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? "");

  actionable.sort(byCreatedDesc);
  engaged.sort(byCreatedDesc);
  locked.sort(byCreatedDesc);

  return [...actionable, ...engaged, ...locked];
}
