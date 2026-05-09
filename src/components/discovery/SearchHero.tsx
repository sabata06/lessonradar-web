"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  MapsLocation01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  BrandCombobox,
  type ComboboxOption,
} from "@/components/ui/brand-combobox";
import { cn } from "@/lib/utils";
import type {
  City,
  MarketplaceDiscipline,
  MarketplaceDomain,
  SupportedLocale,
} from "@/lib/types";
import { pickLocalized } from "@/lib/types";

interface SearchHeroProps {
  locale: SupportedLocale;
  domains: MarketplaceDomain[];
  disciplines: MarketplaceDiscipline[];
  cities: City[];
  defaultCitySlug?: string;
  defaultDisciplineSlug?: string;
}

export function SearchHero({
  locale,
  domains,
  disciplines,
  cities,
  defaultCitySlug = "gaziantep",
  defaultDisciplineSlug,
}: SearchHeroProps) {
  const t = useTranslations("home.hero");
  const tFilters = useTranslations("search.filters");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [discipline, setDiscipline] = useState(defaultDisciplineSlug ?? "");
  const [city, setCity] = useState(defaultCitySlug);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return;
    const target = discipline ? `/${city}/${discipline}` : `/${city}`;
    startTransition(() => {
      router.push(target);
    });
  };

  // Build the option arrays once per render — both pickers are
  // searchable, so the ordering doesn't matter for the user (cmdk
  // filters by query) but the original grouping shows up as section
  // headings in the dropdown.
  const disciplineOptions: ComboboxOption[] = useMemo(() => {
    const grouped = domains
      .map((domain) => ({
        domain,
        items: disciplines.filter((d) => d.domainSlug === domain.slug),
      }))
      .filter((g) => g.items.length > 0);
    return grouped.flatMap(({ domain, items }) =>
      items.map((d) => ({
        value: d.slug,
        label: pickLocalized(d.name, locale),
        group: pickLocalized(domain.name, locale),
      })),
    );
  }, [domains, disciplines, locale]);

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

  // Override the BrandCombobox trigger so it blends into the search-bar
  // pill (no border, no bg, no inner brand-tint — the surrounding card
  // already provides the visual container).
  const heroTriggerClass =
    "h-11 w-full rounded-lg border-0 bg-transparent px-0 text-base font-medium shadow-none hover:border-0 hover:bg-transparent focus-visible:ring-0";

  return (
    <form
      onSubmit={onSubmit}
      className="relative w-full"
      role="search"
      aria-label={t("title")}
    >
      <div
        className={cn(
          "rounded-2xl bg-card p-2 shadow-elevated ring-1 ring-border",
          "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1",
        )}
      >
        {/* Discipline */}
        <SearchField
          icon={<HugeiconsIcon icon={BookOpen01Icon} size={18} strokeWidth={1.7} />}
        >
          <BrandCombobox
            value={discipline}
            onChange={setDiscipline}
            options={disciplineOptions}
            placeholder={t("search_discipline_placeholder")}
            allLabel={t("search_discipline_placeholder")}
            searchPlaceholder={tFilters("search_placeholder")}
            emptyText={tFilters("search_empty")}
            ariaLabel={t("search_discipline_label")}
            triggerClassName={heroTriggerClass}
          />
        </SearchField>

        <div className="hidden h-7 w-px shrink-0 self-center bg-border sm:block" aria-hidden />

        {/* City */}
        <SearchField
          icon={
            <HugeiconsIcon icon={MapsLocation01Icon} size={18} strokeWidth={1.7} />
          }
        >
          <BrandCombobox
            value={city}
            onChange={setCity}
            options={cityOptions}
            placeholder={t("search_city_placeholder")}
            // No allLabel here — picking a city is required for the
            // search to resolve to a useful URL (`/<city>` minimum).
            searchPlaceholder={tFilters("search_placeholder")}
            emptyText={tFilters("search_empty")}
            ariaLabel={t("search_city_label")}
            triggerClassName={heroTriggerClass}
          />
        </SearchField>

        {/* Submit */}
        <Button
          type="submit"
          size="default"
          disabled={isPending || !city}
          className="h-11 shrink-0 gap-2 rounded-xl bg-action px-5 text-action-foreground shadow-action transition-colors hover:bg-action-hover sm:w-auto"
        >
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={2} />
          <span className="font-semibold">{t("search_button")}</span>
        </Button>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground sm:text-left">
        {t("or_skip")}{" "}
        <Link
          href="/ders-talebi"
          className="font-semibold text-brand underline-offset-2 hover:underline"
        >
          {t("or_skip_link")}
        </Link>
        .
      </p>
    </form>
  );
}

function SearchField({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-1 transition-colors hover:bg-secondary/40 has-[:focus-visible]:bg-secondary/40">
      <span
        className="grid size-6 shrink-0 place-items-center text-muted-foreground"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
