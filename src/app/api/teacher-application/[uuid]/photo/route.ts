import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth/cookies";
import { validateCsrf } from "@/lib/security/csrf";
import { validateOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Mirrors `process_profile_photo.MAX_UPLOAD_BYTES` so we reject oversized
// payloads at the edge before paying Django CPU for body parsing.
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(
  req: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const { uuid } = await context.params;
  if (!UUID_REGEX.test(uuid)) {
    return NextResponse.json({ error: "invalid_uuid" }, { status: 400 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Cheap pre-flight: Content-Length header lets us reject the upload
  // before we read a byte. The Pillow pipeline re-checks server-side.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", detail: "Dosya 8 MB'ı geçemez." },
      { status: 413 },
    );
  }

  // We don't go through `apiClient` here because it JSON-stringifies the
  // body; multipart/form-data must pass through verbatim with its
  // boundary header intact. The native fetch + FormData round-trip
  // preserves both.
  const form = await req.formData();
  const upstreamUrl = `${process.env.DJANGO_API_BASE?.replace(/\/$/, "")}/api/teacher-applications/${encodeURIComponent(uuid)}/photo/`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: form,
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  const payload = await upstream.json().catch(() => null);
  return NextResponse.json(payload ?? { error: "upstream_empty" }, {
    status: upstream.status,
  });
}
