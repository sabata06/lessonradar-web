import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type {
  City,
  MarketplaceDiscipline,
  SupportedLocale,
} from "@/lib/types";
import { pickLocalized } from "@/lib/types";

interface RelatedLinksProps {
  locale: SupportedLocale;
  city: City;
  discipline: MarketplaceDiscipline;
  allCities: City[];
  allDisciplines: MarketplaceDiscipline[];
  className?: string;
}

/**
 * Cross-link grid for pSEO internal linking.
 *
 * Two columns:
 *   - Same discipline in other priority cities
 *   - Same city in other featured disciplines
 *
 * Capped to keep the link graph navigable and avoid bloated index hubs.
 */
export function RelatedLinks({
  locale,
  city,
  discipline,
  allCities,
  allDisciplines,
  className,
}: RelatedLinksProps) {
  const otherCities = allCities
    .filter((c) => c.isPriority && c.slug !== city.slug)
    .slice(0, 6);
  const otherDisciplines = allDisciplines
    .filter((d) => d.isFeatured && d.slug !== discipline.slug)
    .slice(0, 6);

  if (otherCities.length === 0 && otherDisciplines.length === 0) return null;

  const cityLabel = locale === "tr" ? city.nameTr : city.nameEn;
  const disciplineLabel = pickLocalized(discipline.name, locale);

  return (
    <section
      aria-label={locale === "tr" ? "İlgili aramalar" : "Related searches"}
      className={cn("grid gap-8 sm:grid-cols-2", className)}
    >
      {otherCities.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            {locale === "tr"
              ? `Başka şehirde ${disciplineLabel.toLowerCase()}`
              : `${disciplineLabel} in other cities`}
          </h2>
          <ul className="space-y-1.5">
            {otherCities.map((c) => (
              <RelatedLink
                key={c.slug}
                href={`/${c.slug}/${discipline.slug}`}
                label={`${locale === "tr" ? c.nameTr : c.nameEn} ${disciplineLabel}`}
              />
            ))}
          </ul>
        </div>
      )}

      {otherDisciplines.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            {locale === "tr"
              ? `${cityLabel}'de başka branşlar`
              : `Other subjects in ${cityLabel}`}
          </h2>
          <ul className="space-y-1.5">
            {otherDisciplines.map((d) => (
              <RelatedLink
                key={d.slug}
                href={`/${city.slug}/${d.slug}`}
                label={`${cityLabel} ${pickLocalized(d.name, locale)}`}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RelatedLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-card"
      >
        <span>{label}</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          strokeWidth={2}
          className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
        />
      </Link>
    </li>
  );
}
