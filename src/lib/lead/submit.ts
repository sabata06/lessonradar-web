import type { LeadRequestPayload, LeadSubmitResponse } from "./schema";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function submitLeadRequest(
  payload: LeadRequestPayload,
): Promise<LeadSubmitResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => null)) as
    | LeadSubmitResponse
    | null;
  if (!data) {
    return { ok: false, error: "network_error" };
  }
  return data;
}
