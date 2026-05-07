import { NextResponse } from "next/server";

import {
  teacherApplicationSchema,
  type TeacherApplicationResponse,
} from "@/lib/teacher-application/schema";

/**
 * Mock teacher-application endpoint.
 *
 * When the Django backend lands, this handler is the single swap point
 * — the client form & validation stay untouched. The backend should
 * provision a `Teacher` row in `pending_review` status, dispatch an
 * "application received" email to the applicant, and notify ops.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<TeacherApplicationResponse>(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = teacherApplicationSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return NextResponse.json<TeacherApplicationResponse>(
      { ok: false, error: "validation_failed", fieldErrors },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV !== "production") {
    // Don't log PII (phone/email) in production. Local dev only.
    console.info("[teacher-application] received", {
      fullName: parsed.data.fullName,
      disciplines: parsed.data.disciplineSlugs,
      city: parsed.data.citySlug,
    });
  }

  const id = `mock_${cryptoRandomId()}`;
  const receivedAt = new Date().toISOString();

  return NextResponse.json<TeacherApplicationResponse>({
    ok: true,
    id,
    receivedAt,
  });
}

function cryptoRandomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
