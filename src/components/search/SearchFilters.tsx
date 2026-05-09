"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BrandCombobox,
  type ComboboxOption,
} from "@/components/ui/brand-combobox";
import type {
  City,
  District,
  MarketplaceDiscipline,
  MarketplaceDomain,
  SupportedLocale,
} from "@/lib/types";
import { pickLocalized } from "@/lib/types";
import {
  buildSearchQuery,
  type ModalityFilter,
  type TeacherSearchFilters,
} from "@/lib/search/teacher-search-types";

interface SearchFiltersProps {
  filters: TeacherSearchFilters;
  domains: MarketplaceDomain[];
  disciplines: MarketplaceDiscipline[];
  cities: City[];
  districts: District[];
  locale: SupportedLocale;
  /**
   * When true, render with a tighter mobile layout for use inside the
   * filter sheet. Apply button stretches full width either way; the
   * sheet wrapper is responsible for sticky-bottom placement.
   */
  compact?: boolean;
  /**
   * Optional callback fired after a successful Apply (e.g. close the
   * mobile sheet). Skipping this on desktop keeps the form silent.
   */
  onApplied?: () => void;
}

/**
 * Interactive filter form. State lives locally until the user hits
 * "Uygula" so we don't burn a server round-trip on every keystroke;
 * Apply pushes a fresh `/ara?...` URL. Sort lives in its own client
 * island and stays auto-applied (single-action mental model).
 *
 * District list reactively populates when the user picks a city —
 * before this refactor the form needed two submits to surface the
 * district select.
 */
export function SearchFilters({
  filters,
  domains,
  disciplines,
  cities,
  districts,
  locale,
  compact = false,
  onApplied,
}: SearchFiltersProps) {
  const t = useTranslations("search.filters");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local-only state — only flushed to URL on Apply.
  const [disciplineSlug, setDisciplineSlug] = useState<string | "">(
    filters.disciplineSlug ?? "",
  );
  const [citySlug, setCitySlug] = useState<string | "">(filters.citySlug ?? "");
  const [districtSlug, setDistrictSlug] = useState<string | "">(
    filters.districtSlug ?? "",
  );
  const [modality, setModality] = useState<ModalityFilter>(
    filters.modality ?? "any",
  );
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(
    filters.verifiedOnly === true,
  );

  const groupedDisciplines = useMemo(
    () =>
      domains
        .map((domain) => ({
          domain,
          items: disciplines.filter((d) => d.domainSlug === domain.slug),
        }))
        .filter((g) => g.items.length > 0),
    [domains, disciplines],
  );

  const priorityCities = useMemo(
    () => cities.filter((c) => c.isPriority),
    [cities],
  );
  const otherCities = useMemo(
    () => cities.filter((c) => !c.isPriority),
    [cities],
  );

  const districtsForCity = useMemo(
    () => (citySlug ? districts.filter((d) => d.citySlug === citySlug) : []),
    [districts, citySlug],
  );

  // Combobox option arrays — flatten the grouped maps once so the
  // `<BrandCombobox>` instances stay declarative and re-render cheap.
  const disciplineOptions: ComboboxOption[] = useMemo(
    () =>
      groupedDisciplines.flatMap(({ domain, items }) =>
        items.map((d) => ({
          value: d.slug,
          label: pickLocalized(d.name, locale),
          group: pickLocalized(domain.name, locale),
        })),
      ),
    [groupedDisciplines, locale],
  );

  const cityOptions: ComboboxOption[] = useMemo(() => {
    const priorityHeader =
      locale === "tr" ? "Öncelikli şehirler" : "Priority cities";
    const allHeader = locale === "tr" ? "Tüm şehirler" : "All cities";
    return [
      ...priorityCities.map((c) => ({
        value: c.slug,
        label: locale === "tr" ? c.nameTr : c.nameEn,
        group: priorityHeader,
      })),
      ...otherCities.map((c) => ({
        value: c.slug,
        label: locale === "tr" ? c.nameTr : c.nameEn,
        group: allHeader,
      })),
    ];
  }, [priorityCities, otherCities, locale]);

  const districtOptions: ComboboxOption[] = useMemo(
    () =>
      districtsForCity.map((d) => ({
        value: d.slug,
        label: locale === "tr" ? d.nameTr : d.nameEn,
      })),
    [districtsForCity, locale],
  );

  function handleCityChange(next: string) {
    setCitySlug(next);
    // Reset district whenever the city changes — yesterday's district is
    // always invalid for a different city.
    setDistrictSlug("");
  }

  function toggleModality(target: "online" | "in_person") {
    setModality((current) => (current === target ? "any" : target));
  }

  function applyFilters() {
    const next: TeacherSearchFilters = {
      ...filters,
      disciplineSlug: disciplineSlug || undefined,
      citySlug: citySlug || undefined,
      districtSlug: districtSlug || undefined,
      modality,
      verifiedOnly,
    };
    const qs = buildSearchQuery(next);
    startTransition(() => {
      router.push(`/ara${qs}`);
      onApplied?.();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    applyFilters();
  }

  const isOnline = modality === "online";
  const isInPerson = modality === "in_person";

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t("title")}
      className={cn(
        "flex flex-col gap-5",
        !compact && "rounded-2xl border border-border bg-card p-5 shadow-card",
      )}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <Link
          href="/ara"
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
        >
          {t("clear_all")}
        </Link>
      </div>

      <FieldBlock label={t("discipline")}>
        <BrandCombobox
          value={disciplineSlug}
          onChange={setDisciplineSlug}
          options={disciplineOptions}
          placeholder={t("discipline_placeholder")}
          allLabel={t("discipline_placeholder")}
          searchPlaceholder={t("search_placeholder")}
          emptyText={t("search_empty")}
          ariaLabel={t("discipline")}
        />
      </FieldBlock>

      <FieldBlock label={t("city")}>
        <BrandCombobox
          value={citySlug}
          onChange={handleCityChange}
          options={cityOptions}
          placeholder={t("city_placeholder")}
          allLabel={t("city_placeholder")}
          searchPlaceholder={t("search_placeholder")}
          emptyText={t("search_empty")}
          ariaLabel={t("city")}
        />
      </FieldBlock>

      <FieldBlock label={t("district")}>
        <BrandCombobox
          value={districtSlug}
          onChange={setDistrictSlug}
          options={districtOptions}
          placeholder={
            districtsForCity.length === 0
              ? t("district_disabled")
              : t("district_placeholder")
          }
          allLabel={t("district_placeholder")}
          searchPlaceholder={t("search_placeholder")}
          emptyText={t("search_empty")}
          ariaLabel={t("district")}
          disabled={districtsForCity.length === 0}
        />
      </FieldBlock>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("modality")}
        </legend>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("modality_help")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ModalityToggle
            label={t("modality_online")}
            active={isOnline}
            onClick={() => toggleModality("online")}
          />
          <ModalityToggle
            label={t("modality_in_person")}
            active={isInPerson}
            onClick={() => toggleModality("in_person")}
          />
        </div>
      </fieldset>

      <VerifiedSwitch
        checked={verifiedOnly}
        onChange={setVerifiedOnly}
        label={t("verified")}
      />

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        aria-busy={isPending}
        className={cn(
          "h-12 w-full gap-2 bg-brand text-primary-foreground hover:bg-brand/90",
          compact &&
            "sticky bottom-0 z-10 mt-2 shadow-[0_-12px_24px_-12px_rgba(0,0,0,0.18)]",
        )}
      >
        {isPending ? t("apply_pending") : t("apply")}
      </Button>
    </form>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}


function ModalityToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "border-brand bg-brand-soft text-brand-soft-foreground shadow-card"
          : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
      )}
    >
      {active && (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={14}
          strokeWidth={2.5}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

function VerifiedSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        checked
          ? "border-brand/60 bg-brand-soft/60"
          : "border-border bg-card hover:border-brand/30",
      )}
    >
      <span className="text-sm font-medium leading-snug text-foreground">
        {label}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-card shadow-sm transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
