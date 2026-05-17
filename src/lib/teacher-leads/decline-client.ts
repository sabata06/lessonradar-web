import type {
  DeclineRequest,
  DeclineResponse,
} from "./types";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Decline a lead recipient. Same shape as respond-client, but the backend
 * doesn't return a thread (decline is terminal) and doesn't debit quota.
 *
 * Idempotent on the backend side — repeating decline returns success without
 * re-firing notifications. UI should still surface the result so the inbox
 * row can flip to "Bu talebi reddettin" muted banner.
 */
export async function declineLead(
  recipientUuid: string,
  payload: DeclineRequest = {},
): Promise<DeclineResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch(
    `/api/teacher/leads/${encodeURIComponent(recipientUuid)}/decline`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    },
  );
  const data = (await res.json().catch(() => null)) as
    | DeclineResponse
    | null;
  if (!data) {
    return { ok: false, error: "network_error" };
  }
  return data;
}
