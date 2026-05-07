import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { routing, type Locale } from "@/i18n/routing";
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
  const t = await getTranslations({ locale, namespace: "auth.verify" });
  return buildPageMetadata({
    locale,
    path: "/eposta-dogrula",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ email?: string; token?: string; next?: string }>;
}

export default async function VerifyEmailPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const email = sanitizeEmail(sp.email);
  const linkToken = sanitizeToken(sp.token);
  const next = safeRedirect(sp.next);

  const t = await getTranslations("auth.verify");

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
          <p className="mt-2 text-sm text-muted-foreground">
            {email
              ? t.rich("subtitle", {
                  email,
                  strong: (chunks) => (
                    <strong className="font-semibold text-foreground">{chunks}</strong>
                  ),
                })
              : t("subtitle_no_email")}
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          <VerifyEmailForm
            initialEmail={email ?? ""}
            linkToken={linkToken}
            next={next}
          />
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

function sanitizeToken(raw: string | undefined): string | null {
  if (!raw) return null;
  // Hex string up to 128 chars — defensive cap matching backend.
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(raw)) return null;
  return raw;
}
