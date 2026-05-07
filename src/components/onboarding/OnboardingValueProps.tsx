import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Coins01Icon,
  IdentificationIcon,
  MapsLocation01Icon,
  StarsIcon,
} from "@hugeicons/core-free-icons";

interface ValueItem {
  key: "no_fee" | "verified" | "local_demand" | "transparency";
  icon: React.ReactNode;
}

const ITEMS: ValueItem[] = [
  {
    key: "no_fee",
    icon: <HugeiconsIcon icon={Coins01Icon} size={22} strokeWidth={2} />,
  },
  {
    key: "verified",
    icon: <HugeiconsIcon icon={IdentificationIcon} size={22} strokeWidth={2} />,
  },
  {
    key: "local_demand",
    icon: <HugeiconsIcon icon={MapsLocation01Icon} size={22} strokeWidth={2} />,
  },
  {
    key: "transparency",
    icon: <HugeiconsIcon icon={StarsIcon} size={22} strokeWidth={2} />,
  },
];

/**
 * 4-card value-props grid. Mobile stacks single column; lg goes 4-up.
 * Cards stay calm: brand-soft icon plate, no decorative gradients per
 * DESIGN.md.
 */
export function OnboardingValueProps() {
  const t = useTranslations("onboarding.value_props");
  return (
    <section
      aria-labelledby="onboarding-vp-title"
      className="space-y-6 py-10 sm:py-12"
    >
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          {t("kicker")}
        </p>
        <h2
          id="onboarding-vp-title"
          className="max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon }) => (
          <li
            key={key}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground"
            >
              {icon}
            </span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {t(`items.${key}.title`)}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t(`items.${key}.description`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
