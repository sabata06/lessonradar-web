"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  PhoneOff01Icon,
  TelephoneIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BrandCombobox,
  type ComboboxOption,
} from "@/components/ui/brand-combobox";

import {
  leadRequestSchema,
  STUDENT_LEVELS,
  MODALITIES,
  CONTACT_PREFERENCES,
  type ContactPreference,
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
  /**
   * When a target teacher is set, restrict the discipline picker to the
   * teacher's actual specialties. Empty / undefined → full catalog.
   * Backend would reject `invalid_target_teacher` otherwise — gating in
   * the UI prevents the dead-end submit.
   */
  allowedDisciplineSlugs?: string[];
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
  allowedDisciplineSlugs,
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
    setValue,
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
      customerContactPreference: "any",
      consentKvkk: false as unknown as true,
    },
  });

  const watchedCity = watch("citySlug");

  // Reset district when city changes — otherwise the stale slug would
  // submit and the backend would reject. Skip the very first effect run so
  // the URL-provided default district survives the initial render.
  const cityInitRef = useRef(true);
  useEffect(() => {
    if (cityInitRef.current) {
      cityInitRef.current = false;
      return;
    }
    setValue("districtSlug", undefined, { shouldValidate: false });
  }, [watchedCity, setValue]);

  /**
   * Discipline options for the combobox. When `allowedDisciplineSlugs` is
   * provided (target-teacher case), restrict to that allowlist so the
   * customer can't pick a branch the teacher doesn't teach — backend would
   * reject with `invalid_target_teacher` and UI-level gating avoids the
   * dead-end submit.
   *
   * All option arrays must be memoized: cmdk/Combobox treats option-array
   * identity as a signal, and feeding a new array reference every render
   * combined with field-aware effects can produce render→setValue→render
   * loops that freeze the page.
   */
  const allowSet = useMemo(
    () =>
      allowedDisciplineSlugs && allowedDisciplineSlugs.length > 0
        ? new Set(allowedDisciplineSlugs)
        : null,
    [allowedDisciplineSlugs],
  );

  const disciplineOptions: ComboboxOption[] = useMemo(() => {
    const filtered = allowSet
      ? disciplines.filter((d) => allowSet.has(d.slug))
      : disciplines;
    return domains
      .map((domain) => ({
        domain,
        items: filtered.filter((d) => d.domainSlug === domain.slug),
      }))
      .filter((g) => g.items.length > 0)
      .flatMap(({ domain, items }) =>
        items.map((d) => ({
          value: d.slug,
          label: pickLocalized(d.name, locale),
          group: pickLocalized(domain.name, locale),
        })),
      );
  }, [allowSet, disciplines, domains, locale]);

  // When the teacher has a single specialty, the parent page already pins
  // `defaults.disciplineSlug` to that value — so the form arrives correctly
  // pre-filled. We render the field as disabled + show a hint, no client
  // effect required. (An auto-fill useEffect here triggers a render-loop
  // because react-hook-form's setValue re-renders, which rebuilds the
  // option array, which re-runs the effect — page froze on the
  // `?teacher=...` deep link.)
  const isDisciplineLocked = allowSet !== null && disciplineOptions.length === 1;

  const cityOptions: ComboboxOption[] = useMemo(() => {
    const priorityHeader =
      locale === "tr" ? "Öncelikli şehirler" : "Priority cities";
    const allHeader = locale === "tr" ? "Tüm şehirler" : "All cities";
    const priority = cities.filter((c) => c.isPriority);
    const rest = cities.filter((c) => !c.isPriority);
    return [
      ...priority.map((c) => ({
        value: c.slug,
        label: locale === "tr" ? c.nameTr : c.nameEn,
        group: priorityHeader,
      })),
      ...rest.map((c) => ({
        value: c.slug,
        label: locale === "tr" ? c.nameTr : c.nameEn,
        group: allHeader,
      })),
    ];
  }, [cities, locale]);

  const districtsForCity = useMemo(
    () => districts.filter((d) => d.citySlug === watchedCity),
    [districts, watchedCity],
  );

  const districtOptions: ComboboxOption[] = useMemo(
    () =>
      districtsForCity.map((d) => ({
        value: d.slug,
        label: locale === "tr" ? d.nameTr : d.nameEn,
      })),
    [districtsForCity, locale],
  );

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
      case "invalid_contact_preference":
        return t("errors.invalid_contact_preference");
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
        <FieldRow
          label={t("fields.discipline.label")}
          error={errors.disciplineSlug?.message}
          hint={
            allowSet
              ? isDisciplineLocked
                ? t("fields.discipline.locked_hint")
                : t("fields.discipline.scoped_hint")
              : undefined
          }
        >
          <Controller
            control={control}
            name="disciplineSlug"
            render={({ field }) => (
              <BrandCombobox
                value={field.value ?? ""}
                onChange={(v) => field.onChange(v)}
                options={disciplineOptions}
                placeholder={t("fields.discipline.placeholder")}
                searchPlaceholder={t("fields.discipline.search_placeholder")}
                emptyText={t("fields.discipline.empty")}
                ariaLabel={t("fields.discipline.label")}
                disabled={isDisciplineLocked}
                triggerClassName="h-12 rounded-xl"
              />
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
                <BrandCombobox
                  value={field.value ?? ""}
                  onChange={(v) => field.onChange(v)}
                  options={cityOptions}
                  placeholder={t("fields.city.placeholder")}
                  searchPlaceholder={t("fields.city.search_placeholder")}
                  emptyText={t("fields.city.empty")}
                  ariaLabel={t("fields.city.label")}
                  triggerClassName="h-12 rounded-xl"
                />
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
                <BrandCombobox
                  value={field.value ?? ""}
                  onChange={(v) => field.onChange(v || undefined)}
                  options={districtOptions}
                  placeholder={
                    districtsForCity.length === 0
                      ? t("fields.district.disabled_placeholder")
                      : t("fields.district.placeholder")
                  }
                  searchPlaceholder={t("fields.district.search_placeholder")}
                  emptyText={t("fields.district.empty")}
                  allLabel={t("fields.district.all_label")}
                  ariaLabel={t("fields.district.label")}
                  disabled={districtsForCity.length === 0}
                  triggerClassName="h-12 rounded-xl"
                />
              )}
            />
          </FieldRow>
        </div>
      </FieldGroup>

      {/* Section 3 — optional details */}
      <FieldGroup
        title={t("sections.details.title")}
        description={
          targetTeacherName
            ? t("sections.details.description_direct")
            : t("sections.details.description")
        }
      >
        {/*
          Budget is collected only for general (non-direct) leads. When the
          customer is requesting from a specific teacher they've already
          seen the teacher's price on the profile, so asking for a budget
          range is awkward and implies bargaining. For direct leads we let
          schedule + notes carry the optional context.
        */}
        {targetTeacherName ? null : (
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
        )}

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

      {/* Section 4 — contact preference + phone + KVKK */}
      <FieldGroup
        title={t("sections.contact.title")}
        description={t("sections.contact.description")}
      >
        <FieldRow
          label={t("fields.contact_preference.label")}
          error={
            errors.customerContactPreference?.message === "contact_preference_required"
              ? t("errors.contact_preference_required")
              : errors.customerContactPreference?.message
          }
          hint={t("fields.contact_preference.hint")}
        >
          <Controller
            control={control}
            name="customerContactPreference"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label={t("fields.contact_preference.label")}
                className="grid gap-2 sm:grid-cols-2"
              >
                {CONTACT_PREFERENCES.map((pref) => (
                  <ContactPreferenceCard
                    key={pref}
                    value={pref}
                    checked={field.value === pref}
                    onSelect={() => field.onChange(pref)}
                    title={t(`fields.contact_preference.options.${pref}.title`)}
                    description={t(
                      `fields.contact_preference.options.${pref}.description`,
                    )}
                  />
                ))}
              </div>
            )}
          />
        </FieldRow>

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

const PREFERENCE_ICONS: Record<ContactPreference, typeof BubbleChatIcon> = {
  in_app: BubbleChatIcon,
  phone_reveal: TelephoneIcon,
  whatsapp_reveal: WhatsappIcon,
  any: PhoneOff01Icon,
};

function ContactPreferenceCard({
  value,
  checked,
  onSelect,
  title,
  description,
}: {
  value: ContactPreference;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  const Icon = PREFERENCE_ICONS[value];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex min-h-[5.5rem] items-start gap-3 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        checked
          ? "border-brand bg-brand-soft/40 shadow-card"
          : "border-border bg-card hover:border-brand/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
          checked
            ? "bg-brand text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={Icon} size={16} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span
          className={cn(
            "block text-sm font-semibold",
            checked ? "text-foreground" : "text-foreground",
          )}
        >
          {title}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
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
