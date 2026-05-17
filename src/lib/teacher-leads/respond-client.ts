import type {
  RespondRequest,
  RespondResponse,
} from "./types";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Submit a teacher response to a lead recipient. Mirrors `cancelLeadRequest`
 * / `connectLeadOffer` / `submitLeadRequest` patterns: read the CSRF cookie,
 * POST with `x-csrf-token` header, return a discriminated union that the form
 * can switch on without parsing raw backend messages.
 *
 * On success the backend creates the message thread + first Message atomically
 * and returns `thread_uuid` so the caller can mount ThreadView in place
 * (no navigation).
 */
export async function respondToLead(
  recipientUuid: string,
  payload: RespondRequest,
): Promise<RespondResponse> {
  const csrf = readCsrfCookie();
  const res = await fetch(
    `/api/teacher/leads/${encodeURIComponent(recipientUuid)}/respond`,
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
    | RespondResponse
    | null;
  if (!data) {
    return { ok: false, error: "network_error" };
  }
  return data;
}
