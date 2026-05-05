import { NextResponse } from "next/server";
import { leadRequestSchema, type LeadSubmitResponse } from "@/lib/lead/schema";

/**
 * Mock lead-request endpoint.
 * When the Django backend lands, this handler is the single swap point —
 * the client form & validation stay untouched.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = leadRequestSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return NextResponse.json<LeadSubmitResponse>(
      { ok: false, error: "validation_failed", fieldErrors },
      { status: 400 },
    );
  }

  // TODO(backend): POST parsed.data to Django /api/v1/leads/, await teacher
  // notification fanout, persist correlation id, return real lead id.
  if (process.env.NODE_ENV !== "production") {
    console.info("[lead] received", parsed.data);
  }

  const id = `mock_${cryptoRandomId()}`;
  const receivedAt = new Date().toISOString();

  return NextResponse.json<LeadSubmitResponse>({ ok: true, id, receivedAt });
}

function cryptoRandomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
