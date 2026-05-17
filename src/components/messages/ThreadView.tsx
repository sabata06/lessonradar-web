"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Loading02Icon,
  Sent02Icon,
} from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchThreadClient,
  markThreadRead,
  sendMessage,
} from "@/lib/messages/client";
import type {
  MessageRow,
  ModerationFlag,
  SendMessageErrorCode,
  ThreadPayload,
  ThreadReadReceipts,
} from "@/lib/messages/types";

const POLL_INTERVAL_MS = 10_000;
const BODY_MAX = 4000;

interface Labels {
  backToLead: string;
  headerTitleWith: string;
  connectionState: { in_app: string; revealed: string; closed: string };
  placeholder: string;
  placeholderClosed: string;
  send: string;
  sending: string;
  charCount: string;
  empty: string;
  you: string;
  seen: string;
  moderation: {
    title: string;
    description: string;
    flagPhone: string;
    flagIban: string;
    flagEmail: string;
    cancel: string;
    confirm: string;
    confirming: string;
  };
  errors: Record<
    Exclude<SendMessageErrorCode, "moderation_warning">,
    string
  >;
}

interface Props {
  initial: ThreadPayload;
  leadUuid: string;
  recipientUuid: string;
  labels: Labels;
  /**
   * Which side of the conversation the current user is on. Drives bubble
   * alignment (mine right, other left), seen-receipt comparison (against the
   * other participant's last_read_at), and participants display name lookup.
   * Defaults to "customer" for backward compatibility with the original
   * customer thread mount.
   */
  viewerRole?: "customer" | "teacher";
  /**
   * Where the "back" link sends the user — customer flow points at the lead
   * detail page, teacher flow points at the teacher inbox detail page. The
   * default keeps existing customer-side callers working without explicit
   * prop opt-in.
   */
  backHref?: string;
}

/**
 * Thread view — server-prefetched messages, then 10s polling. Send + read +
 * moderation flow all run client-side against the BFF.
 *
 * Role-aware (B7+B8): backend resolves participant role from the auth token,
 * so the same endpoints serve customer and teacher. The component takes a
 * `viewerRole` prop so it can flip "mine vs other" bubble alignment and read
 * the correct last-read timestamp without changing wire format.
 *
 * Polling cadence is intentionally simple: a single `setInterval`, paused
 * while the document is hidden so background tabs don't burn requests.
 * Send is optimistic-free in V1: we wait for the server message back and then
 * append, so the canonical id + timestamp stay authoritative.
 */
export function ThreadView({
  initial,
  leadUuid,
  labels,
  viewerRole = "customer",
  backHref,
}: Props) {
  const resolvedBackHref = backHref ?? `/panel/talepler/${leadUuid}`;
  const [messages, setMessages] = useState<MessageRow[]>(initial.messages);
  const [readReceipts, setReadReceipts] = useState<ThreadReadReceipts>(
    initial.read_receipts,
  );
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [moderationFlags, setModerationFlags] = useState<ModerationFlag[] | null>(
    null,
  );
  const [pendingBody, setPendingBody] = useState<string>("");

  const threadUuid = initial.thread.uuid;
  const threadClosed = initial.thread.closed_at !== null;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastReadFiredRef = useRef<string | null>(null);

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].uuid : null;

  // Scroll to bottom whenever messages change. Fast in practice — list is
  // bounded and re-renders only on new payloads.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  /** Pull new messages since the last known uuid. Best-effort: errors silently
   *  retried on the next tick. */
  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const after = lastMessageId ?? undefined;
    const result = await fetchThreadClient(threadUuid, { after });
    if ("error" in result) return;
    if (result.messages.length > 0) {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.uuid));
        const merged = [...prev];
        for (const m of result.messages) {
          if (!seen.has(m.uuid)) merged.push(m);
        }
        return merged;
      });
    }
    setReadReceipts(result.read_receipts);
  }, [threadUuid, lastMessageId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  // Mark read whenever the latest message id changes. Skip if we already
  // fired for the same id — avoids hammering the endpoint when polling
  // returns no new messages.
  useEffect(() => {
    if (!lastMessageId) return;
    if (lastReadFiredRef.current === lastMessageId) return;
    lastReadFiredRef.current = lastMessageId;
    void markThreadRead(threadUuid).then((res) => {
      if (res.ok) setReadReceipts(res.receipts);
    });
  }, [threadUuid, lastMessageId]);

  function errorMessage(code: SendMessageErrorCode): string {
    if (code === "moderation_warning") return ""; // handled separately
    return labels.errors[code];
  }

  async function doSend(text: string, acknowledge: boolean) {
    setSendError(null);
    setSubmitting(true);
    const res = await sendMessage(threadUuid, {
      body: text,
      acknowledge_warnings: acknowledge,
    });
    setSubmitting(false);
    if (res.ok) {
      // Append the canonical server row and clear the input.
      setMessages((prev) => [...prev, res.message]);
      setBody("");
      setModerationFlags(null);
      setPendingBody("");
      return;
    }
    if (res.error === "moderation_warning") {
      setModerationFlags(res.moderation_warning_flags ?? []);
      setPendingBody(text);
      return;
    }
    setSendError(errorMessage(res.error));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    await doSend(body, false);
  }

  async function handleModerationConfirm() {
    if (!pendingBody) return;
    await doSend(pendingBody, true);
  }

  function handleModerationCancel() {
    setModerationFlags(null);
    setPendingBody("");
  }

  // Pick the other participant's display name based on viewer role — the
  // backend serializes both participants symmetrically.
  const otherDisplay =
    viewerRole === "teacher"
      ? initial.thread.participants.customer.display_name
      : initial.thread.participants.teacher.display_name;
  const stateLabel =
    initial.thread.connection_state === "revealed"
      ? labels.connectionState.revealed
      : initial.thread.connection_state === "closed"
        ? labels.connectionState.closed
        : labels.connectionState.in_app;
  // Seen-indicator on MY bubbles fires when the OTHER side has read past
  // them. The customer's bubble checks teacher_last_read_at; the teacher's
  // bubble checks customer_last_read_at.
  const otherLastRead =
    viewerRole === "teacher"
      ? readReceipts.customer_last_read_at
      : readReceipts.teacher_last_read_at;

  // Tokenize the header label so the same template works for either role —
  // page-side passes the resolved name; we substitute both {teacher} and
  // {customer} tokens to be permissive.
  const headerTitle = labels.headerTitleWith
    .replace("{teacher}", otherDisplay)
    .replace("{customer}", otherDisplay);

  return (
    <div className="space-y-5">
      {/* Back link to the lead detail page. Calm Editorial — text-link not button. */}
      <Link
        href={resolvedBackHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2.2} />
        {labels.backToLead}
      </Link>

      <header className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
        <h1 className="text-lg font-semibold text-foreground">
          {headerTitle}
        </h1>
        <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {stateLabel}
        </span>
      </header>

      {/*
        Messages container — WhatsApp/iMessage convention: chat content pins
        to the bottom of the viewport so the first message visually anchors
        where the user expects it. We use an inner flex column with
        `justify-end` + `min-h-full` so few-message threads sit just above
        the composer instead of floating at the top.
      */}
      <div
        ref={scrollRef}
        className="max-h-[60vh] min-h-[24rem] overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            {labels.empty}
          </div>
        ) : (
          <ul className="flex min-h-full flex-col justify-end gap-3">
            {messages.map((m) => (
              <MessageBubble
                key={m.uuid}
                msg={m}
                viewerRole={viewerRole}
                youLabel={labels.you}
                seenLabel={labels.seen}
                otherLastRead={otherLastRead}
              />
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/*
          Composer — WhatsApp/iMessage chat input convention: textarea grows
          inline, round send icon button anchored right. The button flips
          between disabled-muted and active-action-color based on trimmed
          body length, giving a passive→active affordance that's instantly
          readable. The amber action color stays "sacred" per DESIGN.md —
          this IS a conversion CTA (committing the message).
        */}
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            placeholder={threadClosed ? labels.placeholderClosed : labels.placeholder}
            rows={1}
            maxLength={BODY_MAX}
            disabled={threadClosed || submitting}
            onKeyDown={(e) => {
              // Enter to send, Shift+Enter for newline — standard chat input.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (
                  !threadClosed &&
                  !submitting &&
                  body.trim().length > 0
                ) {
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
            className="min-h-[44px] flex-1 resize-none rounded-full border-border px-4 py-2.5 text-sm leading-snug"
          />
          <button
            type="submit"
            disabled={threadClosed || submitting || body.trim().length === 0}
            aria-label={labels.send}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/60",
              threadClosed || submitting || body.trim().length === 0
                ? "bg-muted text-muted-foreground"
                : "bg-action text-action-foreground shadow-action hover:bg-action-hover",
            )}
          >
            {submitting ? (
              <HugeiconsIcon
                icon={Loading02Icon}
                size={18}
                strokeWidth={2.5}
                className="animate-spin"
              />
            ) : (
              <HugeiconsIcon icon={Sent02Icon} size={18} strokeWidth={2} />
            )}
          </button>
        </div>
        {sendError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} />
            <span>{sendError}</span>
          </div>
        ) : null}
      </form>

      <ModerationDialog
        flags={moderationFlags}
        onCancel={handleModerationCancel}
        onConfirm={handleModerationConfirm}
        submitting={submitting}
        labels={labels.moderation}
      />
    </div>
  );
}

function MessageBubble({
  msg,
  viewerRole,
  youLabel,
  seenLabel,
  otherLastRead,
}: {
  msg: MessageRow;
  viewerRole: "customer" | "teacher";
  youLabel: string;
  seenLabel: string;
  otherLastRead: string | null;
}) {
  const mine = msg.sender_role === viewerRole;
  const isSystem = msg.sender_role === "system";
  const seenByOther =
    mine && otherLastRead !== null && otherLastRead >= msg.created_at;

  if (isSystem) {
    return (
      <li className="flex justify-center">
        <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {msg.body}
        </span>
      </li>
    );
  }

  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-card",
          mine
            ? "bg-primary/10 text-foreground"
            : "bg-muted/40 text-foreground",
        )}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed">{msg.body}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground",
            mine ? "justify-end" : "justify-start",
          )}
        >
          {mine ? <span>{youLabel}</span> : null}
          <time dateTime={msg.created_at}>{formatTime(msg.created_at)}</time>
          {seenByOther ? (
            <span className="inline-flex items-center gap-0.5 text-success">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={10}
                strokeWidth={2}
              />
              {seenLabel}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ModerationDialog({
  flags,
  onCancel,
  onConfirm,
  submitting,
  labels,
}: {
  flags: ModerationFlag[] | null;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
  labels: Labels["moderation"];
}) {
  const open = flags !== null;
  const FLAG_LABEL: Record<ModerationFlag, string> = useMemo(
    () => ({
      phone: labels.flagPhone,
      iban: labels.flagIban,
      email: labels.flagEmail,
    }),
    [labels.flagPhone, labels.flagIban, labels.flagEmail],
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (!next) onCancel();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => {
          if (submitting) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (submitting) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {flags && flags.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {flags.map((f) => (
              <li key={f} className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-action"
                />
                {FLAG_LABEL[f]}
              </li>
            ))}
          </ul>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-3">
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              {labels.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="min-w-[8rem] bg-action text-action-foreground shadow-action hover:bg-action-hover"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={Loading02Icon}
                  size={14}
                  strokeWidth={2.5}
                  className="animate-spin"
                />
                {labels.confirming}
              </span>
            ) : (
              labels.confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
