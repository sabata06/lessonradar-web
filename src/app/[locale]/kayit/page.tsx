import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { RegisterForm } from "@/components/auth/RegisterForm";
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
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return buildPageMetadata({
    locale,
    path: "/kayit",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  const sp = await searchParams;
  const next = safeRedirect(sp.next);

  // Already authenticated → bounce away
  if (session) {
    redirect(next);
  }

  const t = await getTranslations("auth.register");

  // Localized legal page URLs (placeholder — these /yasal/* routes ship later).
  const legalUrls = {
    kvkk: `/${locale}/yasal/kvkk`,
    privacy: `/${locale}/yasal/gizlilik`,
    terms: `/${locale}/yasal/kosullar`,
  };

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
          <div className="flex justify-center">
            <GoogleSignInButton context="signup" next={next} />
          </div>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>{t("or_separator")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <RegisterForm next={next} legalUrls={legalUrls} />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("have_account")}{" "}
          <Link
            href={`/giris${sp.next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("login_link")}
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t.rich("teacher_note", {
            a: (chunks) => (
              <Link
                href="/ogretmen-ol"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </Container>
  );
}
