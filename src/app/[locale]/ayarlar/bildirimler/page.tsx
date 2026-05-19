import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotificationsForm } from "@/components/account/NotificationsForm";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchNotificationPreferences } from "@/lib/account/server";
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
    namespace: "panel.settings.notifications",
  });
  return buildPageMetadata({
    locale,
    path: "/ayarlar/bildirimler",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAuth({ next: "/ayarlar/bildirimler" });

  const t = await getTranslations("panel.settings.notifications");
  const result = await fetchNotificationPreferences();

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

  return <NotificationsForm initial={result.data} />;
}
