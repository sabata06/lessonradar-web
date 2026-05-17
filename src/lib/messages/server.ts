import "server-only";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import type {
  ThreadFetchOutcome,
  ThreadListFetchOutcome,
  ThreadListPayload,
  ThreadPayload,
} from "./types";

/**
 * Server-side initial thread fetch — used by the thread page so it can SSR
 * the first messages list. Subsequent polling happens client-side via
 * `fetchThreadClient` against the BFF.
 */
export async function fetchThreadServer(
  threadUuid: string,
): Promise<ThreadFetchOutcome> {
  const session = await getSession();
  if (!session) {
    return { ok: false, reason: "unauthorized" };
  }
  try {
    const data = await apiClient.get<ThreadPayload>(
      ENDPOINTS.MESSAGES_THREAD(threadUuid),
      { accessToken: session.djangoAccess },
    );
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return { ok: false, reason: "not_found" };
      if (error.status === 401) return { ok: false, reason: "unauthorized" };
      if (error.status === 403) return { ok: false, reason: "forbidden" };
    }
    return { ok: false, reason: "network_error" };
  }
}

/**
 * Fetch the authenticated user's full conversation list — powers the
 * WhatsApp-style "Mesajlarım" inbox page. Backend filters by participant
 * membership; same endpoint serves customer and teacher viewers.
 */
export async function fetchThreadList(): Promise<ThreadListFetchOutcome> {
  const session = await getSession({ refresh: true });
  if (!session) {
    return { ok: false, reason: "unauthorized" };
  }
  try {
    const data = await apiClient.get<ThreadListPayload>(
      ENDPOINTS.MESSAGES_THREAD_LIST,
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
