"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  leadRequestSchema,
  STUDENT_LEVELS,
  MODALITIES,
  type LeadRequestInput,
  type LeadRequestPayload,
  type LeadSubmitErrorCode,
} from "@/lib/lead/schema";
import { submitLeadRequest } from "@/lib/lead/submit";
import { storeLeadSubmission } from "@/lib/lead/handoff";
import type {
  City,
  District,
  MarketplaceDiscipline,
  MarketplaceDomain,
  SupportedLocale,
} from "@/lib/types";
import { pickLocalized } from "@/lib/types";

interface LeadFormProps {
  locale: SupportedLocale;
  domains: MarketplaceDomain[];
  disciplines: MarketplaceDiscipline[];
  cities: City[];
  districts: District[];
  defaults: {
    disciplineSlug?: string;
    citySlug?: string;
    districtSlug?: string;
    teacherSlug?: string;
  };
  /**
   * When the lead is initiated from a teacher profile we display a small
   * banner reassuring the user that this request is scoped to that tutor.
   * The slug itself rides along as a hidden field via `defaults.teacherSlug`.
   */
  targetTeacherName?: string;
}

const LEVEL_LABELS_TR: Record<(typeof STUDENT_LEVELS)[number], string> = {
  primary: "İlkokul",
  middle: "Ortaokul",
  lgs: "LGS hazırlık",
  high: "Lise",
  yks: "YKS hazırlık",
  university: "Üniversite",
  kpss: "KPSS hazırlık",
  adult: "Yetişkin / hobi",
  other: "Diğer",
};

const LEVEL_LABELS_EN: Record<(typeof STUDENT_LEVELS)[number], string> = {
  primary: "Primary school",
  middle: "Middle school",
  lgs: "LGS prep",
  high: "High school",
  yks: "YKS prep",
  university: "University",
  kpss: "KPSS prep",
  adult: "Adult / hobby",
  other: "Other",
};

const MODALITY_LABELS_TR: Record<(typeof MODALITIES)[number], string> = {
  in_person: "Yüz yüze",
  online: "Çevrimiçi",
  either: "Fark etmez",
};

const MODALITY_LABELS_EN: Record<(typeof MODALITIES)[number], string> = {
  in_person: "In person",
  online: "Online",
  either: "Either",
};

export function LeadForm({
  locale,
  domains,
  disciplines,
  cities,
  districts,
  defaults,
  targetTeacherName,
}: LeadFormProps) {
  const t = useTranslations("lead");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadRequestInput>({
    resolver: zodResolver(leadRequestSchema),
    mode: "onBlur",
    defaultValues: {
      disciplineSlug: defaults.disciplineSlug ?? "",
      level: undefined,
      citySlug: defaults.citySlug ?? "",
      districtSlug: defaults.districtSlug ?? undefined,
      teacherSlug: defaults.teacherSlug ?? undefined,
      modality: "either",
      budgetMin: undefined,
      budgetMax: undefined,
      preferredSchedule: "",
      notes: "",
      contactPhone: "",
      consentKvkk: false as unknown as true,
    },
  });

  const watchedCity = watch("citySlug");
  const districtsForCity = districts.filter((d) => d.citySlug === watchedCity);

  const groupedDisciplines = domains
    .map((domain) => ({
      domain,
      items: disciplines.filter((d) => d.domainSlug === domain.slug),
    }))
    .filter((g) => g.items.length > 0);

  const priorityCities = cities.filter((c) => c.isPriority);
  const otherCities = cities.filter((c) => !c.isPriority);

  const errorMessageFor = (code: LeadSubmitErrorCode): string => {
    switch (code) {
      case "unauthorized":
        return t("errors.unauthorized");
      case "email_unverified":
        return t("errors.email_unverified");
      case "forbidden":
        return t("errors.forbidden");
      case "phone_velocity":
        return t("errors.phone_velocity");
      case "phone_invalid":
        return t("errors.phone_invalid");
      case "kvkk_required":
        return t("errors.kvkk_required");
      case "invalid_slug":
        return t("errors.invalid_slug");
      case "invalid_target_teacher":
        return t("errors.invalid_target_teacher");
      case "network_error":
        return t("errors.network");
      default:
        return t("error_generic");
    }
  };

  const onSubmit = handleSubmit(async (raw) => {
    setServerError(null);
    const parsed = leadRequestSchema.safeParse(raw);
    if (!parsed.success) {
      setServerError(t("error_generic"));
      return;
    }
    const payload: LeadRequestPayload = parsed.data;

    const result = await submitLeadRequest(payload);
    if (!result.ok) {
      if (result.error === "unauthorized") {
        const next = `/ders-talebi${
          window.location.search ? window.location.search : ""
        }`;
        router.push(`/giris?next=${encodeURIComponent(next)}`);
        return;
      }
      if (result.error === "email_unverified") {
        const next = `/ders-talebi${
          window.location.search ? window.location.search : ""
        }`;
        router.push(`/eposta-dogrula?next=${encodeURIComponent(next)}`);
        return;
      }
      setServerError(errorMessageFor(result.error));
      return;
    }
    storeLeadSubmission({
      lead: result.lead,
      notifiedCount: result.notifiedCount,
    });
    startTransition(() => {
      router.push(
        `/ders-talebi/tesekkurler?id=${encodeURIComponent(result.lead.uuid)}`,
      );
    });
  });

  const levelLabels = locale === "tr" ? LEVEL_LABELS_TR : LEVEL_LABELS_EN;
  const modalityLabels = locale === "tr" ? MODALITY_LABELS_TR : MODALITY_LABELS_EN;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <input type="hidden" {...register("teacherSlug")} />
      {targetTeacherName && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-4 py-3 text-sm text-foreground"
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-brand"
          />
          <p>
            {locale === "tr"
              ? `Bu talep önce `
              : `This request goes first to `}
            <span className="font-semibold">{targetTeacherName}</span>
            {locale === "tr"
              ? `'e iletilecek. Aynı şehirdeki diğer doğrulanmış öğretmenler de cevap verebilir.`
              : `. Other verified tutors in the same city may also respond.`}
          </p>
        </div>
      )}

      {/* Section 1 — what to learn */}
      <FieldGroup
        title={t("sections.what.title")}
        description={t("sections.what.description")}
      >
        <FieldRow label={t("fields.discipline.label")} error={errors.disciplineSlug?.message}>
          <Controller
            control={control}
            name="disciplineSlug"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="h-12 w-full rounded-xl">
                  <SelectValue placeholder={t("fields.discipline.placeholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-[60vh]">
                  {groupedDisciplines.map(({ domain, items }) => (
                    <SelectGroup key={domain.slug}>
                      <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {pickLocalized(domain.name, locale)}
                      </SelectLabel>
                      {items.map((d) => (
                        <SelectItem key={d.slug} value={d.slug}>
                          {pickLocalized(d.name, locale)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>

        <FieldRow label={t("fields.level.label")} error={errors.level?.message}>
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger className="h-12 w-full rounded-xl">
                  <SelectValue placeholder={t("fields.level.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_LEVELS.map((lv) => (
                    <SelectItem key={lv} value={lv}>
                      {levelLabels[lv]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>

        <FieldRow label={t("fields.modality.label")} error={errors.modality?.message}>
          <Controller
            control={control}
            name="modality"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label={t("fields.modality.label")}
                className="grid grid-cols-3 gap-2"
              >
                {MODALITIES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={field.value === m}
                    onClick={() => field.onChange(m)}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      field.value === m
                        ? "border-brand bg-brand-soft text-brand-soft-foreground shadow-card"
                        : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
                    )}
                  >
                    {modalityLabels[m]}
                  </button>
                ))}
              </div>
            )}
          />
        </FieldRow>
      </FieldGroup>

      {/* Section 2 — where */}
      <FieldGroup
        title={t("sections.where.title")}
        description={t("sections.where.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label={t("fields.city.label")} error={errors.citySlug?.message}>
            <Controller
              control={control}
              name="citySlug"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="h-12 w-full rounded-xl">
                    <SelectValue placeholder={t("fields.city.placeholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[60vh]">
                    {priorityCities.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {locale === "tr" ? "Öncelikli şehirler" : "Priority cities"}
                        </SelectLabel>
                        {priorityCities.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {locale === "tr" ? c.nameTr : c.nameEn}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    <SelectGroup>
                      <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {locale === "tr" ? "Tüm şehirler" : "All cities"}
                      </SelectLabel>
                      {otherCities.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {locale === "tr" ? c.nameTr : c.nameEn}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldRow>

          <FieldRow
            label={t("fields.district.label")}
            optional
            error={errors.districtSlug?.message}
          >
            <Controller
              control={control}
              name="districtSlug"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                  disabled={districtsForCity.length === 0}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl">
                    <SelectValue
                      placeholder={
                        districtsForCity.length === 0
                          ? t("fields.district.disabled_placeholder")
                          : t("fields.district.placeholder")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {districtsForCity.map((d) => (
                      <SelectItem key={d.slug} value={d.slug}>
                        {locale === "tr" ? d.nameTr : d.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldRow>
        </div>
      </FieldGroup>

      {/* Section 3 — optional details */}
      <FieldGroup
        title={t("sections.details.title")}
        description={t("sections.details.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label={t("fields.budget_min.label")} optional>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              step={50}
              placeholder={t("fields.budget_min.placeholder")}
              className="h-12 rounded-xl"
              {...register("budgetMin", { valueAsNumber: true })}
            />
          </FieldRow>
          <FieldRow
            label={t("fields.budget_max.label")}
            optional
            error={
              errors.budgetMax?.message === "budget_range_invalid"
                ? t("errors.budget_range_invalid")
                : errors.budgetMax?.message
            }
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              step={50}
              placeholder={t("fields.budget_max.placeholder")}
              className="h-12 rounded-xl"
              {...register("budgetMax", { valueAsNumber: true })}
            />
          </FieldRow>
        </div>

        <FieldRow label={t("fields.schedule.label")} optional>
          <Input
            placeholder={t("fields.schedule.placeholder")}
            className="h-12 rounded-xl"
            maxLength={200}
            {...register("preferredSchedule")}
          />
        </FieldRow>

        <FieldRow label={t("fields.notes.label")} optional>
          <Textarea
            placeholder={t("fields.notes.placeholder")}
            rows={3}
            maxLength={1000}
            className="rounded-xl"
            {...register("notes")}
          />
        </FieldRow>
      </FieldGroup>

      {/* Section 4 — contact */}
      <FieldGroup
        title={t("sections.contact.title")}
        description={t("sections.contact.description")}
      >
        <FieldRow
          label={t("fields.phone.label")}
          error={
            errors.contactPhone?.message === "phone_invalid"
              ? t("errors.phone_invalid")
              : errors.contactPhone?.message
          }
          hint={t("fields.phone.hint")}
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("fields.phone.placeholder")}
            className="h-12 rounded-xl"
            {...register("contactPhone")}
          />
        </FieldRow>

        <FieldRow
          error={
            errors.consentKvkk?.message === "kvkk_required"
              ? t("errors.kvkk_required")
              : errors.consentKvkk?.message
          }
        >
          <Controller
            control={control}
            name="consentKvkk"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40">
                <input
                  type="checkbox"
                  checked={field.value === true}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-brand"
                />
                <span className="text-sm leading-relaxed text-foreground">
                  {t.rich("kvkk.label", {
                    privacy: (chunks) => (
                      <a
                        href="/yasal/kvkk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand underline-offset-2 hover:underline"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </span>
              </label>
            )}
          />
        </FieldRow>
      </FieldGroup>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      <div className="sticky bottom-4 z-10">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || isPending}
          aria-busy={isSubmitting || isPending}
          className="h-12 w-full gap-2 bg-action text-action-foreground shadow-action hover:bg-action-hover"
        >
          {isSubmitting || isPending ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-action-foreground/30 border-t-action-foreground" />
              {t("submit_loading")}
            </>
          ) : (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
              {t("submit")}
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t("submit_footnote")}</p>
      </div>
    </form>
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
      <legend className="px-2 text-sm font-semibold text-foreground">{title}</legend>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

function FieldRow({
  label,
  optional,
  error,
  hint,
  children,
}: {
  label?: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Without a visible label (e.g. consent checkbox row) the children carry
  // their own label semantics, so we render a div wrapper.
  if (!label) {
    return (
      <div className="space-y-1.5">
        {children}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && (
          <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
            <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Implicit label association: wrapping the input(s) inside <label> creates
  // the input/label binding without the verbosity of htmlFor/id pairs at
  // every call site. Works for inputs, textareas and radix Select triggers.
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {label}
        {optional && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            opsiyonel
          </span>
        )}
      </span>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
          <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
          {error}
        </p>
      )}
    </label>
  );
}
