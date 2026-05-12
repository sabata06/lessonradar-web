"use client";

import type { LeadApiRow } from "./schema";

/**
 * Carries the just-submitted lead response from the form to the `tesekkurler`
 * page so the success state can render real recipient counts instead of
 * generic copy. SessionStorage scopes the handoff to a single tab so back-button
 * users don't see a stale receipt.
 */

const KEY = "lr.lead.lastSubmission";

export interface LeadSubmissionHandoff {
  lead: LeadApiRow;
  notifiedCount: number;
}

export function storeLeadSubmission(snapshot: LeadSubmissionHandoff): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // quota or privacy mode — silently drop, success page falls back to id-only render
  }
}

export function readLeadSubmission(uuid?: string): LeadSubmissionHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeadSubmissionHandoff;
    if (uuid && parsed.lead?.uuid !== uuid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLeadSubmission(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
