"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Loading02Icon,
  Sent02Icon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { respondToLead } from "@/lib/teacher-leads/respond-client";
import type { RespondErrorCode } from "@/lib/teacher-leads/types";

const BODY_MAX = 4000;

export interface TeacherLeadRespondLabels {
  title: string;
  subtitle: string;
  openCta: string;
  sheetTitle: string;
  label: string;
  placeholder: string;
  hint: string;
  charCount: string;
  submit: string;
  submitting: string;
  errors: Record<RespondErrorCode, string>;
}

interface Props {
  recipientUuid: string;
  labels: TeacherLeadRespondLabels;
}

/**
 * Teacher respond panel — adaptive composer.
 *
 * Mobile (<lg): renders the form inline on the detail page so the textarea
 * grows naturally without competing with the keyboard. No modal — Mehmet's
 * Quality Mandate on chat composers: keyboard-friendly inline is the right
 * primitive at 375px.
 *
 * Desktop (lg+): renders an "Yanıt yaz" CTA that opens a Radix Sheet sliding
 * from the right. The lead summary stays visible on the left for reference
 * while composing — the WhatsApp/Linear "compose next to context" pattern.
 *
 * After submit succeeds, `router.refresh()` re-runs the server page which
 * branches to render ThreadView in place of the respond panel. No nav.
 *
 * Two form instances are rendered (inline lg:hidden + Sheet hidden lg:block).
 * Each instance keeps its own local state — users never see both
 * simultaneously due to the responsive visibility split, so divergent state
 * is impossible from the user's perspective.
 */
export function TeacherLeadRespond({ recipientUuid, labels }: Props) {
  return (
    <>
      {/* Mobile inline composer */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5 lg:hidden"
        aria-labelledby="teacher-respond-inline-title"
      >
        <header className="space-y-1">
          <h2
            id="teacher-respond-inline-title"
            className="text-base font-semibold text-foreground"
          >
            {labels.title}
          </h2>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </header>
        <div className="mt-4">
          <RespondForm recipientUuid={recipientUuid} labels={labels} />
        </div>
      </section>

      {/* Desktop Sheet — trigger + slide-from-right content */}
      <section
        className="hidden rounded-2xl border border-border bg-card p-5 shadow-card lg:block"
        aria-labelledby="teacher-respond-cta-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2
              id="teacher-respond-cta-title"
              className="text-base font-semibold text-foreground"
            >
              {labels.title}
            </h2>
            <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
          </div>
          <DesktopSheetTrigger
            recipientUuid={recipientUuid}
            labels={labels}
          />
        </div>
      </section>
    </>
  );
}

function DesktopSheetTrigger({
  recipientUuid,
  labels,
}: {
  recipientUuid: string;
  labels: TeacherLeadRespondLabels;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className={cn(
            "bg-action text-action-foreground shadow-action hover:bg-action/90",
          )}
        >
          <HugeiconsIcon icon={Sent02Icon} size={14} strokeWidth={2} />
          {labels.openCta}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 p-6 sm:max-w-md"
      >
        <SheetHeader className="p-0">
          <SheetTitle>{labels.sheetTitle}</SheetTitle>
          <SheetDescription>{labels.subtitle}</SheetDescription>
        </SheetHeader>
        <RespondForm
          recipientUuid={recipientUuid}
          labels={labels}
          onSuccess={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function RespondForm({
  recipientUuid,
  labels,
  onSuccess,
}: {
  recipientUuid: string;
  labels: TeacherLeadRespondLabels;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await respondToLead(recipientUuid, { message: body });
      if (res.ok) {
        setBody("");
        onSuccess?.();
        startTransition(() => {
          router.refresh();
        });
        return;
      }
      setError(labels.errors[res.error] ?? labels.errors.network_error);
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || body.trim().length === 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="space-y-2">
        <Label
          htmlFor={`respond-body-${recipientUuid}`}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {labels.label}
        </Label>
        <Textarea
          id={`respond-body-${recipientUuid}`}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
          placeholder={labels.placeholder}
          rows={5}
          maxLength={BODY_MAX}
          disabled={submitting}
          className="min-h-[120px] resize-none rounded-xl"
        />
        <p className="text-[11px] text-muted-foreground">{labels.hint}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="text-[11px] text-muted-foreground"
          aria-live="polite"
        >
          {labels.charCount
            .replace("{used}", String(body.length))
            .replace("{max}", String(BODY_MAX))}
        </span>
        <Button
          type="submit"
          disabled={disabled}
          className={cn(
            "min-w-[10rem]",
            disabled
              ? "bg-muted text-muted-foreground"
              : "bg-action text-action-foreground shadow-action hover:bg-action/90",
          )}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <HugeiconsIcon
                icon={Loading02Icon}
                size={14}
                strokeWidth={2.5}
                className="animate-spin"
              />
              {labels.submitting}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <HugeiconsIcon icon={Sent02Icon} size={14} strokeWidth={2} />
              {labels.submit}
            </span>
          )}
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <span>{error}</span>
        </div>
      ) : null}
    </form>
  );
}
