"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useTeacherApplicationDraft } from "@/hooks/useTeacherApplicationDraft";
import type {
  ApplicationApiPayload,
  ApplicationFieldErrorEnvelope,
  ApplicationModality,
  ApplicationMetadata,
  ApplicationPatchPayload,
  ApplicationViewModel,
  SpecialtyMetadataItem,
} from "@/lib/teacher-application/types";
import type { ApiCity, ApiDiscipline } from "@/lib/types/api/marketplace";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  initial: ApplicationApiPayload;
  cities: ApiCity[];
  disciplines: ApiDiscipline[];
  consentVersions: {
    kvkk: string;
    terms: string;
    teacherAgreement: string;
  };
}

const TOTAL_STEPS = 7;
const MIN_BIO_CHARS = 60;

type Draft = ApplicationViewModel;

export function WizardShell({
  initial,
  cities,
  disciplines,
  consentVersions,
}: WizardShellProps) {
  const t = useTranslations("teacherApplication.wizard");
  const router = useRouter();
  const { initialView, saveState, patch, flush, submit } =
    useTeacherApplicationDraft(initial);

  const [draft, setDraft] = useState<Draft>(initialView);
  const [step, setStep] = useState<number>(
    Math.min(Math.max(initial.current_step || 1, 1), TOTAL_STEPS),
  );
  const [consent, setConsent] = useState({ kvkk: false, agreement: false });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const districts = useMemo(() => {
    const city = cities.find((c) => c.slug === draft.citySlug);
    return city?.districts ?? [];
  }, [cities, draft.citySlug]);

  const orderedDisciplines = useMemo(() => {
    return [...disciplines].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return a.name_tr.localeCompare(b.name_tr, "tr");
    });
  }, [disciplines]);

  // Reflect external save errors so the user sees retry guidance.
  useEffect(() => {
    if (saveState.kind === "error") setSubmitError(saveState.message);
  }, [saveState]);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function persistField(api: ApplicationPatchPayload) {
    patch(api);
  }

  function goToStep(next: number) {
    const clamped = Math.min(Math.max(next, 1), TOTAL_STEPS);
    setStep(clamped);
    persistField({ current_step: clamped });
  }

  function next() {
    const errors = validateStep(step, draftRef.current);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    goToStep(step + 1);
  }

  function prev() {
    setFieldErrors({});
    goToStep(step - 1);
  }

  async function handleSubmit() {
    setSubmitError(null);
    setFieldErrors({});
    const allErrors = collectAllErrors(draftRef.current);
    if (!consent.kvkk || !consent.agreement) {
      allErrors["consent"] = t("preview.consent_required");
    }
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      setSubmitError(t("preview.fix_errors_first"));
      return;
    }
    setSubmitting(true);
    await flush();
    const result = await submit({
      kvkkVersion: consentVersions.kvkk,
      termsVersion: consentVersions.terms,
      teacherAgreementVersion: consentVersions.teacherAgreement,
    });
    setSubmitting(false);
    if (!result.ok) {
      handleSubmitError(result.error);
      return;
    }
    router.push("/panel-ogretmen/basvuru-durumu?just_submitted=1");
  }

  function handleSubmitError(envelope: ApplicationFieldErrorEnvelope) {
    if (envelope.error === "incomplete" && envelope.field_errors) {
      setFieldErrors(envelope.field_errors as Record<string, string>);
      setSubmitError(t("preview.fix_errors_first"));
      return;
    }
    if (envelope.error === "consent_required") {
      setSubmitError(t("preview.consent_required"));
      return;
    }
    if (envelope.error === "application_cooldown") {
      setSubmitError(t("errors.cooldown"));
      return;
    }
    setSubmitError(t("errors.generic"));
  }

  const isPreview = step === TOTAL_STEPS;
  const canSubmit = consent.kvkk && consent.agreement && !submitting;

  return (
    <div className="flex flex-col gap-8">
      <WizardProgress current={step} total={TOTAL_STEPS} t={t} />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        {step === 1 && (
          <StepPrimary
            draft={draft}
            setField={setField}
            persistField={persistField}
            disciplines={orderedDisciplines}
            errors={fieldErrors}
            t={t}
          />
        )}
        {step === 2 && (
          <StepLevels
            draft={draft}
            setField={setField}
            persistField={persistField}
            errors={fieldErrors}
            t={t}
          />
        )}
        {step === 3 && (
          <StepHeadline
            draft={draft}
            setField={setField}
            persistField={persistField}
            errors={fieldErrors}
            t={t}
          />
        )}
        {step === 4 && (
          <StepAbout
            draft={draft}
            setField={setField}
            persistField={persistField}
            errors={fieldErrors}
            t={t}
          />
        )}
        {step === 5 && (
          <StepLocation
            draft={draft}
            setField={setField}
            persistField={persistField}
            cities={cities}
            districts={districts}
            errors={fieldErrors}
            t={t}
          />
        )}
        {step === 6 && (
          <StepPricing
            draft={draft}
            setField={setField}
            persistField={persistField}
            errors={fieldErrors}
            t={t}
          />
        )}
        {isPreview && (
          <StepPreview
            draft={draft}
            disciplines={disciplines}
            cities={cities}
            consent={consent}
            setConsent={setConsent}
            consentVersions={consentVersions}
            errors={fieldErrors}
            t={t}
          />
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
        >
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={prev}
              disabled={submitting}
              className="gap-2"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                strokeWidth={2}
                aria-hidden
              />
              {t("nav.prev")}
            </Button>
          )}
          <SaveIndicator saveState={saveState} t={t} />
        </div>
        {isPreview ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="min-w-[200px] bg-action text-action-foreground hover:bg-action-hover"
          >
            {submitting ? t("nav.submitting") : t("nav.submit")}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={next}
            disabled={submitting}
            size="lg"
            className="min-w-[160px] gap-2"
          >
            {t("nav.next")}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              strokeWidth={2}
              aria-hidden
            />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── progress + save indicator ─────────────────────────────────────────────

function WizardProgress({
  current,
  total,
  t,
}: {
  current: number;
  total: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const stepLabels = [
    t("steps.s1"),
    t("steps.s2"),
    t("steps.s3"),
    t("steps.s4"),
    t("steps.s5"),
    t("steps.s6"),
    t("steps.s7"),
  ];
  return (
    <nav aria-label={t("progress_label")} className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">
          {t("progress_step", { current, total })}
        </span>
        <span className="text-muted-foreground">
          {stepLabels[current - 1]}
        </span>
      </div>
      <ol className="flex gap-1.5" role="list">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <li
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              n < current && "bg-brand",
              n === current && "bg-brand",
              n > current && "bg-border",
            )}
            aria-current={n === current ? "step" : undefined}
          />
        ))}
      </ol>
    </nav>
  );
}

function SaveIndicator({
  saveState,
  t,
}: {
  saveState: ReturnType<typeof useTeacherApplicationDraft>["saveState"];
  t: ReturnType<typeof useTranslations>;
}) {
  if (saveState.kind === "saving") {
    return (
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {t("save.saving")}
      </span>
    );
  }
  if (saveState.kind === "saved") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-success"
        aria-live="polite"
      >
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={14}
          strokeWidth={2.5}
          aria-hidden
        />
        {t("save.saved")}
      </span>
    );
  }
  if (saveState.kind === "error") {
    return (
      <span className="text-xs text-destructive" role="alert">
        {saveState.message}
      </span>
    );
  }
  return null;
}

// ── steps ────────────────────────────────────────────────────────────────

type StepProps = {
  draft: Draft;
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  persistField: (api: ApplicationPatchPayload) => void;
  errors: Record<string, string>;
  t: ReturnType<typeof useTranslations>;
};

function FieldLabel({
  htmlFor,
  children,
  hint,
  error,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {children}
      </label>
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputClass(hasError?: boolean) {
  return cn(
    "block w-full rounded-md border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    hasError
      ? "border-destructive focus-visible:ring-destructive/40"
      : "border-border focus-visible:border-brand",
  );
}

function StepPrimary({
  draft,
  setField,
  persistField,
  disciplines,
  errors,
  t,
}: StepProps & { disciplines: ApiDiscipline[] }) {
  const metadata = draft.metadata ?? {};
  const specialties = (metadata.specialty_disciplines ?? []) as SpecialtyMetadataItem[];

  function toggleSpecialty(slug: string) {
    const exists = specialties.some((s) => s.slug === slug);
    const next = exists
      ? specialties.filter((s) => s.slug !== slug)
      : [...specialties, { slug }];
    const meta: ApplicationMetadata = { ...metadata, specialty_disciplines: next };
    setField("metadata", meta);
    persistField({ metadata: meta });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s1_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s1_desc")}</p>
      </header>

      <FieldLabel
        htmlFor="full_name"
        error={errors.full_name}
        hint={t("fields.full_name_hint")}
      >
        {t("fields.full_name_label")}
      </FieldLabel>
      <input
        id="full_name"
        type="text"
        className={inputClass(!!errors.full_name)}
        value={draft.fullName}
        onChange={(e) => setField("fullName", e.target.value)}
        onBlur={(e) => persistField({ full_name: e.target.value })}
        maxLength={120}
        autoComplete="name"
      />

      <FieldLabel
        htmlFor="primary_discipline"
        error={errors.primary_discipline_slug}
        hint={t("fields.primary_discipline_hint")}
      >
        {t("fields.primary_discipline_label")}
      </FieldLabel>
      <select
        id="primary_discipline"
        className={inputClass(!!errors.primary_discipline_slug)}
        value={draft.primaryDisciplineSlug}
        onChange={(e) => {
          setField("primaryDisciplineSlug", e.target.value);
          persistField({ primary_discipline_slug: e.target.value });
        }}
      >
        <option value="">{t("fields.primary_discipline_placeholder")}</option>
        {disciplines.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name_tr}
          </option>
        ))}
      </select>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {t("fields.specialty_disciplines_label")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("fields.specialty_disciplines_hint")}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {disciplines
            .filter((d) => d.slug !== draft.primaryDisciplineSlug)
            .map((d) => {
              const selected = specialties.some((s) => s.slug === d.slug);
              return (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => toggleSpecialty(d.slug)}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-brand bg-brand-soft text-brand-soft-foreground"
                      : "border-border bg-card text-foreground hover:border-brand/60",
                  )}
                >
                  {d.name_tr}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StepLevels({ draft, setField, persistField, t }: StepProps) {
  const metadata = draft.metadata ?? {};
  const levels = (metadata.levels ?? []) as string[];
  const exams = (metadata.exam_types ?? []) as string[];

  const LEVEL_OPTIONS = [
    { key: "ilkokul", label: t("fields.levels.ilkokul") },
    { key: "ortaokul", label: t("fields.levels.ortaokul") },
    { key: "lise", label: t("fields.levels.lise") },
    { key: "universite", label: t("fields.levels.universite") },
    { key: "yetiskin", label: t("fields.levels.yetiskin") },
  ];
  const EXAM_OPTIONS = [
    { key: "lgs", label: "LGS" },
    { key: "tyt", label: "TYT" },
    { key: "ayt", label: "AYT" },
    { key: "yks", label: "YKS" },
    { key: "yds", label: "YDS / YÖKDİL" },
    { key: "kpss", label: "KPSS" },
    { key: "ales", label: "ALES" },
  ];

  function toggle(arrKey: "levels" | "exam_types", value: string) {
    const current = (metadata[arrKey] ?? []) as string[];
    const has = current.includes(value);
    const next = has ? current.filter((v) => v !== value) : [...current, value];
    const meta: ApplicationMetadata = { ...metadata, [arrKey]: next };
    setField("metadata", meta);
    persistField({ metadata: meta });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s2_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s2_desc")}</p>
      </header>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          {t("fields.levels_label")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {LEVEL_OPTIONS.map((o) => {
            const selected = levels.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggle("levels", o.key)}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-brand bg-brand-soft text-brand-soft-foreground"
                    : "border-border bg-card text-foreground hover:border-brand/60",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          {t("fields.exams_label")}
        </legend>
        <p className="text-xs text-muted-foreground">
          {t("fields.exams_hint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAM_OPTIONS.map((o) => {
            const selected = exams.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggle("exam_types", o.key)}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-brand bg-brand-soft text-brand-soft-foreground"
                    : "border-border bg-card text-foreground hover:border-brand/60",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function StepHeadline({ draft, setField, persistField, errors, t }: StepProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s3_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s3_desc")}</p>
      </header>

      <FieldLabel
        htmlFor="headline"
        error={errors.headline}
        hint={t("fields.headline_hint")}
      >
        {t("fields.headline_label")}
      </FieldLabel>
      <input
        id="headline"
        type="text"
        className={inputClass(!!errors.headline)}
        value={draft.headline}
        onChange={(e) => setField("headline", e.target.value)}
        onBlur={(e) => persistField({ headline: e.target.value })}
        maxLength={120}
        placeholder={t("fields.headline_placeholder")}
      />
      <p className="text-xs text-muted-foreground">
        {t("fields.headline_count", {
          n: draft.headline.length,
          max: 120,
        })}
      </p>
    </div>
  );
}

function StepAbout({ draft, setField, persistField, errors, t }: StepProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s4_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s4_desc")}</p>
      </header>

      <FieldLabel
        htmlFor="about_lessons"
        error={errors.about_lessons}
        hint={t("fields.about_lessons_hint", { min: MIN_BIO_CHARS })}
      >
        {t("fields.about_lessons_label")}
      </FieldLabel>
      <textarea
        id="about_lessons"
        rows={6}
        className={inputClass(!!errors.about_lessons)}
        value={draft.aboutLessons}
        onChange={(e) => setField("aboutLessons", e.target.value)}
        onBlur={(e) => persistField({ about_lessons: e.target.value })}
        maxLength={2000}
      />
      <p className="text-xs text-muted-foreground">
        {t("fields.char_count", { n: draft.aboutLessons.length, max: 2000 })}
      </p>

      <FieldLabel
        htmlFor="about_teacher"
        error={errors.about_teacher}
        hint={t("fields.about_teacher_hint", { min: MIN_BIO_CHARS })}
      >
        {t("fields.about_teacher_label")}
      </FieldLabel>
      <textarea
        id="about_teacher"
        rows={6}
        className={inputClass(!!errors.about_teacher)}
        value={draft.aboutTeacher}
        onChange={(e) => setField("aboutTeacher", e.target.value)}
        onBlur={(e) => persistField({ about_teacher: e.target.value })}
        maxLength={2000}
      />
      <p className="text-xs text-muted-foreground">
        {t("fields.char_count", { n: draft.aboutTeacher.length, max: 2000 })}
      </p>
    </div>
  );
}

function StepLocation({
  draft,
  setField,
  persistField,
  cities,
  districts,
  errors,
  t,
}: StepProps & {
  cities: ApiCity[];
  districts: ApiCity["districts"];
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s5_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s5_desc")}</p>
      </header>

      <FieldLabel htmlFor="city" error={errors.city_slug}>
        {t("fields.city_label")}
      </FieldLabel>
      <select
        id="city"
        className={inputClass(!!errors.city_slug)}
        value={draft.citySlug}
        onChange={(e) => {
          const value = e.target.value;
          setField("citySlug", value);
          setField("districtSlug", "");
          persistField({ city_slug: value, district_slug: "" });
        }}
      >
        <option value="">{t("fields.city_placeholder")}</option>
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name_tr}
          </option>
        ))}
      </select>

      {districts.length > 0 && (
        <>
          <FieldLabel htmlFor="district">{t("fields.district_label")}</FieldLabel>
          <select
            id="district"
            className={inputClass(false)}
            value={draft.districtSlug}
            onChange={(e) => {
              setField("districtSlug", e.target.value);
              persistField({ district_slug: e.target.value });
            }}
          >
            <option value="">{t("fields.district_placeholder")}</option>
            {districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name_tr}
              </option>
            ))}
          </select>
        </>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("fields.modality_label")}
        </legend>
        <p className="text-xs text-muted-foreground">
          {t("fields.modality_hint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["in_person", "online", "hybrid"] as ApplicationModality[]).map(
            (m) => {
              if (!m) return null;
              const selected = draft.modality === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setField("modality", m);
                    persistField({ modality: m });
                  }}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm transition-colors",
                    selected
                      ? "border-brand bg-brand-soft text-brand-soft-foreground"
                      : "border-border bg-card text-foreground hover:border-brand/60",
                  )}
                  aria-pressed={selected}
                >
                  {t(`fields.modality_${m}`)}
                </button>
              );
            },
          )}
        </div>
        {errors.modality ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.modality}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}

function StepPricing({ draft, setField, persistField, errors, t }: StepProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s6_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s6_desc")}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor="hourly_min"
            error={errors.hourly_rate_min}
            hint={t("fields.hourly_min_hint")}
          >
            {t("fields.hourly_min_label")}
          </FieldLabel>
          <input
            id="hourly_min"
            type="number"
            min={50}
            max={20000}
            step={10}
            className={inputClass(!!errors.hourly_rate_min)}
            value={draft.hourlyRateMin ?? ""}
            onChange={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              setField("hourlyRateMin", value);
            }}
            onBlur={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              persistField({ hourly_rate_min: value });
            }}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="hourly_max"
            error={errors.hourly_rate_max}
            hint={t("fields.hourly_max_hint")}
          >
            {t("fields.hourly_max_label")}
          </FieldLabel>
          <input
            id="hourly_max"
            type="number"
            min={50}
            max={20000}
            step={10}
            className={inputClass(!!errors.hourly_rate_max)}
            value={draft.hourlyRateMax ?? ""}
            onChange={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              setField("hourlyRateMax", value);
            }}
            onBlur={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              persistField({ hourly_rate_max: value });
            }}
          />
        </div>
      </div>

      <FieldLabel
        htmlFor="years_of_experience"
        hint={t("fields.experience_hint")}
      >
        {t("fields.experience_label")}
      </FieldLabel>
      <input
        id="years_of_experience"
        type="number"
        min={0}
        max={60}
        className={inputClass(false)}
        value={draft.yearsOfExperience ?? ""}
        onChange={(e) => {
          const value = e.target.value === "" ? null : Number(e.target.value);
          setField("yearsOfExperience", value);
        }}
        onBlur={(e) => {
          const value = e.target.value === "" ? null : Number(e.target.value);
          persistField({ years_of_experience: value });
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor="contact_phone"
            error={errors.contact_phone}
            hint={t("fields.phone_hint")}
          >
            {t("fields.phone_label")}
          </FieldLabel>
          <input
            id="contact_phone"
            type="tel"
            className={inputClass(!!errors.contact_phone)}
            value={draft.contactPhone}
            onChange={(e) => setField("contactPhone", e.target.value)}
            onBlur={(e) => persistField({ contact_phone: e.target.value })}
            inputMode="tel"
            autoComplete="tel"
            placeholder="05XX XXX XX XX"
          />
        </div>
        <div>
          <FieldLabel htmlFor="contact_email" error={errors.contact_email}>
            {t("fields.email_label")}
          </FieldLabel>
          <input
            id="contact_email"
            type="email"
            className={inputClass(!!errors.contact_email)}
            value={draft.contactEmail}
            onChange={(e) => setField("contactEmail", e.target.value)}
            onBlur={(e) => persistField({ contact_email: e.target.value })}
            autoComplete="email"
            placeholder="ornek@eposta.com"
          />
        </div>
      </div>
    </div>
  );
}

function StepPreview({
  draft,
  disciplines,
  cities,
  consent,
  setConsent,
  errors,
  t,
}: {
  draft: Draft;
  disciplines: ApiDiscipline[];
  cities: ApiCity[];
  consent: { kvkk: boolean; agreement: boolean };
  setConsent: React.Dispatch<
    React.SetStateAction<{ kvkk: boolean; agreement: boolean }>
  >;
  consentVersions: WizardShellProps["consentVersions"];
  errors: Record<string, string>;
  t: ReturnType<typeof useTranslations>;
}) {
  const cityName =
    cities.find((c) => c.slug === draft.citySlug)?.name_tr ?? draft.citySlug;
  const disciplineName =
    disciplines.find((d) => d.slug === draft.primaryDisciplineSlug)?.name_tr ??
    draft.primaryDisciplineSlug;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("steps.s7_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s7_desc")}</p>
      </header>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-5 text-sm sm:grid-cols-2">
        <PreviewRow label={t("preview.full_name")} value={draft.fullName} />
        <PreviewRow label={t("preview.primary")} value={disciplineName} />
        <PreviewRow
          label={t("preview.location")}
          value={
            draft.districtSlug
              ? `${cityName} · ${draft.districtSlug}`
              : cityName
          }
        />
        <PreviewRow
          label={t("preview.modality")}
          value={draft.modality ? t(`fields.modality_${draft.modality}`) : "—"}
        />
        <PreviewRow label={t("preview.headline")} value={draft.headline} />
        <PreviewRow
          label={t("preview.hourly")}
          value={
            draft.hourlyRateMin && draft.hourlyRateMax
              ? `${draft.hourlyRateMin}–${draft.hourlyRateMax} ₺/sa`
              : "—"
          }
        />
        <PreviewRow label={t("preview.phone")} value={draft.contactPhone} />
        <PreviewRow label={t("preview.email")} value={draft.contactEmail} />
      </dl>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 flex items-start gap-2">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={18}
            strokeWidth={2}
            className="mt-0.5 text-brand"
            aria-hidden
          />
          <p className="font-medium text-foreground">
            {t("preview.review_note_title")}
          </p>
        </div>
        <p className="text-muted-foreground">{t("preview.review_note_body")}</p>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="sr-only">{t("preview.consents")}</legend>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-border text-brand focus:ring-brand"
            checked={consent.kvkk}
            onChange={(e) =>
              setConsent((c) => ({ ...c, kvkk: e.target.checked }))
            }
          />
          <span>{t.rich("preview.kvkk_consent", richLinks(t))}</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-border text-brand focus:ring-brand"
            checked={consent.agreement}
            onChange={(e) =>
              setConsent((c) => ({ ...c, agreement: e.target.checked }))
            }
          />
          <span>{t.rich("preview.agreement_consent", richLinks(t))}</span>
        </label>
      </fieldset>

      {errors.consent ? (
        <p className="text-xs text-destructive" role="alert">
          {errors.consent}
        </p>
      ) : null}
    </div>
  );
}

function richLinks(_t: ReturnType<typeof useTranslations>) {
  return {
    kvkk: (chunks: React.ReactNode) => (
      <a
        href="/yasal/kvkk"
        target="_blank"
        rel="noreferrer"
        className="text-brand underline-offset-2 hover:underline"
      >
        {chunks}
      </a>
    ),
    agreement: (chunks: React.ReactNode) => (
      <a
        href="/yasal/ogretmen-sozlesmesi"
        target="_blank"
        rel="noreferrer"
        className="text-brand underline-offset-2 hover:underline"
      >
        {chunks}
      </a>
    ),
  };
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium text-foreground break-words">
        {value && value.length > 0 ? value : "—"}
      </dd>
    </div>
  );
}

// ── validation ────────────────────────────────────────────────────────────

function validateStep(step: number, d: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!d.fullName.trim()) errors.full_name = "Ad soyad zorunlu.";
    if (!d.primaryDisciplineSlug)
      errors.primary_discipline_slug = "Ana branş seç.";
  } else if (step === 3) {
    if (d.headline.trim().length < 10)
      errors.headline = "En az 10 karakter.";
  } else if (step === 4) {
    if (d.aboutLessons.trim().length < MIN_BIO_CHARS)
      errors.about_lessons = `En az ${MIN_BIO_CHARS} karakter.`;
    if (d.aboutTeacher.trim().length < MIN_BIO_CHARS)
      errors.about_teacher = `En az ${MIN_BIO_CHARS} karakter.`;
  } else if (step === 5) {
    if (!d.citySlug) errors.city_slug = "Şehir seç.";
    if (!d.modality) errors.modality = "Ders formatını seç.";
  } else if (step === 6) {
    if (d.hourlyRateMin === null)
      errors.hourly_rate_min = "Saatlik minimum gir.";
    if (d.hourlyRateMax === null)
      errors.hourly_rate_max = "Saatlik maksimum gir.";
    if (
      d.hourlyRateMin !== null &&
      d.hourlyRateMax !== null &&
      d.hourlyRateMin > d.hourlyRateMax
    ) {
      errors.hourly_rate_max = "Maksimum minimumdan küçük olamaz.";
    }
    if (!d.contactPhone.trim()) errors.contact_phone = "Telefon zorunlu.";
    if (!d.contactEmail.trim()) errors.contact_email = "E-posta zorunlu.";
  }
  return errors;
}

function collectAllErrors(d: Draft): Record<string, string> {
  return {
    ...validateStep(1, d),
    ...validateStep(3, d),
    ...validateStep(4, d),
    ...validateStep(5, d),
    ...validateStep(6, d),
  };
}
