import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountNav } from "@/components/account/AccountNav";
import { Container } from "@/components/layout/Container";
import { routing } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Shared shell for /ayarlar/*. Provides the header, sol-nav, and
 * `requireAuth` gate so sub-routes only own their own form/data.
 *
 * Layout-level auth is fine here even though Next.js memoizes layouts —
 * `force-dynamic` opts the entire subtree out of the cache so each request
 * re-runs the guard with the current session cookie.
 */
export default async function AyarlarLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireAuth({ next: "/ayarlar" });
  const t = await getTranslations("panel.settings");
  const tCommon = await getTranslations("panel.common");

  const greetingName = user.firstName?.trim() || user.email.split("@")[0];

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {tCommon("greeting", { name: greetingName })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </Container>
  );
}
