import type { LeadRequestPayload, LeadSubmitResponse } from "./schema";

export async function submitLeadRequest(
  payload: LeadRequestPayload,
): Promise<LeadSubmitResponse> {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as LeadSubmitResponse;
}
