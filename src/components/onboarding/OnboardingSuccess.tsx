import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Success state after a teacher application is accepted by the mock
 * endpoint. Honest about the *next* steps — no fake "teacher #4321 is
 * now live" — because the actual approval is human-in-the-loop until
 * the verification flow ships.
 */
export function OnboardingSuccess() {
  const t = useTranslations("onboarding.success");

  return (
    <section className="space-y-6 py-12">
      <div className="space-y-3">
        <span
          aria-hidden
          className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} strokeWidth={2} />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-foreground">
          {t("what_next_title")}
        </h2>
        <ol className="mt-4 space-y-3 text-sm">
          {[1, 2, 3].map((step) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                {step}
              </span>
              <span className="leading-relaxed text-foreground">
                {t(`what_next_step${step}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 rounded-2xl"
        >
          <Link href="/">{t("back_home")}</Link>
        </Button>
        <Button
          asChild
          size="lg"
          className="h-12 rounded-2xl bg-brand text-primary-foreground hover:bg-brand/90"
        >
          <Link href="/gaziantep">{t("see_listings")}</Link>
        </Button>
      </div>
    </section>
  );
}
