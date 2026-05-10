import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

export interface FaqItem {
  question: string;
  answer: string;
}

interface PSEOFaqProps {
  items: FaqItem[];
}

/**
 * Discipline-aware FAQ for pSEO landing pages. Renders as native
 * `<details>` so it ships zero JS, has correct `aria-expanded` semantics,
 * and survives `prefers-reduced-motion` without extra wiring.
 *
 * Copy comes from i18n (`pseo.faq.common.*` plus optional discipline
 * overrides) and is interpolated with city/discipline/stats by the caller
 * via `buildPSEOFaqItems()`. We do NOT call OpenAI here — every Q&A is
 * deterministic, real-data-aware copy.
 */
export function PSEOFaq({ items }: PSEOFaqProps) {
  const t = useTranslations("pseo.faq");
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="pseo-faq-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
    >
      <header className="mb-5 space-y-1">
        <h2
          id="pseo-faq-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {t("heading")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <ul className="divide-y divide-border/60">
        {items.map((item, i) => (
          <li key={i}>
            <details className="group py-2">
              <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-3 py-3 text-base font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <span className="flex-1">{item.question}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={18}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="pb-4 pr-8 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
