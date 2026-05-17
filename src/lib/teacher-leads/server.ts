import "server-only";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import type {
  TeacherInboxFetchOutcome,
  TeacherInboxPayload,
  TeacherLeadDetailOutcome,
} from "./types";

/**
 * Fetch the authenticated teacher's lead inbox.
 *
 * Pattern mirrors `fetchCustomerLeadDetail` (tagged-union outcome) so the
 * caller can render notFound/forbidden/network/auth states explicitly. The
 * backend response already excludes raw phone/email; we forward the shape as-is.
 */
export async function fetchTeacherInbox(): Promise<TeacherInboxFetchOutcome> {
  const session = await getSession({ refresh: true });
  if (!session) {
    return { ok: false, reason: "unauthorized" };
  }
  try {
    const data = await apiClient.get<TeacherInboxPayload>(
      ENDPOINTS.LEAD_TEACHER_INBOX,
      { accessToken: session.djangoAccess },
    );
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { ok: false, reason: "unauthorized" };
      if (error.status === 403) return { ok: false, reason: "forbidden" };
    }
    return { ok: false, reason: "network_error" };
  }
}

/**
 * Fetch a single teacher lead by its recipient UUID.
 *
 * Trade-off: the backend doesn't expose a per-recipient detail endpoint, so we
 * fetch the full inbox and filter client-side. Acceptable at V1 scale (5-50
 * rows × few hundred bytes ≈ 10-20 KB worst-case). If perf becomes an issue,
 * backend can add `GET /api/teacher/leads/recipients/<uuid>/` later — UI
 * doesn't need to change because we already isolate the lookup here.
 */
export async function fetchTeacherLeadByRecipient(
  recipientUuid: string,
): Promise<TeacherLeadDetailOutcome> {
  const outcome = await fetchTeacherInbox();
  if (!outcome.ok) {
    if (outcome.reason === "unauthorized") {
      return { ok: false, reason: "unauthorized" };
    }
    if (outcome.reason === "forbidden") {
      return { ok: false, reason: "forbidden" };
    }
    return { ok: false, reason: "network_error" };
  }
  const row = outcome.data.results.find((r) => r.uuid === recipientUuid);
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, row, quota: outcome.data.quota };
}
