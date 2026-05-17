"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Loading02Icon,
  TelephoneIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { connectLeadOffer } from "@/lib/lead/connect-client";
import type { ConnectLeadErrorCode } from "@/lib/lead/customer-lead-detail";

interface Props {
  leadUuid: string;
  recipientUuid: string;
  /** Pre-translated labels. Component is client; we avoid next-intl here. */
  labels: {
    trigger: string;
    title: string;
    description: string;
    hint: string;
    cancel: string;
    confirm: string;
    confirming: string;
    errors: {
      unauthorized: string;
      forbidden: string;
      not_found: string;
      contact_preference_blocks_reveal: string;
      recipient_not_responded: string;
      teacher_inactive: string;
      lead_cancelled: string;
      validation_failed: string;
      network_error: string;
      upstream_error: string;
    };
  };
}

/**
 * "Bu öğretmenle ilerle" — customer-driven mutual phone reveal. Action color
 * because this IS the conversion CTA: clicking unlocks the channel customer
 * needs to actually book a lesson.
 *
 * On success: `router.refresh()` re-fetches the lead detail server-side so
 * the offer card flips from "ilerle" to the revealed phone/WhatsApp block
 * without any client state plumbing.
 */
export function ConnectButton({
  leadUuid,
  recipientUuid,
  labels,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  function resetState() {
    setError(null);
  }

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    const res = await connectLeadOffer(leadUuid, recipientUuid);
    setSubmitting(false);
    if (res.ok) {
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
      return;
    }
    setError(errorMessage(res.error, labels));
  }

  const busy = submitting || isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) resetState();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg bg-action px-3.5 py-2 text-sm font-semibold text-action-foreground shadow-action transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/60",
          )}
        >
          <HugeiconsIcon icon={TelephoneIcon} size={14} strokeWidth={2.2} />
          {labels.trigger}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.5} />
        </button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {labels.hint}
        </p>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-3">
          <DialogClose asChild>
            <Button variant="ghost" disabled={busy}>
              {labels.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={cn(
              "min-w-[10rem] bg-action text-action-foreground shadow-action hover:bg-action-hover",
            )}
          >
            {busy ? (
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

function errorMessage(
  code: ConnectLeadErrorCode,
  labels: Props["labels"],
): string {
  switch (code) {
    case "unauthorized":
      return labels.errors.unauthorized;
    case "forbidden":
      return labels.errors.forbidden;
    case "not_found":
      return labels.errors.not_found;
    case "contact_preference_blocks_reveal":
      return labels.errors.contact_preference_blocks_reveal;
    case "recipient_not_responded":
      return labels.errors.recipient_not_responded;
    case "teacher_inactive":
      return labels.errors.teacher_inactive;
    case "lead_cancelled":
      return labels.errors.lead_cancelled;
    case "validation_failed":
      return labels.errors.validation_failed;
    case "network_error":
      return labels.errors.network_error;
    case "upstream_error":
      return labels.errors.upstream_error;
    default:
      return labels.errors.upstream_error;
  }
}
