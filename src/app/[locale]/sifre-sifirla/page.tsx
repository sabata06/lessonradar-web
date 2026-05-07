import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { routing, type Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.reset" });
  return buildPageMetadata({
    locale,
    path: "/sifre-sifirla",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const email = sanitizeEmail(sp.email) ?? "";

  const t = await getTranslations("auth.reset");

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          <ResetPasswordForm initialEmail={email} />
        </div>
      </div>
    </Container>
  );
}

function sanitizeEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
}
