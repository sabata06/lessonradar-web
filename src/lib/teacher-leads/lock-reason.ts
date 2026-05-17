import type { LockReason } from "./types";

/**
 * Map a backend lock-reason code into a plain i18n leaf key under
 * `panel.teacher.inbox.lock_reason.*`. Unknown codes fall back to a
 * generic locked label.
 *
 * Pre-translated copy is then passed down to client components as plain
 * strings — the lookup itself stays server-side so we don't ship the whole
 * code-to-message map to the client bundle.
 */
export function lockReasonKey(reason: LockReason | "" | string): string {
  if (!reason) return "";
  const known: Record<string, string> = {
    not_visible_yet: "panel.teacher.inbox.lock_reason.not_visible_yet",
    already_responded: "panel.teacher.inbox.lock_reason.already_responded",
    already_declined: "panel.teacher.inbox.lock_reason.already_declined",
    lead_cancelled: "panel.teacher.inbox.lock_reason.lead_cancelled",
    lead_completed: "panel.teacher.inbox.lock_reason.lead_completed",
    quota_exceeded: "panel.teacher.inbox.lock_reason.quota_exceeded",
    lead_expired: "panel.teacher.inbox.lock_reason.lead_expired",
    recipient_inactive: "panel.teacher.inbox.lock_reason.recipient_inactive",
  };
  return known[reason] || "";
}
