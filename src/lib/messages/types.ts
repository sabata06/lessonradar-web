/**
 * B8 — site/app içi mesajlaşma type contract. Mirrors backend payloads from
 * `docs/B8_CONNECT_BACKEND_CONTRACT.md` §Get Thread / Send Message / Mark Read.
 *
 * Type-only file — safe to import in client components.
 */

import type { ContactPreference } from "@/lib/lead/schema";

export type MessageSenderRole = "customer" | "teacher" | "system";
export type ModerationFlag = "phone" | "iban" | "email";
export type ThreadConnectionState = "in_app" | "revealed" | "closed";

export interface ThreadParticipant {
  id: number;
  display_name: string;
  slug?: string;
  avatar_url?: string | null;
  phone_visible: boolean;
  phone_e164: string | null;
}

export interface ThreadParticipants {
  customer: ThreadParticipant;
  teacher: ThreadParticipant;
}

export interface MessageRow {
  uuid: string;
  sender_role: MessageSenderRole;
  sender_id: number | null;
  body: string;
  moderation_warning_flags: ModerationFlag[];
  created_at: string;
}

export interface ThreadReadReceipts {
  customer_last_read_at: string | null;
  teacher_last_read_at: string | null;
}

export interface ThreadSummary {
  uuid: string;
  recipient_uuid: string;
  lead_uuid: string;
  customer_contact_preference: ContactPreference;
  connection_state: ThreadConnectionState;
  closed_at: string | null;
  created_at: string;
  participants: ThreadParticipants;
}

export interface ThreadPayload {
  thread: ThreadSummary;
  messages: MessageRow[];
  read_receipts: ThreadReadReceipts;
}

/**
 * Fetch outcome — tagged union so the server page can render notFound() vs a
 * transient network error without parsing inside the page.
 */
export type ThreadFetchOutcome =
  | { ok: true; data: ThreadPayload }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "network_error" };

/* ──────────────────────── Send Message ──────────────────────── */

export type SendMessageErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "empty_body"
  | "body_too_long"
  | "thread_closed"
  | "lead_cancelled"
  | "moderation_warning"
  | "throttle_message_send"
  | "upstream_error"
  | "network_error";

export interface SendMessageRequest {
  body: string;
  acknowledge_warnings?: boolean;
}

export interface SendMessageOk {
  ok: true;
  message: MessageRow;
  thread_updated_at: string;
}

/**
 * Moderation warning is a special case: server returns 400 but the response
 * carries `moderation_warning_flags` so the client can show a confirmation
 * dialog and re-send with `acknowledge_warnings=true`.
 */
export interface SendMessageError {
  ok: false;
  error: SendMessageErrorCode;
  message?: string;
  status?: number;
  moderation_warning_flags?: ModerationFlag[];
  warning_message?: string;
  retry_after_seconds?: number;
}

export type SendMessageResponse = SendMessageOk | SendMessageError;

/* ──────────────────────── Mark Read ──────────────────────── */

export type MarkReadErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "upstream_error"
  | "network_error";

export type MarkReadResponse =
  | { ok: true; receipts: ThreadReadReceipts }
  | { ok: false; error: MarkReadErrorCode; status?: number };

/* ──────────────────────── Thread list ──────────────────────── */

/**
 * Single row in the WhatsApp-style "Mesajlarım" inbox. Backend returns the
 * OTHER participant's display info so both customer and teacher viewers
 * render the same compact row shape.
 */
export interface ThreadListItem {
  uuid: string;
  recipient_uuid: string;
  lead_uuid: string;
  lead_discipline_name: string | null;
  other_display_name: string;
  other_avatar_url: string | null;
  other_role: "customer" | "teacher";
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_role: MessageSenderRole | null;
  unread_count: number;
  connection_state: ThreadConnectionState;
  updated_at: string;
}

export interface ThreadListPayload {
  count: number;
  results: ThreadListItem[];
}

export type ThreadListFetchOutcome =
  | { ok: true; data: ThreadListPayload }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "network_error" };
