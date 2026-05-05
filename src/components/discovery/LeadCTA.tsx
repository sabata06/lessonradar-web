import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function LeadCTA() {
  const t = await getTranslations("home.lead_cta");

  return (
    <section
      aria-labelledby="lead-cta-heading"
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12"
    >
      {/* Decorative warm gradient — kept restrained, no neon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, oklch(0.94 0.025 195 / 0.7) 0%, transparent 60%)," +
            "radial-gradient(80% 60% at 0% 100%, oklch(0.96 0.04 80 / 0.6) 0%, transparent 60%)",
        }}
      />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {t("kicker")}
          </p>
          <h2
            id="lead-cta-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {t("title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="h-12 shrink-0 gap-2 bg-action px-6 text-action-foreground shadow-action transition-colors hover:bg-action-hover"
        >
          <Link href="/ders-talebi">
            <span className="font-semibold">{t("button")}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
          </Link>
        </Button>
      </div>
    </section>
  );
}
