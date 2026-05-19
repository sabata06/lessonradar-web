"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordRequest } from "@/lib/account/client";
import { buildPasswordFormSchema } from "@/lib/account/schemas";
import type { ChangePasswordErrorCode } from "@/lib/account/types";

interface Props {
  hasUsablePassword: boolean;
}

type PasswordSchema = ReturnType<typeof buildPasswordFormSchema>;
type FormInput = z.input<PasswordSchema>;
type FormOutput = z.output<PasswordSchema>;

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; code: ChangePasswordErrorCode };

export function ChangePasswordForm({ hasUsablePassword }: Props) {
  const t = useTranslations("panel.settings.password");
  const tErrors = useTranslations("account.errors");
  const schema = buildPasswordFormSchema(hasUsablePassword);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    } as FormInput,
  });

  function fieldError(message: unknown): string | undefined {
    if (typeof message !== "string") return undefined;
    return tErrors.has(message) ? tErrors(message) : tErrors("field_invalid");
  }

  async function onSubmit(values: FormOutput) {
    setSubmitState({ kind: "submitting" });
    const result = await changePasswordRequest({
      current_password: hasUsablePassword
        ? (values.currentPassword as string)
        : undefined,
      new_password: values.newPassword,
      new_password_confirm: values.newPasswordConfirm,
    });
    if (result.ok) {
      setSubmitState({ kind: "success" });
      reset({
        currentPassword: "",
        newPassword: "",
        newPasswordConfirm: "",
      } as FormInput);
      return;
    }
    setSubmitState({ kind: "error", code: result.code });
  }

  return (
    <form
      className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      autoComplete="off"
    >
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          {hasUsablePassword ? t("form_title") : t("first_time_title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {hasUsablePassword ? t("form_subtitle") : t("first_time_subtitle")}
        </p>
      </header>

      {hasUsablePassword ? (
        <Field
          label={t("fields.current.label")}
          error={fieldError(errors.currentPassword?.message)}
        >
          <Input
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
          />
        </Field>
      ) : null}

      <Field
        label={t("fields.new.label")}
        hint={t("fields.new.hint")}
        error={fieldError(errors.newPassword?.message)}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
      </Field>

      <Field
        label={t("fields.confirm.label")}
        error={fieldError(errors.newPasswordConfirm?.message)}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...register("newPasswordConfirm")}
        />
      </Field>

      {submitState.kind === "success" ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-3 text-sm text-success"
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <span>{t("status.saved")}</span>
        </div>
      ) : null}

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

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitState.kind === "submitting"}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {submitState.kind === "submitting"
            ? t("actions.saving")
            : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </label>
  );
}
