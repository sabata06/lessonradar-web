import { NextResponse } from "next/server";

import { apiClient, ApiError } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  AccountNotificationPayload,
  NotificationsUpdateErrorCode,
  NotificationsUpdatePayload,
  NotificationsUpdateResponse,
} from "@/lib/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const ALLOWED_BOOLEAN_KEYS = new Set<keyof NotificationsUpdatePayload>([
  "push_notifications_enabled",
  "lesson_updates_enabled",
  "lesson_change_updates_enabled",
  "enrollment_updates_enabled",
  "quiet_hours_enabled",
]);

function classifyDjangoError(err: ApiError): NotificationsUpdateErrorCode {
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 400) return "invalid_value";
  return "unknown";
}

export async function GET() {
  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json(
      { ok: false, code: "unauthorized" satisfies NotificationsUpdateErrorCode },
      { status: 401 },
    );
  }

  try {
    const data = await apiClient.get<AccountNotificationPayload>(
      ENDPOINTS.ACCOUNT_NOTIFICATIONS,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { ok: false, code: classifyDjangoError(error) },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}

export async function PATCH(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "invalid_value" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "invalid_value" },
      { status: 400 },
    );
  }

  const incoming = body as Record<string, unknown>;
  const payload: NotificationsUpdatePayload = {};

  for (const key of ALLOWED_BOOLEAN_KEYS) {
    const raw = incoming[key];
    if (typeof raw === "boolean") {
      (payload as Record<string, boolean | string>)[key] = raw;
    }
  }

  if (typeof incoming.quiet_hours_start === "string") {
    const value = incoming.quiet_hours_start.trim();
    if (!TIME_REGEX.test(value)) {
      return NextResponse.json<NotificationsUpdateResponse>(
        { ok: false, code: "invalid_value" },
        { status: 400 },
      );
    }
    payload.quiet_hours_start = value;
  }
  if (typeof incoming.quiet_hours_end === "string") {
    const value = incoming.quiet_hours_end.trim();
    if (!TIME_REGEX.test(value)) {
      return NextResponse.json<NotificationsUpdateResponse>(
        { ok: false, code: "invalid_value" },
        { status: 400 },
      );
    }
    payload.quiet_hours_end = value;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "invalid_value" },
      { status: 400 },
    );
  }

  try {
    const data = await apiClient.patch<AccountNotificationPayload>(
      ENDPOINTS.ACCOUNT_NOTIFICATIONS,
      payload,
      { accessToken: session.djangoAccess },
    );
    return NextResponse.json<NotificationsUpdateResponse>({
      ok: true,
      data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<NotificationsUpdateResponse>(
        { ok: false, code: classifyDjangoError(error) },
        { status: error.status },
      );
    }
    return NextResponse.json<NotificationsUpdateResponse>(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }
}
