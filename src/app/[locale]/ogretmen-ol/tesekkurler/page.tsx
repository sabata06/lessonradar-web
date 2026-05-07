import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Breadcrumb } from "@/components/discovery/Breadcrumb";
import { OnboardingSuccess } from "@/components/onboarding/OnboardingSuccess";

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
  const t = await getTranslations({ locale, namespace: "onboarding.success" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/ogretmen-ol/tesekkurler",
    title: t("meta_title"),
    description: t("meta_title"),
    // Confirmation pages add no SEO value and shouldn't be indexed —
    // mirrors the lead-form thank-you page policy.
    noindex: true,
  });
}

export default async function OnboardingSuccessPage({
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
            { label: t("breadcrumb"), href: "/ogretmen-ol" },
            { label: t("success.meta_title") },
          ]}
        />
      </Container>

      <Container>
        <OnboardingSuccess />
      </Container>
    </>
  );
}
