"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Delete02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { deleteAccountRequest } from "@/lib/account/client";
import { deleteAccountFormSchema } from "@/lib/account/schemas";
import type { DeleteAccountErrorCode } from "@/lib/account/types";

type DeleteFormInput = z.input<typeof deleteAccountFormSchema>;
type DeleteFormOutput = z.output<typeof deleteAccountFormSchema>;

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; code: DeleteAccountErrorCode };

/**
 * Destructive flow. Two-gate confirmation:
 *   1. User types the literal Turkish word "SİL" — protects against
 *      accidental tap-through.
 *   2. The button itself is destructive-tinted and reads "Hesabımı Sil".
 *
 * On success the BFF route clears the encrypted session cookie, so we just
 * `router.replace("/")` to land the user on the marketing home as a signed
 * out visitor. Backend keeps a 30-day cooling-off window during which the
 * deletion can be revoked from the admin panel.
 */
export function DeleteAccountDialog() {
  const t = useTranslations("panel.settings.account.delete");
  const tErrors = useTranslations("account.errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteFormInput, unknown, DeleteFormOutput>({
    resolver: zodResolver(deleteAccountFormSchema),
    defaultValues: { confirmation: "", reason: "" } as DeleteFormInput,
  });

  function fieldError(message: unknown): string | undefined {
    if (typeof message !== "string") return undefined;
    return tErrors.has(message) ? tErrors(message) : tErrors("field_invalid");
  }

  async function onSubmit(values: DeleteFormOutput) {
    setSubmitState({ kind: "submitting" });
    const result = await deleteAccountRequest({ reason: values.reason });
    if (!result.ok) {
      setSubmitState({ kind: "error", code: result.code });
      return;
    }
    // Cookie is cleared server-side; drop the user back to the public home so
    // they immediately see the unauthenticated UI tree.
    setOpen(false);
    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    if (submitState.kind === "submitting") return;
    setOpen(next);
    if (!next) {
      reset({ confirmation: "", reason: "" } as DeleteFormInput);
      setSubmitState({ kind: "idle" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/40 bg-card px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />
          {t("trigger")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} />
            </span>
            <span>{t("dialog_title")}</span>
          </DialogTitle>
          <DialogDescription>{t("dialog_body")}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <aside
            role="note"
            className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground"
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={16}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-primary"
            />
            <span>{t("cooling_off_notice")}</span>
          </aside>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t("fields.confirmation.label")}
            </span>
            <Input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="SİL"
              {...register("confirmation")}
            />
            <span className="block text-xs text-muted-foreground">
              {t("fields.confirmation.hint")}
            </span>
            {errors.confirmation ? (
              <span
                role="alert"
                className="block text-xs font-medium text-destructive"
              >
                {fieldError(errors.confirmation.message)}
              </span>
            ) : null}
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t("fields.reason.label")}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({t("fields.reason.optional")})
              </span>
            </span>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder={t("fields.reason.placeholder")}
              {...register("reason")}
            />
            {errors.reason ? (
              <span
                role="alert"
                className="block text-xs font-medium text-destructive"
              >
                {fieldError(errors.reason.message)}
              </span>
            ) : null}
          </label>

          {submitState.kind === "error" ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <HugeiconsIcon
                icon={Alert02Icon}
                size={16}
                strokeWidth={2}
                className="mt-0.5 shrink-0"
              />
              <span>
                {tErrors.has(submitState.code)
                  ? tErrors(submitState.code)
                  : tErrors("unknown")}
              </span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitState.kind === "submitting"}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitState.kind === "submitting"}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {submitState.kind === "submitting"
                ? t("actions.submitting")
                : t("actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
