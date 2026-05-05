import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import "../globals.css";
import { cn } from "@/lib/utils";
import { routing, type Locale } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomBar } from "@/components/layout/MobileBottomBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import { buildHreflangAlternates, buildLocaleUrl, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — ${t("tagline")}`,
      template: `%s · ${SITE_NAME}`,
    },
    description: t("tagline"),
    alternates: {
      canonical: buildLocaleUrl(locale, "/"),
      languages: buildHreflangAlternates("/"),
    },
    icons: { icon: "/favicon.ico" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "tr" ? "tr_TR" : "en_US",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} className={cn(sans.variable, mono.variable)}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
          >
            {tCommon("skip_to_content")}
          </a>
          <Header />
          <main id="main" className="flex min-h-[calc(100dvh-4rem)] flex-col pb-24 lg:pb-0">
            {children}
          </main>
          <Footer />
          <MobileBottomBar />
          <JsonLd data={websiteJsonLd(locale as Locale)} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
