import { useTranslations } from "next-intl";

/**
 * "Üç adımda yayında" how-it-works section. Numbered cards with explicit
 * verification honesty: a footer note that document upload is not yet
 * automated. Critical for trust — overpromising verification timelines
 * is the fastest way to lose teacher trust on first contact.
 */
export function OnboardingHowItWorks({ id }: { id: string }) {
  const t = useTranslations("onboarding.how");

  return (
    <section
      id={id}
      aria-labelledby="onboarding-how-title"
      className="scroll-mt-24 space-y-6 py-10 sm:py-12"
    >
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          {t("kicker")}
        </p>
        <h2
          id="onboarding-how-title"
          className="max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
      </header>

      <ol className="grid gap-3 sm:grid-cols-3">
        {(["one", "two", "three"] as const).map((step, i) => (
          <li
            key={step}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {t(`steps.${step}.title`)}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t(`steps.${step}.description`)}
            </p>
          </li>
        ))}
      </ol>

      <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {t("verification_note")}
      </p>
    </section>
  );
}
