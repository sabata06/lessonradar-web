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
import { declineLead } from "@/lib/teacher-leads/decline-client";
import type { DeclineErrorCode } from "@/lib/teacher-leads/types";

interface Props {
  recipientUuid: string;
  /**
   * Layout variant — `row` is compact for the inbox row's action area,
   * `detail` is full-width for the detail page below the summary.
   */
  variant?: "row" | "detail";
  /** Pre-translated copy block — component is client; avoid next-intl here. */
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
    error: Record<DeclineErrorCode, string>;
  };
}

const REASON_MAX = 280;

/**
 * Decline a lead recipient. Mirrors `CancelLeadButton` (Radix Dialog + reason
 * textarea + char counter + router.refresh on success). Decline is permanent
 * on the backend side, so the dialog copy is explicit ("geri alınamaz"). The
 * underlying Dialog primitive doesn't have alertdialog ARIA semantics but we
 * upgrade the wrapper with role="alertdialog" + aria-modal for screen readers.
 */
export function DeclineLeadButton({
  recipientUuid,
  variant = "row",
  labels,
}: Props) {
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
    const res = await declineLead(recipientUuid, {
      reason: trimmed || undefined,
    });
    if (res.ok) {
      setOpen(false);
      resetState();
      startTransition(() => {
        router.refresh();
      });
      return;
    }
    setError(labels.error[res.error] ?? labels.error.network_error);
  }

  const triggerClassName =
    variant === "row"
      ? "border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
      : "w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
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
        role="alertdialog"
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
          <Label
            htmlFor="decline-reason"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {labels.reason_label}
          </Label>
          <Textarea
            id="decline-reason"
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
