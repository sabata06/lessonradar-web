import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { OnboardingHero } from "@/components/onboarding/OnboardingHero";
import { OnboardingValueProps } from "@/components/onboarding/OnboardingValueProps";
import { OnboardingHowItWorks } from "@/components/onboarding/OnboardingHowItWorks";
import { TeacherApplicationForm } from "@/components/onboarding/TeacherApplicationForm";

import { routing, type Locale } from "@/i18n/routing";
import { TR_CITIES, TR_DISTRICTS } from "@/lib/data/mock/cities";
import { MOCK_DISCIPLINES, MOCK_DOMAINS } from "@/lib/data/mock/disciplines";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { SupportedLocale } from "@/lib/types";

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
    // Indexable — this is a public, evergreen landing aimed at the
    // search query "öğretmen ol" / "özel ders öğretmenliği başvurusu".
    noindex: false,
  });
}

const FORM_ANCHOR_ID = "onboarding-form";
const HOW_ANCHOR_ID = "onboarding-how";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const supportedLocale = locale as SupportedLocale;

  const t = await getTranslations({ locale, namespace: "onboarding" });
  const tForm = await getTranslations({ locale, namespace: "onboarding.form" });

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
          formAnchor={`#${FORM_ANCHOR_ID}`}
          howAnchor={`#${HOW_ANCHOR_ID}`}
        />
        <OnboardingValueProps />
        <OnboardingHowItWorks id={HOW_ANCHOR_ID} />
      </Container>

      <Container className="pb-20">
        <section
          id={FORM_ANCHOR_ID}
          aria-labelledby="onboarding-form-title"
          className="scroll-mt-24 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-10"
        >
          <div>
            <header className="space-y-3 pb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                {tForm("kicker")}
              </p>
              <h2
                id="onboarding-form-title"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {tForm("title")}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {tForm("subtitle")}
              </p>
            </header>

            <TeacherApplicationForm
              locale={supportedLocale}
              domains={MOCK_DOMAINS}
              disciplines={MOCK_DISCIPLINES}
              cities={TR_CITIES}
              districts={TR_DISTRICTS}
            />
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
              <h3 className="text-sm font-semibold text-foreground">
                {t("how.title")}
              </h3>
              <ol className="space-y-2 text-sm">
                {(["one", "two", "three"] as const).map((step, i) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-foreground/80">
                      {t(`how.steps.${step}.title`)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("how.verification_note")}
              </p>
            </div>
          </aside>
        </section>

        <p className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {t("policy_notice")}
        </p>
      </Container>
    </>
  );
}
