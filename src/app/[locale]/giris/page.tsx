import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/cookies";
import { safeRedirect } from "@/lib/security/safe-redirect";
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
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return buildPageMetadata({
    locale,
    path: "/giris",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  const sp = await searchParams;
  const next = safeRedirect(sp.next);

  // Already authenticated → bounce to next (or home)
  if (session) {
    redirect(next);
  }

  const t = await getTranslations("auth.login");

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            {t("kicker")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("no_account")}{" "}
          <Link
            href={`/kayit${sp.next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("register_link")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
