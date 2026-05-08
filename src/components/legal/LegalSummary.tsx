import { useTranslations } from "next-intl";

import type { LegalSlug } from "@/lib/data/legal";

interface LegalSummaryProps {
  slug: LegalSlug;
}

/**
 * Plain-language "in short" panel — the differentiator vs. TR competitor
 * legal pages, which dump 8000 words of boilerplate without a lede. We
 * surface 3–4 bullets per document at the top so a reader can decide
 * whether they need to read the full text.
 *
 * Copy lives in the i18n `legal.summary.<slug>.bullets` array; if the
 * key is missing or empty the panel renders nothing (graceful fallback
 * for new documents that don't have a summary yet).
 */
export function LegalSummary({ slug }: LegalSummaryProps) {
  const t = useTranslations("legal.summary");
  const bullets = t.raw(`${slug}.bullets`);

  if (!Array.isArray(bullets) || bullets.length === 0) return null;

  return (
    <section
      aria-label={t("aria_label")}
      className="mb-10 rounded-2xl bg-brand-soft p-6 text-brand-soft-foreground sm:p-7"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-70">
        {t("kicker")}
      </p>
      <h2 className="mb-4 text-base font-semibold leading-snug sm:text-lg">
        {t(`${slug}.title`)}
      </h2>
      <ul className="space-y-2 text-sm leading-relaxed sm:text-[0.95rem]">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-brand-soft-foreground/60"
            />
            <span>{String(bullet)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
