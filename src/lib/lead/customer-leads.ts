import "server-only";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import type { LeadApiRow } from "./schema";

export interface CustomerLeadsResponse {
  count: number;
  results: LeadApiRow[];
}

/**
 * Fetch the authenticated customer's leads for the panel "Taleplerim" section.
 * Returns `null` on auth/network failure so the caller can render a graceful
 * empty/error state without blowing up the panel.
 */
export async function fetchCustomerLeads(): Promise<CustomerLeadsResponse | null> {
  const session = await getSession({ refresh: true });
  if (!session) return null;

  try {
    const data = await apiClient.get<CustomerLeadsResponse>(
      ENDPOINTS.LEAD_CUSTOMER_MINE,
      { accessToken: session.djangoAccess },
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    return null;
  }
}
