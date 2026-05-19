"use client";

import type {
  AvatarUploadResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
  CustomerProfileUpdatePayload,
  CustomerProfileUpdateResponse,
  DeleteAccountResponse,
  NotificationsUpdatePayload,
  NotificationsUpdateResponse,
  ProfileUpdatePayload,
  ProfileUpdateResponse,
} from "./types";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface JsonRequestOptions<TBody> {
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: TBody;
}

async function jsonRequest<TBody, TResponse>(
  path: string,
  { method, body }: JsonRequestOptions<TBody>,
): Promise<TResponse | null> {
  const csrf = readCsrfCookie();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  return (await res.json().catch(() => null)) as TResponse | null;
}

// ── Profile (base) ────────────────────────────────────────────────────────

export async function updateProfileRequest(
  payload: ProfileUpdatePayload,
): Promise<ProfileUpdateResponse> {
  const data = await jsonRequest<ProfileUpdatePayload, ProfileUpdateResponse>(
    "/api/account/profile",
    { method: "PATCH", body: payload },
  );
  return data ?? { ok: false, code: "network_error" };
}

// ── Customer profile ──────────────────────────────────────────────────────

export async function updateCustomerProfileRequest(
  payload: CustomerProfileUpdatePayload,
): Promise<CustomerProfileUpdateResponse> {
  const data = await jsonRequest<
    CustomerProfileUpdatePayload,
    CustomerProfileUpdateResponse
  >("/api/account/customer-profile", { method: "PATCH", body: payload });
  return data ?? { ok: false, code: "network_error" };
}

// ── Avatar upload (multipart, no JSON body) ───────────────────────────────

export async function uploadAvatarRequest(
  file: File,
): Promise<AvatarUploadResponse> {
  const csrf = readCsrfCookie();
  const formData = new FormData();
  formData.append("profile_image", file, file.name);

  const res = await fetch("/api/account/avatar", {
    method: "POST",
    headers: csrf ? { "x-csrf-token": csrf } : undefined,
    body: formData,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => null)) as
    | AvatarUploadResponse
    | null;
  return data ?? { ok: false, code: "network_error" };
}

// ── Change password ───────────────────────────────────────────────────────

export async function changePasswordRequest(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  const data = await jsonRequest<ChangePasswordPayload, ChangePasswordResponse>(
    "/api/account/change-password",
    { method: "POST", body: payload },
  );
  return data ?? { ok: false, code: "network_error" };
}

// ── Delete account ────────────────────────────────────────────────────────

export interface DeleteAccountPayload {
  reason?: string;
}

export async function deleteAccountRequest(
  payload: DeleteAccountPayload = {},
): Promise<DeleteAccountResponse> {
  const data = await jsonRequest<DeleteAccountPayload, DeleteAccountResponse>(
    "/api/account/delete-account",
    { method: "POST", body: payload },
  );
  return data ?? { ok: false, code: "network_error" };
}

// ── Notification preferences ──────────────────────────────────────────────

export async function updateNotificationsRequest(
  payload: NotificationsUpdatePayload,
): Promise<NotificationsUpdateResponse> {
  const data = await jsonRequest<
    NotificationsUpdatePayload,
    NotificationsUpdateResponse
  >("/api/account/notifications", { method: "PATCH", body: payload });
  return data ?? { ok: false, code: "network_error" };
}
