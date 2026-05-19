"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandCombobox } from "@/components/ui/brand-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateCustomerProfileRequest,
  updateProfileRequest,
} from "@/lib/account/client";
import {
  GRADE_I18N_KEYS,
  GRADE_VALUES,
  customerProfileFormSchema,
  type GradeValue,
  profileFormSchema,
} from "@/lib/account/schemas";
import type {
  AccountCustomerProfilePayload,
  AccountProfilePayload,
  CustomerProfileUpdatePayload,
  ProfileUpdatePayload,
} from "@/lib/account/types";
import { cn } from "@/lib/utils";

interface Props {
  profile: AccountProfilePayload;
  customer: AccountCustomerProfilePayload | null;
}

// The combined schema is the source of truth for both the form input shape
// (what we feed `defaultValues`) and the post-parse output (what
// `handleSubmit` hands us). Splitting `input` / `output` lets RHF accept
// `defaultValues: ""` for `.default("")` fields without complaining.
type FormInput = z.input<typeof customerProfileFormSchema> &
  z.input<typeof profileFormSchema>;
type FormOutput = z.output<typeof customerProfileFormSchema> &
  z.output<typeof profileFormSchema>;

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; emailChanged: boolean }
  | { kind: "error"; message: string };

const PHONE_CODES = ["+90", "+1", "+44", "+49", "+33", "+39", "+34", "+31"];

export function ProfileForm({ profile, customer }: Props) {
  const t = useTranslations("panel.settings.profile");
  const tErrors = useTranslations("account.errors");
  const tGrade = useTranslations("account.grade");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const pendingValuesRef = useRef<FormOutput | null>(null);

  const isGoogleAccount = profile.auth_provider === "google";

  const initialValues: FormInput = useMemo(
    () => ({
      email: profile.email,
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      phoneCode: customer?.phone_code || "+90",
      phoneNumber: customer?.phone_number ?? "",
      birthDate: customer?.birth_date ?? "",
      address: customer?.address ?? "",
      schoolName: customer?.school_name ?? "",
      grade: customer?.grade ?? "",
      subjects: customer?.subjects ?? "",
      parentName: customer?.parent_name ?? "",
      parentPhoneCode: customer?.parent_phone_code || "+90",
      parentPhone: customer?.parent_phone ?? "",
      parentEmail: customer?.parent_email ?? "",
    }),
    [profile, customer],
  );

  const combinedSchema = useMemo(
    () => profileFormSchema.and(customerProfileFormSchema),
    [],
  );

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    getValues,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(combinedSchema),
    defaultValues: initialValues,
  });

  // Re-sync the form when the parent re-renders with fresh data (e.g. after
  // an avatar upload triggered a router.refresh).
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const watchedEmail = watch("email");
  const emailChanged =
    watchedEmail.trim().toLowerCase() !== profile.email.toLowerCase();

  const gradeOptions = useMemo(
    () =>
      [
        { value: "", label: t("fields.grade.placeholder") },
        ...GRADE_VALUES.map((value: GradeValue) => ({
          value,
          label: tGrade(GRADE_I18N_KEYS[value]),
        })),
      ],
    [t, tGrade],
  );
  const phoneCodeOptions = useMemo(
    () => PHONE_CODES.map((code) => ({ value: code, label: code })),
    [],
  );

  function fieldError(message: unknown): string | undefined {
    if (typeof message !== "string") return undefined;
    return tErrors.has(message) ? tErrors(message) : tErrors("field_invalid");
  }

  function diffProfile(values: FormOutput): ProfileUpdatePayload | null {
    const payload: ProfileUpdatePayload = {};
    if (values.firstName.trim() !== (profile.first_name ?? "")) {
      payload.first_name = values.firstName.trim();
    }
    if (values.lastName.trim() !== (profile.last_name ?? "")) {
      payload.last_name = values.lastName.trim();
    }
    if (
      values.email.trim().toLowerCase() !== profile.email.toLowerCase() &&
      !isGoogleAccount
    ) {
      payload.email = values.email.trim().toLowerCase();
    }
    return Object.keys(payload).length > 0 ? payload : null;
  }

  function diffCustomer(
    values: FormOutput,
  ): CustomerProfileUpdatePayload | null {
    if (!customer) return null;
    const payload: CustomerProfileUpdatePayload = {};
    const stringDiffs: Array<[keyof CustomerProfileUpdatePayload, string, string]> = [
      ["phone_code", values.phoneCode, customer.phone_code ?? "+90"],
      ["phone_number", values.phoneNumber, customer.phone_number ?? ""],
      ["address", values.address.trim(), customer.address ?? ""],
      ["school_name", values.schoolName.trim(), customer.school_name ?? ""],
      ["grade", values.grade.trim(), customer.grade ?? ""],
      ["subjects", values.subjects.trim(), customer.subjects ?? ""],
      ["parent_name", values.parentName.trim(), customer.parent_name ?? ""],
      [
        "parent_phone_code",
        values.parentPhoneCode || "+90",
        customer.parent_phone_code ?? "+90",
      ],
      ["parent_phone", values.parentPhone, customer.parent_phone ?? ""],
      [
        "parent_email",
        values.parentEmail.trim().toLowerCase(),
        (customer.parent_email ?? "").toLowerCase(),
      ],
    ];
    for (const [key, next, current] of stringDiffs) {
      if (next !== current) {
        (payload as Record<string, string>)[key] = next;
      }
    }
    const incomingBirth = values.birthDate?.trim() ?? "";
    const currentBirth = customer.birth_date ?? "";
    if (incomingBirth !== currentBirth) {
      payload.birth_date = incomingBirth === "" ? null : incomingBirth;
    }
    return Object.keys(payload).length > 0 ? payload : null;
  }

  async function applyUpdates(values: FormOutput) {
    setSubmitState({ kind: "submitting" });
    const profilePayload = diffProfile(values);
    const customerPayload = diffCustomer(values);

    if (!profilePayload && !customerPayload) {
      setSubmitState({ kind: "idle" });
      return;
    }

    let emailDidChange = false;

    if (profilePayload) {
      const result = await updateProfileRequest(profilePayload);
      if (!result.ok) {
        const code = result.code;
        setSubmitState({
          kind: "error",
          message: tErrors.has(code) ? tErrors(code) : tErrors("unknown"),
        });
        return;
      }
      emailDidChange = result.emailChanged;
    }

    if (customerPayload) {
      const result = await updateCustomerProfileRequest(customerPayload);
      if (!result.ok) {
        const code = result.code;
        setSubmitState({
          kind: "error",
          message: tErrors.has(code) ? tErrors(code) : tErrors("unknown"),
        });
        return;
      }
    }

    setSubmitState({ kind: "success", emailChanged: emailDidChange });
    reset(getValues());
    startTransition(() => router.refresh());
  }

  async function onValidSubmit(values: FormOutput) {
    if (emailChanged && !isGoogleAccount) {
      pendingValuesRef.current = values;
      setPendingEmail(values.email);
      setEmailDialogOpen(true);
      return;
    }
    await applyUpdates(values);
  }

  async function confirmEmailChange() {
    setEmailDialogOpen(false);
    const pending = pendingValuesRef.current;
    pendingValuesRef.current = null;
    if (pending) {
      await applyUpdates(pending);
    }
  }

  return (
    <>
      <form
        className="space-y-5"
        onSubmit={handleSubmit(onValidSubmit)}
        noValidate
      >
        {/* Identity */}
        <FieldGroup
          title={t("sections.identity.title")}
          description={t("sections.identity.description")}
        >
          <Field label={t("fields.email.label")} error={fieldError(errors.email?.message)}>
            <Input
              type="email"
              autoComplete="email"
              disabled={isGoogleAccount}
              {...register("email")}
            />
            {isGoogleAccount ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={12}
                  strokeWidth={2}
                />
                {t("fields.email.google_locked")}
              </p>
            ) : emailChanged ? (
              <p className="mt-1 flex items-start gap-1 text-xs text-action-foreground">
                <HugeiconsIcon
                  icon={Alert02Icon}
                  size={12}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0"
                />
                <span>{t("fields.email.change_warning")}</span>
              </p>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("fields.first_name.label")}
              error={fieldError(errors.firstName?.message)}
            >
              <Input autoComplete="given-name" {...register("firstName")} />
            </Field>
            <Field
              label={t("fields.last_name.label")}
              error={fieldError(errors.lastName?.message)}
            >
              <Input autoComplete="family-name" {...register("lastName")} />
            </Field>
          </div>
        </FieldGroup>

        {/* Phone */}
        <FieldGroup
          title={t("sections.phone.title")}
          description={t("sections.phone.description")}
        >
          <Field
            label={t("fields.phone.label")}
            error={
              fieldError(errors.phoneNumber?.message) ??
              fieldError(errors.phoneCode?.message)
            }
          >
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
              <Controller
                control={control}
                name="phoneCode"
                render={({ field }) => (
                  <BrandCombobox
                    value={field.value ?? "+90"}
                    onChange={(next) => field.onChange(next || "+90")}
                    options={phoneCodeOptions}
                    placeholder="+90"
                    ariaLabel={t("fields.phone.code_aria")}
                    triggerClassName="h-11 rounded-xl"
                  />
                )}
              />
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={t("fields.phone.placeholder")}
                {...register("phoneNumber")}
              />
            </div>
          </Field>
        </FieldGroup>

        {/* Education */}
        <FieldGroup
          title={t("sections.education.title")}
          description={t("sections.education.description")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("fields.school.label")}
              optional
              error={fieldError(errors.schoolName?.message)}
            >
              <Input autoComplete="organization" {...register("schoolName")} />
            </Field>
            <Field
              label={t("fields.grade.label")}
              optional
              error={fieldError(errors.grade?.message)}
            >
              <Controller
                control={control}
                name="grade"
                render={({ field }) => (
                  <BrandCombobox
                    value={field.value ?? ""}
                    onChange={(next) => field.onChange(next)}
                    options={gradeOptions}
                    placeholder={t("fields.grade.placeholder")}
                    ariaLabel={t("fields.grade.label")}
                    triggerClassName="h-11 rounded-xl"
                  />
                )}
              />
            </Field>
          </div>
          <Field
            label={t("fields.subjects.label")}
            optional
            hint={t("fields.subjects.hint")}
            error={fieldError(errors.subjects?.message)}
          >
            <Input {...register("subjects")} />
          </Field>
          <Field
            label={t("fields.address.label")}
            optional
            error={fieldError(errors.address?.message)}
          >
            <Textarea
              rows={3}
              maxLength={500}
              autoComplete="street-address"
              {...register("address")}
            />
          </Field>
        </FieldGroup>

        {/* Parent */}
        <FieldGroup
          title={t("sections.parent.title")}
          description={t("sections.parent.description")}
        >
          <Field
            label={t("fields.parent_name.label")}
            optional
            error={fieldError(errors.parentName?.message)}
          >
            <Input {...register("parentName")} />
          </Field>
          <Field
            label={t("fields.parent_phone.label")}
            optional
            error={
              fieldError(errors.parentPhone?.message) ??
              fieldError(errors.parentPhoneCode?.message)
            }
          >
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
              <Controller
                control={control}
                name="parentPhoneCode"
                render={({ field }) => (
                  <BrandCombobox
                    value={field.value ?? "+90"}
                    onChange={(next) => field.onChange(next || "+90")}
                    options={phoneCodeOptions}
                    placeholder="+90"
                    ariaLabel={t("fields.parent_phone.code_aria")}
                    triggerClassName="h-11 rounded-xl"
                  />
                )}
              />
              <Input
                type="tel"
                inputMode="numeric"
                placeholder={t("fields.parent_phone.placeholder")}
                {...register("parentPhone")}
              />
            </div>
          </Field>
          <Field
            label={t("fields.parent_email.label")}
            optional
            error={fieldError(errors.parentEmail?.message)}
          >
            <Input type="email" {...register("parentEmail")} />
          </Field>
        </FieldGroup>

        <FormStatus state={submitState} t={t} />

        <div className="flex flex-wrap items-center justify-end gap-3">
          {isDirty ? (
            <button
              type="button"
              onClick={() => {
                reset(initialValues);
                setSubmitState({ kind: "idle" });
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("actions.cancel")}
            </button>
          ) : null}
          <Button
            type="submit"
            disabled={submitState.kind === "submitting" || !isDirty}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitState.kind === "submitting"
              ? t("actions.saving")
              : t("actions.save")}
          </Button>
        </div>
      </form>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("email_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("email_dialog.body", { email: pendingEmail ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              {t("email_dialog.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={confirmEmailChange}
            >
              {t("email_dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <legend className="px-2 text-sm font-semibold text-foreground">
        {title}
      </legend>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {label}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">
            ({/* (opsiyonel) */ "opsiyonel"})
          </span>
        ) : null}
      </span>
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

function FormStatus({
  state,
  t,
}: {
  state: SubmitState;
  t: ReturnType<typeof useTranslations>;
}) {
  if (state.kind === "success") {
    return (
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3 text-sm",
          "border-success/30 bg-success/5 text-success",
        )}
      >
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={16}
          strokeWidth={2}
          className="mt-0.5 shrink-0"
        />
        <span>
          {state.emailChanged
            ? t("status.saved_email_changed")
            : t("status.saved")}
        </span>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
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
        <span>{state.message}</span>
      </div>
    );
  }
  return null;
}
