import type {
  MarkReadResponse,
  SendMessageRequest,
  SendMessageResponse,
  ThreadPayload,
} from "./types";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Polling fetch — short-circuit early-returns the previous-known message ids
 * via `after`. The BFF re-validates session + role + thread participation.
 */
export async function fetchThreadClient(
  threadUuid: string,
  options: { after?: string; limit?: number } = {},
): Promise<ThreadPayload | { error: "network_error" }> {
  const query: string[] = [];
  if (options.after) query.push(`after=${encodeURIComponent(options.after)}`);
  if (options.limit) query.push(`limit=${options.limit}`);
  const qs = query.length > 0 ? `?${query.join("&")}` : "";
  const res = await fetch(
    `/api/messages/threads/${encodeURIComponent(threadUuid)}${qs}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  if (!res.ok) {
    return { error: "network_error" };
  }
  const data = (await res.json().catch(() => null)) as ThreadPayload | null;
  if (!data) return { error: "network_error" };
  return data;
}

export async function sendMessage(
  threadUuid: string,
  payload: SendMessageRequest,
): Promise<SendMessageResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch(
    `/api/messages/threads/${encodeURIComponent(threadUuid)}/send`,
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
  const data = (await res.json().catch(() => null)) as SendMessageResponse | null;
  if (!data) return { ok: false, error: "network_error" };
  return data;
}

export async function markThreadRead(
  threadUuid: string,
): Promise<MarkReadResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch(
    `/api/messages/threads/${encodeURIComponent(threadUuid)}/read`,
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
  const data = (await res.json().catch(() => null)) as MarkReadResponse | null;
  if (!data) return { ok: false, error: "network_error" };
  return data;
}
