import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { OnboardingAuthAwareCTA } from "@/components/onboarding/OnboardingAuthAwareCTA";
import { OnboardingHero } from "@/components/onboarding/OnboardingHero";
import { OnboardingValueProps } from "@/components/onboarding/OnboardingValueProps";
import { OnboardingHowItWorks } from "@/components/onboarding/OnboardingHowItWorks";

import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding.meta" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/ogretmen-ol",
    title: t("title"),
    description: t("description"),
    // Indexable — public, evergreen landing targeting "öğretmen ol".
    noindex: false,
  });
}

const HOW_ANCHOR_ID = "onboarding-how";
const APPLY_ANCHOR_ID = "onboarding-apply";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "onboarding" });

  return (
    <>
      <Container className="pt-6 pb-2 sm:pt-8">
        <Breadcrumb
          items={[
            { label: typedLocale === "tr" ? "Anasayfa" : "Home", href: "/" },
            { label: t("breadcrumb") },
          ]}
        />
      </Container>

      <Container className="space-y-2">
        <OnboardingHero
          formAnchor={`#${APPLY_ANCHOR_ID}`}
          howAnchor={`#${HOW_ANCHOR_ID}`}
        />
        <OnboardingValueProps />
        <OnboardingHowItWorks id={HOW_ANCHOR_ID} />
      </Container>

      <Container className="pb-20">
        <div id={APPLY_ANCHOR_ID} className="scroll-mt-24">
          <OnboardingAuthAwareCTA
            defaultApplySection={
              <section
                aria-labelledby="onboarding-apply-title"
                className="rounded-3xl border border-border bg-card p-8 shadow-card sm:p-10"
              >
                <div className="max-w-2xl space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                    {t("apply.kicker")}
                  </p>
                  <h2
                    id="onboarding-apply-title"
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                  >
                    {t("apply.title")}
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t("apply.body")}
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-foreground/85">
                    <li>• {t("apply.bullet_autosave")}</li>
                    <li>• {t("apply.bullet_review")}</li>
                    <li>• {t("apply.bullet_publish")}</li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/ogretmen-ol/olusturma"
                      className="inline-flex h-12 items-center gap-2 rounded-2xl bg-action px-6 text-sm font-semibold text-action-foreground shadow-action transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {t("apply.cta")}
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={16}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </Link>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t("apply.cta_helper")}
                    </p>
                  </div>
                </div>
              </section>
            }
          />
        </div>

        <p className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {t("policy_notice")}
        </p>
      </Container>
    </>
  );
}
