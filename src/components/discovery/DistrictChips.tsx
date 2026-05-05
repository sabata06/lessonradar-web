import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { District, SupportedLocale } from "@/lib/types";

interface DistrictChipsProps {
  districts: District[];
  citySlug: string;
  disciplineSlug: string;
  locale: SupportedLocale;
  className?: string;
}

/**
 * District-level pSEO links shown ABOVE the listing.
 * Each chip routes to /[city]/[district]/[discipline] (Faz 3+ extension).
 * For now we link to the same city-discipline route as a stub — the route
 * will be added when district pages have enough data to indexable.
 */
export function DistrictChips({
  districts,
  citySlug,
  disciplineSlug,
  locale,
  className,
}: DistrictChipsProps) {
  if (districts.length === 0) return null;

  // Priority districts first
  const sorted = [...districts].sort((a, b) => {
    const ap = a.isPriority ? 0 : 1;
    const bp = b.isPriority ? 0 : 1;
    return ap - bp;
  });

  return (
    <nav
      aria-label={locale === "tr" ? "İlçeye göre filtrele" : "Filter by district"}
      className={cn(
        "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ul className="flex gap-2 sm:flex-wrap">
        {sorted.map((d) => (
          <li key={d.slug} className="shrink-0">
            <Link
              href={`/${citySlug}/${disciplineSlug}?district=${d.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-soft-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {locale === "tr" ? d.nameTr : d.nameEn}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
