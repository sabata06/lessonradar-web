import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { routing, type Locale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/cookies";
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
  const t = await getTranslations({ locale, namespace: "auth.forgot" });
  return buildPageMetadata({
    locale,
    path: "/sifremi-unuttum",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function ForgotPasswordPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already authenticated → bounce home (would be silly to reset your own pw
  // while logged in; user can change it from /ayarlar instead).
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const t = await getTranslations("auth.forgot");

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
          <ForgotPasswordForm />
        </div>
      </div>
    </Container>
  );
}
