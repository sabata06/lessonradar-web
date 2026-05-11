"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  ImageUpload01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  BrandCombobox,
  type ComboboxOption,
} from "@/components/ui/brand-combobox";
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
  /** The signed-in user's account email — used to prefill the contact email
   *  field on first wizard load so the teacher doesn't retype it. */
  accountEmail: string;
  consentVersions: {
    kvkk: string;
    terms: string;
    teacherAgreement: string;
  };
}

const TOTAL_STEPS = 8;
const MIN_BIO_CHARS = 60;

type Draft = ApplicationViewModel;

export function WizardShell({
  initial,
  cities,
  disciplines,
  accountEmail,
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
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const isInitialStepRef = useRef(true);
  const emailPrefilledRef = useRef(false);

  // Prefill contact email from the signed-in account on first mount when the
  // draft has none yet. The teacher can still override it (we keep the field
  // editable rather than removing it — some teachers prefer to publish a
  // separate work address). One-shot guard + persist so it survives a refresh.
  useEffect(() => {
    if (emailPrefilledRef.current) return;
    emailPrefilledRef.current = true;
    if (!accountEmail) return;
    if (draftRef.current.contactEmail.trim().length > 0) return;
    setDraft((prev) => ({ ...prev, contactEmail: accountEmail }));
    patch({ contact_email: accountEmail });
  }, [accountEmail, patch]);

  // When the step changes, bring the new step into view and move focus to its
  // heading so screen readers announce the new context. Skipping the very
  // first render avoids a smooth-scroll snap right after page load.
  useEffect(() => {
    if (isInitialStepRef.current) {
      isInitialStepRef.current = false;
      // Resume case: if the wizard opens past step 1, still place the user at
      // the top of the card without a smooth-scroll animation.
      if (step > 1) {
        scrollAnchorRef.current?.scrollIntoView({ block: "start" });
      }
      return;
    }
    scrollAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    // Defer focus so the smooth scroll has a frame to begin; without the
    // timeout, focus() snaps the viewport and cancels the scroll animation.
    const id = window.setTimeout(() => {
      const heading =
        scrollAnchorRef.current?.querySelector<HTMLHeadingElement>(
          "[data-wizard-heading]",
        );
      heading?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(id);
  }, [step]);

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
      <div
        ref={scrollAnchorRef}
        aria-hidden
        className="pointer-events-none -mt-4 h-0 scroll-mt-20"
      />
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
        {step === 7 && (
          <StepPhoto
            uuid={initial.uuid}
            photoUrl={draft.profileImage}
            setField={setField}
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
    t("steps.s8"),
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
  const tCommon = useTranslations("search.filters");

  const disciplineOptions = useMemo<ComboboxOption[]>(
    () =>
      disciplines.map((d) => ({
        value: d.slug,
        label: d.name_tr,
      })),
    [disciplines],
  );

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
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
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
      <BrandCombobox
        value={draft.primaryDisciplineSlug}
        onChange={(next) => {
          setField("primaryDisciplineSlug", next);
          persistField({ primary_discipline_slug: next });
        }}
        options={disciplineOptions}
        placeholder={t("fields.primary_discipline_placeholder")}
        searchPlaceholder={tCommon("search_placeholder")}
        emptyText={tCommon("search_empty")}
        ariaLabel={t("fields.primary_discipline_label")}
      />

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
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
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
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
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
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
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
  const tCommon = useTranslations("search.filters");

  const cityOptions = useMemo<ComboboxOption[]>(
    () => cities.map((c) => ({ value: c.slug, label: c.name_tr })),
    [cities],
  );
  const districtOptions = useMemo<ComboboxOption[]>(
    () => districts.map((d) => ({ value: d.slug, label: d.name_tr })),
    [districts],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
          {t("steps.s5_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s5_desc")}</p>
      </header>

      <FieldLabel htmlFor="city" error={errors.city_slug}>
        {t("fields.city_label")}
      </FieldLabel>
      <BrandCombobox
        value={draft.citySlug}
        onChange={(next) => {
          setField("citySlug", next);
          setField("districtSlug", "");
          persistField({ city_slug: next, district_slug: "" });
        }}
        options={cityOptions}
        placeholder={t("fields.city_placeholder")}
        searchPlaceholder={tCommon("search_placeholder")}
        emptyText={tCommon("search_empty")}
        ariaLabel={t("fields.city_label")}
      />

      {districts.length > 0 && (
        <>
          <FieldLabel htmlFor="district">{t("fields.district_label")}</FieldLabel>
          <BrandCombobox
            value={draft.districtSlug}
            onChange={(next) => {
              setField("districtSlug", next);
              persistField({ district_slug: next });
            }}
            options={districtOptions}
            placeholder={t("fields.district_placeholder")}
            searchPlaceholder={tCommon("search_placeholder")}
            emptyText={tCommon("search_empty")}
            ariaLabel={t("fields.district_label")}
          />
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
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
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

      {/*
        Telefon ve e-posta alanları aynı yatay hizada kalsın diye `items-start`
        + sabit label satırı + altta yardım metni (hint) deseni. Önceden hint
        label ile input arasındaydı; sadece telefonun hinti olduğu için input
        satırı kayıyordu.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
        <div className="space-y-1.5">
          <label
            htmlFor="contact_phone"
            className="block text-sm font-medium text-foreground"
          >
            {t("fields.phone_label")}
          </label>
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
          {errors.contact_phone ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.contact_phone}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("fields.phone_hint")}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="contact_email"
            className="block text-sm font-medium text-foreground"
          >
            {t("fields.email_label")}
          </label>
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
          {errors.contact_email ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.contact_email}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("fields.email_hint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── photo step ────────────────────────────────────────────────────────────

const PHOTO_MAX_BYTES = 8 * 1024 * 1024; // mirrors backend MAX_UPLOAD_BYTES
const PHOTO_ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readCsrfCookieClient(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)lr_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function StepPhoto({
  uuid,
  photoUrl,
  setField,
  errors,
  t,
}: {
  uuid: string;
  photoUrl: string | null;
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: Record<string, string>;
  t: ReturnType<typeof useTranslations>;
}) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">(
    "idle",
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Local blob URL of the file the user just picked. Shown instead of the
  // R2/CDN URL so (a) preview is instantaneous (no round-trip wait) and
  // (b) it sidesteps the TR-ISP `*.r2.dev` SNI reset until custom domain
  // cutover lands. Revoked on replace + unmount to avoid memory leaks.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Client-side validations mirror backend's `process_profile_photo` —
    // we'd rather reject before paying the network round-trip + Django CPU.
    // The server re-validates so a manipulated client can't smuggle bad
    // files through.
    if (file.size > PHOTO_MAX_BYTES) {
      setLocalError(t("photo.errors.too_large"));
      setUploadState("error");
      return;
    }
    if (!PHOTO_ACCEPT_TYPES.includes(file.type)) {
      setLocalError(t("photo.errors.wrong_type"));
      setUploadState("error");
      return;
    }

    setLocalError(null);
    setUploadState("uploading");

    // Spin up the local preview right away — gives the user instant
    // feedback that the file was accepted, even before the upload completes.
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(`/api/teacher-application/${uuid}/photo`, {
        method: "POST",
        credentials: "same-origin",
        // NB: no Content-Type header — letting fetch derive the multipart
        // boundary from FormData is the only safe way.
        headers: { "x-csrf-token": readCsrfCookieClient() },
        body: formData,
      });
      const payload = (await res.json().catch(() => null)) as
        | { profile_image?: string | null; error?: string; detail?: string }
        | null;
      if (!res.ok) {
        const detail =
          (payload && (payload.detail ?? payload.error)) ??
          t("photo.errors.invalid");
        setLocalError(detail);
        setUploadState("error");
        return;
      }
      const nextUrl = payload?.profile_image ?? null;
      setField("profileImage", nextUrl);
      setUploadState("idle");
    } catch {
      setLocalError(t("photo.errors.network"));
      setUploadState("error");
    } finally {
      // Reset the file input so the same file can be re-selected (browsers
      // suppress `change` events when the value matches the prior selection).
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openFilePicker = () => inputRef.current?.click();
  const isUploading = uploadState === "uploading";
  const errorMessage = localError ?? errors.profile_image ?? null;
  const previewSrc = localPreview ?? photoUrl;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2
          data-wizard-heading
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight text-foreground outline-none"
        >
          {t("steps.s7_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s7_desc")}</p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={openFilePicker}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          disabled={isUploading}
          className={cn(
            "relative flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-card transition-colors",
            isDragging && "border-brand bg-brand-soft",
            !isDragging && !errorMessage && "border-border hover:border-brand/60",
            errorMessage && "border-destructive",
            isUploading && "cursor-wait",
          )}
          aria-label={photoUrl ? t("photo.replace") : t("photo.dropzone_label")}
        >
          {previewSrc ? (
            // Browser-native <img> on purpose: this preview comes from
            // either a local blob URL (the just-picked file) or the R2/CDN
            // host whose hostname may not be in next.config's
            // remotePatterns yet (custom domain cutover pending). Using
            // next/image would 400 the moment Mehmet swaps R2_PUBLIC_URL
            // until the host whitelist follows.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={t("photo.preview_alt")}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <HugeiconsIcon
                icon={ImageUpload01Icon}
                size={36}
                strokeWidth={1.6}
                className="text-muted-foreground"
                aria-hidden
              />
              <p className="text-sm font-medium text-foreground">
                {t("photo.dropzone_label")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("photo.dropzone_hint")}
              </p>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-sm font-medium text-background">
              {t("photo.uploading")}
            </div>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ACCEPT_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {previewSrc && !isUploading && (
          <button
            type="button"
            onClick={openFilePicker}
            className="text-sm font-medium text-brand underline-offset-2 hover:underline"
          >
            {t("photo.replace")}
          </button>
        )}

        {errorMessage && (
          <p className="text-center text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1.5 font-semibold text-foreground">
          {t("photo.tips_title")}
        </p>
        <ul className="space-y-1">
          <li>· {t("photo.tip_face")}</li>
          <li>· {t("photo.tip_light")}</li>
          <li>· {t("photo.tip_solo")}</li>
        </ul>
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
        <h2 data-wizard-heading tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground outline-none">
          {t("steps.s8_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("steps.s8_desc")}</p>
      </header>

      <div className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4">
        {draft.profileImage ? (
          // Plain <img>: see note in StepPhoto — the R2 hostname may not
          // be in next.config remotePatterns mid-cutover.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.profileImage}
            alt={t("photo.preview_alt")}
            className="size-20 flex-none rounded-xl object-cover"
          />
        ) : (
          <div className="flex size-20 flex-none items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            —
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("preview.photo")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {draft.profileImage
              ? t("preview.photo_set")
              : t("preview.photo_missing")}
          </p>
        </div>
      </div>

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
  } else if (step === 7) {
    if (!d.profileImage) errors.profile_image = "Profil fotoğrafı zorunlu.";
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
    ...validateStep(7, d),
  };
}
