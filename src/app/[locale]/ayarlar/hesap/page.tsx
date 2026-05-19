import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import { DeleteAccountDialog } from "@/components/account/DeleteAccountDialog";
import { EmailVerificationCard } from "@/components/account/EmailVerificationCard";
import { LanguagePicker } from "@/components/account/LanguagePicker";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchAccountProfile } from "@/lib/account/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.settings.account",
  });
  return buildPageMetadata({
    locale,
    path: "/ayarlar/hesap",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AccountPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAuth({ next: "/ayarlar/hesap" });

  const t = await getTranslations("panel.settings.account");
  const result = await fetchAccountProfile();

  if (result.kind === "network_error") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{t("network_error")}</p>
      </div>
    );
  }
  if (result.kind !== "ok") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      </div>
    );
  }

  const { email, is_email_verified } = result.data;

  return (
    <div className="space-y-6">
      <EmailVerificationCard email={email} verified={is_email_verified} />
      <LanguagePicker />

      <section
        aria-labelledby="danger-zone-heading"
        className="space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 sm:p-6"
      >
        <header className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2
              id="danger-zone-heading"
              className="text-sm font-semibold text-destructive"
            >
              {t("danger.title")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("danger.description")}
            </p>
          </div>
        </header>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("danger.delete_title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("danger.delete_subtitle")}
            </p>
          </div>
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
