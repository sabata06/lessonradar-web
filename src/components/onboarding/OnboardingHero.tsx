import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

interface OnboardingHeroProps {
  /** Anchor target for the in-page form section. */
  formAnchor: string;
  /** Anchor target for the "how it works" section. */
  howAnchor: string;
}

/**
 * Top of /ogretmen-ol. Two CTAs stacked on mobile / inline on desktop —
 * primary is action-amber (jump to form), secondary is brand outline
 * (jump to "nasıl çalışır"). Both are hash anchors so the page stays a
 * single-document flow without router round-trips.
 */
export function OnboardingHero({ formAnchor, howAnchor }: OnboardingHeroProps) {
  const t = useTranslations("onboarding.hero");
  return (
    <header className="space-y-5 py-8 sm:py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
        {t("kicker")}
      </p>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {t("subtitle")}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          asChild
          size="lg"
          className="h-12 gap-2 rounded-2xl bg-action px-5 text-action-foreground shadow-action hover:bg-action-hover sm:w-auto"
        >
          <a href={formAnchor} className="inline-flex items-center justify-center gap-2">
            {t("cta_primary")}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} aria-hidden />
          </a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 rounded-2xl"
        >
          <a href={howAnchor}>{t("cta_secondary")}</a>
        </Button>
      </div>
    </header>
  );
}
