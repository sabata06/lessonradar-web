import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/types";

interface ProfileStickyCTAProps {
  teacherSlug: string;
  citySlug: string;
  primaryDisciplineSlug: string;
  pricingRange: { min: number; max: number } | null;
  locale: SupportedLocale;
}

/**
 * Mobile-only sticky bottom CTA for the profile route. Replaces the global
 * `MobileBottomBar` (which is hidden on /ogretmen/* paths) with a teacher-
 * scoped action that pre-fills the lead form.
 *
 * Server component — does not need client JS, the link is fully rendered
 * with the right query params at request time.
 */
export function ProfileStickyCTA({
  teacherSlug,
  citySlug,
  primaryDisciplineSlug,
  pricingRange,
  locale,
}: ProfileStickyCTAProps) {
  const t = useTranslations("profile.sticky");

  const requestHref =
    `/ders-talebi?` +
    new URLSearchParams({
      teacher: teacherSlug,
      city: citySlug,
      discipline: primaryDisciplineSlug,
    }).toString();

  const priceLabel = pricingRange
    ? t("from_price", {
        min: new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
          pricingRange.min,
        ),
        max: new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
          pricingRange.max,
        ),
      })
    : null;

  return (
    <div
      role="region"
      aria-label="Profile action"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        {priceLabel && (
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {priceLabel}
          </span>
        )}
        <Link
          href={requestHref}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-action px-5 text-sm font-semibold text-action-foreground shadow-action transition-colors hover:bg-action-hover"
        >
          {t("request_cta")}
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
