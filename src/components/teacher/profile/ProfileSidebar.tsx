import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { SupportedLocale } from "@/lib/types";

function formatPlainNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value);
}

interface ProfileSidebarProps {
  teacherSlug: string;
  citySlug: string;
  primaryDisciplineSlug: string;
  pricingRange: { min: number; max: number } | null;
  locale: SupportedLocale;
}

/**
 * Sticky desktop sidebar. Carries the only action-amber CTA on the page,
 * pre-filled with discipline + city + teacher slug so the lead form can
 * skip the user re-entering known fields.
 *
 * Hidden on mobile — `ProfileStickyCTA` covers that breakpoint and the two
 * never need to render simultaneously.
 */
export function ProfileSidebar({
  teacherSlug,
  citySlug,
  primaryDisciplineSlug,
  pricingRange,
  locale,
}: ProfileSidebarProps) {
  const t = useTranslations("profile.sidebar");

  const requestHref =
    `/ders-talebi?` +
    new URLSearchParams({
      teacher: teacherSlug,
      city: citySlug,
      discipline: primaryDisciplineSlug,
    }).toString();

  const priceLine = pricingRange
    ? pricingRange.min === pricingRange.max
      ? t("price_value_single", {
          value: formatPlainNumber(pricingRange.min, locale),
        })
      : t("price_value", {
          min: formatPlainNumber(pricingRange.min, locale),
          max: formatPlainNumber(pricingRange.max, locale),
        })
    : null;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        {priceLine && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("price_from")}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{priceLine}</p>
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("request_pretext")}
        </p>

        <Button
          asChild
          size="lg"
          className="h-12 w-full gap-2 bg-action text-action-foreground shadow-action hover:bg-action-hover"
        >
          <Link href={requestHref} className="inline-flex items-center justify-center gap-2">
            {t("request_cta")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
