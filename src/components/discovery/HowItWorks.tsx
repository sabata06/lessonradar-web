import { getTranslations } from "next-intl/server";

const STEP_KEYS = ["one", "two", "three"] as const;

export async function HowItWorks() {
  const t = await getTranslations("home.how");

  return (
    <section aria-labelledby="how-heading" className="space-y-10">
      <div className="max-w-2xl space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          {t("kicker")}
        </p>
        <h2
          id="how-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
      </div>

      <ol className="grid gap-6 sm:grid-cols-3">
        {STEP_KEYS.map((key, idx) => (
          <li
            key={key}
            className="relative flex flex-col gap-3 rounded-2xl bg-card/60 p-6"
          >
            <span
              aria-hidden
              className="font-mono text-5xl font-bold leading-none tracking-tighter text-brand/15"
            >
              {String(idx + 1).padStart(2, "0")}
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {t(`steps.${key}.title`)}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`steps.${key}.description`)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
