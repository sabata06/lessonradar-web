import type {
  CancelLeadRequest,
  CancelLeadResponse,
} from "./customer-lead-detail";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Client-side cancel-lead submitter. Mirrors `submitLeadRequest()` in
 * `submit.ts` — same CSRF header read, same same-origin credentials.
 */
export async function cancelLeadRequest(
  uuid: string,
  payload: CancelLeadRequest = {},
): Promise<CancelLeadResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch(`/api/leads/${encodeURIComponent(uuid)}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => null)) as
    | CancelLeadResponse
    | null;
  if (!data) {
    return { ok: false, error: "network_error" };
  }
  return data;
}
