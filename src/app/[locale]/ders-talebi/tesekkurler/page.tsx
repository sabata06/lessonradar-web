import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { SuccessState } from "@/components/lead/SuccessState";

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
  const t = await getTranslations({ locale, namespace: "lead.success" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/ders-talebi/tesekkurler",
    title: t("meta_title"),
    description: t("subtitle"),
    noindex: true, // confirmation pages should never be indexed
  });
}

interface SearchParams {
  id?: string;
}

export default async function LeadSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const typedLocale = locale as Locale;

  return (
    <Container className="max-w-3xl py-12 sm:py-16 lg:py-20">
      <SuccessState locale={typedLocale} leadId={sp.id} />
    </Container>
  );
}
