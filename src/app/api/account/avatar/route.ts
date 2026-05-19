import { NextResponse } from "next/server";

import { ENDPOINTS } from "@/api/endpoints";
import { getSession } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";
import type {
  AvatarUploadErrorCode,
  AvatarUploadPayload,
  AvatarUploadResponse,
} from "@/lib/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DJANGO_API_BASE = process.env.DJANGO_API_BASE;
const MAX_BYTES = 10 * 1024 * 1024; // Client-side pre-flight; Django pipeline does the real 8MB cap.
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * POST — upload a new profile image. Role-aware proxy: teacher accounts
 * PATCH `/api/auth/teacher-profile/`, customer/admin accounts PATCH
 * `/api/auth/customer-profile/`. Both endpoints accept the same
 * `profile_image` multipart field but enforce `IsTeacherOrAdmin` /
 * `IsCustomerOrAdmin` respectively — hitting the wrong one returns 403.
 *
 * Pre-flight rejects on type / size to save bandwidth, but the server-side
 * `image_pipeline` is still the authoritative validator (magic-byte check,
 * EXIF strip, sRGB convert, center-crop, max 1024px, WebP@82 re-encode).
 */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "forbidden" },
      { status: 403 },
    );
  }

  const session = await getSession({ refresh: true });
  if (!session) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "unauthorized" },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "file_required" },
      { status: 400 },
    );
  }
  const file = form.get("profile_image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "file_required" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "file_too_large" },
      { status: 400 },
    );
  }
  if (file.type && !ACCEPTED_TYPES.has(file.type.toLowerCase())) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "file_type_invalid" },
      { status: 400 },
    );
  }

  if (!DJANGO_API_BASE) {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "network_error" },
      { status: 503 },
    );
  }

  const targetPath =
    session.user.role === "teacher"
      ? ENDPOINTS.AUTH_TEACHER_PROFILE
      : ENDPOINTS.AUTH_CUSTOMER_PROFILE;
  const url = new URL(
    targetPath.replace(/^\/+/, "/"),
    DJANGO_API_BASE,
  ).toString();

  const upstream = new FormData();
  upstream.append("profile_image", file, file.name || "avatar");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.djangoAccess}`,
      },
      body: upstream,
    });
  } catch {
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code: "network_error" },
      { status: 502 },
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson
    ? await res.json().catch(() => null)
    : null;

  if (!res.ok) {
    let code: AvatarUploadErrorCode = "upload_failed";
    if (res.status === 401) code = "unauthorized";
    else if (res.status === 403) code = "forbidden";
    else if (res.status === 413) code = "file_too_large";
    else if (res.status === 400) {
      const flat = payload ? JSON.stringify(payload).toLowerCase() : "";
      if (flat.includes("too large") || flat.includes("max")) {
        code = "file_too_large";
      } else if (
        flat.includes("invalid image") ||
        flat.includes("file format") ||
        flat.includes("magic")
      ) {
        code = "file_type_invalid";
      }
    }
    return NextResponse.json<AvatarUploadResponse>(
      { ok: false, code },
      { status: res.status },
    );
  }

  return NextResponse.json<AvatarUploadResponse>({
    ok: true,
    data: payload as AvatarUploadPayload,
  });
}
