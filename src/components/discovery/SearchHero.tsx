"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, MapsLocation01Icon, BookOpen01Icon } from "@hugeicons/core-free-icons";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { City, MarketplaceDiscipline, MarketplaceDomain, SupportedLocale } from "@/lib/types";
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

  const grouped = domains
    .map((domain) => ({
      domain,
      items: disciplines.filter((d) => d.domainSlug === domain.slug),
    }))
    .filter((g) => g.items.length > 0);

  const priorityCities = cities.filter((c) => c.isPriority);
  const otherCities = cities.filter((c) => !c.isPriority);

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
          <Select value={discipline} onValueChange={setDiscipline}>
            <SelectTrigger
              size="default"
              aria-label={t("search_discipline_label")}
              className="h-11 w-full rounded-lg border-0 bg-transparent px-0 text-base font-medium shadow-none outline-none focus-visible:ring-0"
            >
              <SelectValue placeholder={t("search_discipline_placeholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {grouped.map(({ domain, items }) => (
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
        </SearchField>

        <div className="hidden h-7 w-px shrink-0 self-center bg-border sm:block" aria-hidden />

        {/* City */}
        <SearchField
          icon={<HugeiconsIcon icon={MapsLocation01Icon} size={18} strokeWidth={1.7} />}
        >
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger
              size="default"
              aria-label={t("search_city_label")}
              className="h-11 w-full rounded-lg border-0 bg-transparent px-0 text-base font-medium shadow-none outline-none focus-visible:ring-0"
            >
              <SelectValue placeholder={t("search_city_placeholder")} />
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
    <label className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-1 transition-colors hover:bg-secondary/40 has-[:focus-visible]:bg-secondary/40">
      <span className="grid size-6 shrink-0 place-items-center text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}
