import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import type { City, MarketplaceDiscipline, SupportedLocale } from "@/lib/types";
import { pickLocalized } from "@/lib/types";
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";

interface PopularSearchesProps {
  locale: SupportedLocale;
  cities: City[];
  disciplines: MarketplaceDiscipline[];
}

/**
 * Internal-link grid for pSEO. Generates a curated set of city × discipline
 * combinations that should already (or eventually) carry seo_quality_score ≥ 80.
 * Only priority cities are linked so we don't dilute the index.
 */
export async function PopularSearches({
  locale,
  cities,
  disciplines,
}: PopularSearchesProps) {
  const t = await getTranslations("home.popular");

  const priorityCities = cities.filter((c) => c.isPriority);
  const featuredDisciplines = disciplines.filter((d) => d.isFeatured);

  // Cap output: each city × first 4 featured disciplines.
  const links = priorityCities.flatMap((city) =>
    featuredDisciplines.slice(0, 4).map((d) => ({
      href: `/${city.slug}/${toPseoDisciplinePathSlug(d.slug)}`,
      label: `${locale === "tr" ? city.nameTr : city.nameEn} ${pickLocalized(
        d.name,
        locale,
      )}`,
    })),
  );

  return (
    <section aria-labelledby="popular-heading" className="space-y-6">
      <div className="space-y-2">
        <h2
          id="popular-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-transparent bg-card/60 px-4 py-3 text-sm text-foreground transition-all hover:border-border hover:bg-card"
            >
              <span className="font-medium">{link.label}</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2}
                className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
