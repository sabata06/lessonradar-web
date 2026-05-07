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
  TEACHING_MODALITIES,
  teacherApplicationSchema,
  type TeacherApplicationInput,
  type TeacherApplicationPayload,
} from "@/lib/teacher-application/schema";
import { submitTeacherApplication } from "@/lib/teacher-application/submit";
import type {
  City,
  District,
  MarketplaceDiscipline,
  MarketplaceDomain,
  SupportedLocale,
} from "@/lib/types";
import { pickLocalized } from "@/lib/types";

interface TeacherApplicationFormProps {
  locale: SupportedLocale;
  domains: MarketplaceDomain[];
  disciplines: MarketplaceDiscipline[];
  cities: City[];
  districts: District[];
}

/** Errors prefixed with our schema codes get translated; bare zod errors fall through. */
function translateError(t: (k: string) => string, message: string | undefined) {
  if (!message) return undefined;
  // Schema codes are snake_case strings — translation file mirrors them.
  if (/^[a-z_]+$/.test(message)) {
    try {
      return t(`errors.${message}`);
    } catch {
      return message;
    }
  }
  return message;
}

export function TeacherApplicationForm({
  locale,
  domains,
  disciplines,
  cities,
  districts,
}: TeacherApplicationFormProps) {
  const t = useTranslations("onboarding.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TeacherApplicationInput>({
    resolver: zodResolver(teacherApplicationSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      headline: "",
      bio: "",
      contactPhone: "",
      contactEmail: "",
      yearsExperience: undefined,
      hourlyMin: undefined,
      hourlyMax: undefined,
      disciplineSlugs: [],
      citySlug: "",
      districtSlug: undefined,
      modalities: [],
      referralSource: "",
      consentKvkk: false as unknown as true,
      consentTeacherTerms: false as unknown as true,
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

  const onSubmit = handleSubmit(async (raw) => {
    setServerError(null);
    const parsed = teacherApplicationSchema.safeParse(raw);
    if (!parsed.success) {
      setServerError(t("error_generic"));
      return;
    }
    const payload: TeacherApplicationPayload = parsed.data;
    const result = await submitTeacherApplication(payload);
    if (!result.ok) {
      setServerError(t("error_generic"));
      return;
    }
    startTransition(() => {
      router.push(
        `/ogretmen-ol/tesekkurler?id=${encodeURIComponent(result.id)}`,
      );
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* ---------------- Section 1 — You ---------------- */}
      <FieldGroup
        title={t("sections.you.title")}
        description={t("sections.you.description")}
      >
        <FieldRow
          label={t("fields.fullName.label")}
          error={translateError(t, errors.fullName?.message)}
        >
          <Input
            placeholder={t("fields.fullName.placeholder")}
            autoComplete="name"
            className="h-12 rounded-xl"
            maxLength={80}
            {...register("fullName")}
          />
        </FieldRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow
            label={t("fields.phone.label")}
            error={translateError(t, errors.contactPhone?.message)}
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
            label={t("fields.email.label")}
            error={translateError(t, errors.contactEmail?.message)}
            hint={t("fields.email.hint")}
          >
            <Input
              type="email"
              autoComplete="email"
              placeholder={t("fields.email.placeholder")}
              className="h-12 rounded-xl"
              {...register("contactEmail")}
            />
          </FieldRow>
        </div>
      </FieldGroup>

      {/* ---------------- Section 2 — Teach ---------------- */}
      <FieldGroup
        title={t("sections.teach.title")}
        description={t("sections.teach.description")}
      >
        <FieldRow
          label={t("fields.disciplines.label")}
          hint={t("fields.disciplines.hint")}
          error={translateError(t, errors.disciplineSlugs?.message)}
        >
          <Controller
            control={control}
            name="disciplineSlugs"
            render={({ field }) => (
              <DisciplineMultiPicker
                value={field.value}
                onChange={field.onChange}
                groups={groupedDisciplines.map(({ domain, items }) => ({
                  domain,
                  items,
                }))}
                locale={locale}
              />
            )}
          />
        </FieldRow>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldRow
            label={t("fields.yearsExperience.label")}
            error={translateError(t, errors.yearsExperience?.message)}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              placeholder={t("fields.yearsExperience.placeholder")}
              className="h-12 rounded-xl"
              {...register("yearsExperience", { valueAsNumber: true })}
            />
          </FieldRow>
          <FieldRow
            label={t("fields.hourlyMin.label")}
            error={translateError(t, errors.hourlyMin?.message)}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={50}
              max={20000}
              step={50}
              placeholder={t("fields.hourlyMin.placeholder")}
              className="h-12 rounded-xl"
              {...register("hourlyMin", { valueAsNumber: true })}
            />
          </FieldRow>
          <FieldRow
            label={t("fields.hourlyMax.label")}
            error={translateError(t, errors.hourlyMax?.message)}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={50}
              max={20000}
              step={50}
              placeholder={t("fields.hourlyMax.placeholder")}
              className="h-12 rounded-xl"
              {...register("hourlyMax", { valueAsNumber: true })}
            />
          </FieldRow>
        </div>
      </FieldGroup>

      {/* ---------------- Section 3 — Where ---------------- */}
      <FieldGroup
        title={t("sections.where.title")}
        description={t("sections.where.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow
            label={t("fields.city.label")}
            error={translateError(t, errors.citySlug?.message)}
          >
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
            error={translateError(t, errors.districtSlug?.message)}
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

        <FieldRow
          label={t("fields.modalities.label")}
          hint={t("fields.modalities.hint")}
          error={translateError(t, errors.modalities?.message)}
        >
          <Controller
            control={control}
            name="modalities"
            render={({ field }) => (
              <div
                role="group"
                aria-label={t("fields.modalities.label")}
                className="grid grid-cols-2 gap-2"
              >
                {TEACHING_MODALITIES.map((m) => {
                  const checked = field.value.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => {
                        if (checked) {
                          field.onChange(field.value.filter((v) => v !== m));
                        } else {
                          field.onChange([...field.value, m]);
                        }
                      }}
                      className={cn(
                        "min-h-12 rounded-xl border px-3 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        checked
                          ? "border-brand bg-brand-soft text-brand-soft-foreground shadow-card"
                          : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
                      )}
                    >
                      {t(`fields.modalities.${m}`)}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </FieldRow>
      </FieldGroup>

      {/* ---------------- Section 4 — About ---------------- */}
      <FieldGroup
        title={t("sections.about.title")}
        description={t("sections.about.description")}
      >
        <FieldRow
          label={t("fields.headline.label")}
          hint={t("fields.headline.hint")}
          error={translateError(t, errors.headline?.message)}
        >
          <Input
            placeholder={t("fields.headline.placeholder")}
            className="h-12 rounded-xl"
            maxLength={120}
            {...register("headline")}
          />
        </FieldRow>
        <FieldRow
          label={t("fields.bio.label")}
          hint={t("fields.bio.hint")}
          error={translateError(t, errors.bio?.message)}
        >
          <Textarea
            placeholder={t("fields.bio.placeholder")}
            rows={6}
            maxLength={1500}
            className="rounded-xl"
            {...register("bio")}
          />
        </FieldRow>
        <FieldRow
          label={t("fields.referral.label")}
          optional
        >
          <Input
            placeholder={t("fields.referral.placeholder")}
            className="h-12 rounded-xl"
            maxLength={120}
            {...register("referralSource")}
          />
        </FieldRow>
      </FieldGroup>

      {/* ---------------- Section 5 — Consents ---------------- */}
      <FieldGroup
        title={t("sections.consents.title")}
        description={t("sections.consents.description")}
      >
        <FieldRow
          error={translateError(t, errors.consentKvkk?.message)}
        >
          <Controller
            control={control}
            name="consentKvkk"
            render={({ field }) => (
              <ConsentCheckbox
                checked={field.value === true}
                onChange={field.onChange}
                richContent={t.rich("consents.kvkk", {
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
              />
            )}
          />
        </FieldRow>

        <FieldRow
          error={translateError(t, errors.consentTeacherTerms?.message)}
        >
          <Controller
            control={control}
            name="consentTeacherTerms"
            render={({ field }) => (
              <ConsentCheckbox
                checked={field.value === true}
                onChange={field.onChange}
                richContent={t.rich("consents.teacher_terms", {
                  terms: (chunks) => (
                    <a
                      href="/yasal/ogretmen-sozlesmesi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand underline-offset-2 hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              />
            )}
          />
        </FieldRow>
      </FieldGroup>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
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
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {t("submit_footnote")}
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- */

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

function ConsentCheckbox({
  checked,
  onChange,
  richContent,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  richContent: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-brand"
      />
      <span className="text-sm leading-relaxed text-foreground">{richContent}</span>
    </label>
  );
}

function DisciplineMultiPicker({
  value,
  onChange,
  groups,
  locale,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  groups: { domain: MarketplaceDomain; items: MarketplaceDiscipline[] }[];
  locale: SupportedLocale;
}) {
  function toggle(slug: string) {
    if (value.includes(slug)) {
      onChange(value.filter((v) => v !== slug));
    } else {
      onChange([...value, slug]);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {groups.map(({ domain, items }) => (
        <div key={domain.slug} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pickLocalized(domain.name, locale)}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((d) => {
              const active = value.includes(d.slug);
              return (
                <button
                  key={d.slug}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => toggle(d.slug)}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    active
                      ? "border-brand bg-brand-soft text-brand-soft-foreground shadow-card"
                      : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
                  )}
                >
                  {pickLocalized(d.name, locale)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
