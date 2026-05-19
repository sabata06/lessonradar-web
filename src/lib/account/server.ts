import "server-only";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";

import type {
  AccountCustomerProfilePayload,
  AccountFetchOutcome,
  AccountNotificationPayload,
  AccountProfilePayload,
  AccountSummary,
} from "./types";

function isApiUnreachable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  return true;
}

/**
 * Fetch the authenticated user's base profile. 401/403 surface as typed
 * outcomes so the page can decide between redirect / render-disabled /
 * soft-error UI without re-parsing the error.
 */
export async function fetchAccountProfile(): Promise<
  AccountFetchOutcome<AccountProfilePayload>
> {
  const session = await getSession({ refresh: true });
  if (!session) return { kind: "unauthorized" };

  try {
    const data = await apiClient.get<AccountProfilePayload>(
      ENDPOINTS.AUTH_PROFILE,
      { accessToken: session.djangoAccess },
    );
    return { kind: "ok", data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { kind: "unauthorized" };
      if (error.status === 403) return { kind: "forbidden" };
      if (error.status === 404) return { kind: "not_found" };
    }
    return isApiUnreachable(error)
      ? { kind: "network_error" }
      : { kind: "network_error" };
  }
}

/**
 * Fetch the authenticated customer's CustomerProfile row (phone, address,
 * grade, parent contact, completion %, profile image URL).
 *
 * Backend auto-creates a row on GET via `get_or_create`, so 404 should never
 * happen for a real customer; treating it as `not_found` keeps the page
 * resilient if the role guard ever lets a teacher through by accident.
 */
export async function fetchCustomerProfile(): Promise<
  AccountFetchOutcome<AccountCustomerProfilePayload>
> {
  const session = await getSession({ refresh: true });
  if (!session) return { kind: "unauthorized" };

  try {
    const data = await apiClient.get<AccountCustomerProfilePayload>(
      ENDPOINTS.AUTH_CUSTOMER_PROFILE,
      { accessToken: session.djangoAccess },
    );
    return { kind: "ok", data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { kind: "unauthorized" };
      if (error.status === 403) return { kind: "forbidden" };
      if (error.status === 404) return { kind: "not_found" };
    }
    return { kind: "network_error" };
  }
}

/**
 * Batch profile + customer-profile in parallel. /panel mini-card + /ayarlar
 * landing both need them together; one helper avoids double waterfall.
 */
export async function fetchAccountSummary(): Promise<
  AccountFetchOutcome<AccountSummary>
> {
  const session = await getSession({ refresh: true });
  if (!session) return { kind: "unauthorized" };

  const [profileResult, customerResult] = await Promise.all([
    fetchAccountProfile(),
    fetchCustomerProfile(),
  ]);

  if (profileResult.kind !== "ok") return profileResult;

  // For admin or teacher viewers, the customer-profile endpoint is gated by
  // `IsCustomerOrAdmin`; admins get a real customer profile row but teachers
  // return 403. Either is acceptable for the summary — we surface null and
  // let the caller decide what to render.
  const customer =
    customerResult.kind === "ok" ? customerResult.data : null;

  return {
    kind: "ok",
    data: { profile: profileResult.data, customer },
  };
}

/**
 * Fetch the authenticated user's notification preferences. Backend
 * auto-creates the row on first GET.
 */
export async function fetchNotificationPreferences(): Promise<
  AccountFetchOutcome<AccountNotificationPayload>
> {
  const session = await getSession({ refresh: true });
  if (!session) return { kind: "unauthorized" };

  try {
    const data = await apiClient.get<AccountNotificationPayload>(
      ENDPOINTS.ACCOUNT_NOTIFICATIONS,
      { accessToken: session.djangoAccess },
    );
    return { kind: "ok", data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { kind: "unauthorized" };
      if (error.status === 403) return { kind: "forbidden" };
    }
    return { kind: "network_error" };
  }
}
