import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
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
    namespace: "panel.settings.password",
  });
  return buildPageMetadata({
    locale,
    path: "/ayarlar/sifre",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function PasswordPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAuth({ next: "/ayarlar/sifre" });

  const t = await getTranslations("panel.settings.password");
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

  const hasUsablePassword = result.data.has_usable_password;
  const isOAuthProvider =
    result.data.auth_provider === "google" ||
    result.data.auth_provider === "apple";

  return (
    <div className="space-y-6">
      {!hasUsablePassword && isOAuthProvider ? (
        <aside
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={18}
              strokeWidth={2}
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {t("oauth_notice.title", {
                provider:
                  result.data.auth_provider === "google" ? "Google" : "Apple",
              })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("oauth_notice.body")}
            </p>
          </div>
        </aside>
      ) : null}

      <ChangePasswordForm hasUsablePassword={hasUsablePassword} />
    </div>
  );
}
