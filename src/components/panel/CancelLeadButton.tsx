"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  BookmarkBlockIcon,
  Loading02Icon,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { cancelLeadRequest } from "@/lib/lead/cancel-client";
import type { CancelLeadErrorCode } from "@/lib/lead/customer-lead-detail";

interface Props {
  leadUuid: string;
  /** Pre-translated copy block — component is client and avoids next-intl. */
  labels: {
    trigger: string;
    title: string;
    description: string;
    reason_label: string;
    reason_placeholder: string;
    reason_hint: string;
    cancel: string;
    confirm: string;
    confirming: string;
    error: {
      unauthorized: string;
      forbidden: string;
      not_found: string;
      not_cancellable: string;
      validation_failed: string;
      network_error: string;
      upstream_error: string;
      unknown: string;
    };
  };
}

const REASON_MAX = 280;

/**
 * Trigger + Radix Dialog + reason textarea + submit. On success we call
 * `router.refresh()` so the server page re-fetches the lead detail (the
 * backend already returns the updated payload, but refreshing keeps the page
 * and the panel list consistent without us threading state through props).
 */
export function CancelLeadButton({ leadUuid, labels }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setReason("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const trimmed = reason.trim();
    const res = await cancelLeadRequest(leadUuid, {
      reason: trimmed || undefined,
    });
    if (res.ok) {
      // Close dialog + reset before triggering refresh so the success state
      // doesn't briefly flash an old form.
      setOpen(false);
      resetState();
      startTransition(() => {
        router.refresh();
      });
      return;
    }
    setError(errorMessage(res.error, labels));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <HugeiconsIcon
            icon={BookmarkBlockIcon}
            size={16}
            strokeWidth={2}
            className="mr-2"
          />
          {labels.trigger}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {labels.reason_label}
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) =>
              setReason(e.target.value.slice(0, REASON_MAX))
            }
            placeholder={labels.reason_placeholder}
            rows={3}
            maxLength={REASON_MAX}
            disabled={isPending}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{labels.reason_hint}</span>
            <span aria-live="polite">
              {reason.length}/{REASON_MAX}
            </span>
          </div>
        </div>

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
            <Button variant="ghost" disabled={isPending}>
              {labels.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              "min-w-[8rem]",
            )}
          >
            {isPending ? (
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
  code: CancelLeadErrorCode,
  labels: Props["labels"],
): string {
  switch (code) {
    case "unauthorized":
      return labels.error.unauthorized;
    case "forbidden":
      return labels.error.forbidden;
    case "not_found":
      return labels.error.not_found;
    case "not_cancellable":
      return labels.error.not_cancellable;
    case "validation_failed":
      return labels.error.validation_failed;
    case "network_error":
      return labels.error.network_error;
    case "upstream_error":
      return labels.error.upstream_error;
    default:
      return labels.error.unknown;
  }
}
