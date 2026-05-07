import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatHourlyRange } from "@/lib/format";
import { pickLocalized, type SupportedLocale } from "@/lib/types";
import type { TeacherDisciplineView } from "@/lib/data/profile";

interface ProfileDisciplinesProps {
  views: TeacherDisciplineView[];
  citySlug: string;
  locale: SupportedLocale;
}

/**
 * Per-discipline pricing list. Each row links to the city × discipline
 * pSEO landing where the user can compare this teacher with peers — also
 * gives Google a clean internal-link path between the profile and
 * indexable category pages, reinforcing topical relevance for the
 * discipline keyword.
 */
export function ProfileDisciplines({
  views,
  citySlug,
  locale,
}: ProfileDisciplinesProps) {
  const t = useTranslations("profile.disciplines");
  if (views.length === 0) return null;

  return (
    <section
      aria-labelledby="profile-disciplines-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="profile-disciplines-title"
            className="text-lg font-semibold text-foreground sm:text-xl"
          >
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      <ul className="mt-4 divide-y divide-border">
        {views.map(({ discipline, pricing, isPrimary }) => {
          const name = pickLocalized(discipline.name, locale);
          const description = discipline.description
            ? pickLocalized(discipline.description, locale)
            : null;
          const href = `/${citySlug}/${discipline.slug}`;
          const priceLabel = formatHourlyRange(
            pricing.hourlyMin,
            pricing.hourlyMax,
            locale,
          );
          return (
            <li key={discipline.slug} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {name}
                    </h3>
                    {isPrimary && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-soft-foreground">
                        {t("primary_pill")}
                      </span>
                    )}
                  </div>
                  {description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {description}
                    </p>
                  )}
                  <Link
                    href={href}
                    className={cn(
                      "mt-1.5 inline-flex min-h-[44px] items-center gap-1 -mx-1 px-1 text-xs font-medium text-brand transition-colors hover:text-brand/80",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded",
                    )}
                  >
                    {t("view_listing", { discipline: name })}
                    <HugeiconsIcon
                      icon={ArrowUpRight01Icon}
                      size={14}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold text-foreground">
                  {priceLabel}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
