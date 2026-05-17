import type { ConnectLeadResponse } from "./customer-lead-detail";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Client-side connect submitter. Customer-driven mutual phone reveal — fires
 * the BFF which proxies to Django. Idempotent: repeat calls on the same
 * recipient return the same connection state without raising. See
 * `docs/B8_CONNECT_BACKEND_CONTRACT.md` §Connect.
 */
export async function connectLeadOffer(
  leadUuid: string,
  recipientUuid: string,
): Promise<ConnectLeadResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch(
    `/api/leads/${encodeURIComponent(leadUuid)}/offers/${encodeURIComponent(recipientUuid)}/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: "{}",
      credentials: "same-origin",
    },
  );
  const data = (await res.json().catch(() => null)) as
    | ConnectLeadResponse
    | null;
  if (!data) {
    return { ok: false, error: "network_error" };
  }
  return data;
}
