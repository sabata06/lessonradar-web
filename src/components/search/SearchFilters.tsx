import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { City, District, MarketplaceDiscipline, MarketplaceDomain, SupportedLocale } from "@/lib/types";
import { pickLocalized } from "@/lib/types";
import type { ModalityFilter, TeacherSearchFilters } from "@/lib/search/teacher-search";

interface SearchFiltersProps {
  filters: TeacherSearchFilters;
  domains: MarketplaceDomain[];
  disciplines: MarketplaceDiscipline[];
  cities: City[];
  districts: District[];
  locale: SupportedLocale;
  /**
   * When true, render with a tighter mobile layout for use inside the
   * filter sheet. Form submit and "clear" links remain identical.
   */
  compact?: boolean;
}

/**
 * Filter form. A plain GET form posting to `/ara` — every selection is
 * a query string round-trip so the URL becomes the canonical state.
 *
 * Native `<select>` elements rather than the radix Select to keep the
 * form fully server-renderable (no client JS, no controlled-component
 * gymnastics inside the sheet portal). The mobile keyboard / system
 * picker is also better at scanning long city/discipline lists.
 */
export function SearchFilters({
  filters,
  domains,
  disciplines,
  cities,
  districts,
  locale,
  compact = false,
}: SearchFiltersProps) {
  const t = useTranslations("search.filters");

  const grouped = domains
    .map((domain) => ({
      domain,
      items: disciplines.filter((d) => d.domainSlug === domain.slug),
    }))
    .filter((g) => g.items.length > 0);

  const priorityCities = cities.filter((c) => c.isPriority);
  const otherCities = cities.filter((c) => !c.isPriority);

  // Districts only when a city is selected — otherwise an irrelevant list.
  const districtsForCity = filters.citySlug
    ? districts.filter((d) => d.citySlug === filters.citySlug)
    : [];

  const clearAllHref = `/ara`;

  return (
    <form
      method="get"
      action=""
      aria-label={t("title")}
      className={cn(
        "flex flex-col gap-5",
        !compact && "rounded-2xl border border-border bg-card p-5 shadow-card",
      )}
    >
      {/* Pass query through so submitting filters keeps the user's keyword */}
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort && filters.sort !== "relevance" && (
        <input type="hidden" name="sort" value={filters.sort} />
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <Link
          href={clearAllHref}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
        >
          {t("clear_all")}
        </Link>
      </div>

      <FieldBlock label={t("discipline")}>
        <Select
          name="discipline"
          defaultValue={filters.disciplineSlug ?? ""}
          ariaLabel={t("discipline")}
        >
          <option value="">{t("discipline_placeholder")}</option>
          {grouped.map(({ domain, items }) => (
            <optgroup
              key={domain.slug}
              label={pickLocalized(domain.name, locale)}
            >
              {items.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {pickLocalized(d.name, locale)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </FieldBlock>

      <FieldBlock label={t("city")}>
        <Select
          name="city"
          defaultValue={filters.citySlug ?? ""}
          ariaLabel={t("city")}
        >
          <option value="">{t("city_placeholder")}</option>
          {priorityCities.length > 0 && (
            <optgroup
              label={locale === "tr" ? "Öncelikli şehirler" : "Priority cities"}
            >
              {priorityCities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {locale === "tr" ? c.nameTr : c.nameEn}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup
            label={locale === "tr" ? "Tüm şehirler" : "All cities"}
          >
            {otherCities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {locale === "tr" ? c.nameTr : c.nameEn}
              </option>
            ))}
          </optgroup>
        </Select>
      </FieldBlock>

      <FieldBlock label={t("district")}>
        <Select
          name="district"
          defaultValue={filters.districtSlug ?? ""}
          ariaLabel={t("district")}
          disabled={districtsForCity.length === 0}
        >
          <option value="">
            {districtsForCity.length === 0
              ? t("district_disabled")
              : t("district_placeholder")}
          </option>
          {districtsForCity.map((d) => (
            <option key={d.slug} value={d.slug}>
              {locale === "tr" ? d.nameTr : d.nameEn}
            </option>
          ))}
        </Select>
      </FieldBlock>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("modality")}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {(["any", "online", "in_person"] as ModalityFilter[]).map((m) => {
            const isActive = (filters.modality ?? "any") === m;
            const labelKey =
              m === "any"
                ? "modality_any"
                : m === "online"
                  ? "modality_online"
                  : "modality_in_person";
            return (
              <label
                key={m}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "border-brand bg-brand-soft text-brand-soft-foreground shadow-card"
                    : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name="modality"
                  value={m}
                  defaultChecked={isActive}
                  className="sr-only"
                />
                {t(labelKey)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40">
        <input
          type="checkbox"
          name="verified"
          value="1"
          defaultChecked={filters.verifiedOnly === true}
          className="mt-0.5 size-4 shrink-0 accent-brand"
        />
        <span className="text-sm leading-relaxed text-foreground">
          {t("verified")}
        </span>
      </label>

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full gap-2 bg-brand text-primary-foreground hover:bg-brand/90"
      >
        {t("apply")}
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

function Select({
  name,
  defaultValue,
  ariaLabel,
  disabled,
  children,
}: {
  name: string;
  defaultValue: string;
  ariaLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {children}
    </select>
  );
}

