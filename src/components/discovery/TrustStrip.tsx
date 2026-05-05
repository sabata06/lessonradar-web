import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkBadge04Icon,
  Clock01Icon,
  MapsLocation01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

const ITEM_KEYS = ["verified", "fast", "local"] as const;
type ItemKey = (typeof ITEM_KEYS)[number];

const ICONS: Record<ItemKey, IconSvgElement> = {
  verified: CheckmarkBadge04Icon,
  fast: Clock01Icon,
  local: MapsLocation01Icon,
};

export async function TrustStrip() {
  const t = await getTranslations("home.trust");

  return (
    <section aria-labelledby="trust-heading" className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          {t("kicker")}
        </p>
        <h2
          id="trust-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {ITEM_KEYS.map((key) => (
          <li
            key={key}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
              <HugeiconsIcon icon={ICONS[key]} size={24} strokeWidth={1.7} />
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {t(`items.${key}.title`)}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`items.${key}.description`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
