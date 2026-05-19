import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  MailAdd01Icon,
  GoogleIcon,
  Mail01Icon,
  AppleIcon,
} from "@hugeicons/core-free-icons";

type IconType = typeof Mail01Icon;

import { AvatarUpload } from "@/components/account/AvatarUpload";
import { ProfileForm } from "@/components/account/ProfileForm";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchAccountSummary } from "@/lib/account/server";
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
    namespace: "panel.settings.profile",
  });
  return buildPageMetadata({
    locale,
    path: "/ayarlar/profil",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

const PROVIDER_ICON: Record<string, IconType> = {
  email: Mail01Icon,
  google: GoogleIcon,
  apple: AppleIcon,
};

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAuth({ next: "/ayarlar/profil" });

  const t = await getTranslations("panel.settings.profile");
  const summary = await fetchAccountSummary();

  if (summary.kind === "network_error") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{t("network_error")}</p>
      </div>
    );
  }
  if (summary.kind !== "ok") {
    // requireAuth already caught unauthorized; forbidden / not_found here are
    // edge cases (admin viewing without a customer row, etc.) — render an
    // explanatory shell instead of crashing.
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      </div>
    );
  }

  const { profile, customer } = summary.data;
  const fallbackName = profile.first_name || profile.email.split("@")[0];

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="profile-photo-heading"
        className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <h2
          id="profile-photo-heading"
          className="text-sm font-semibold text-foreground"
        >
          {t("sections.photo.title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("sections.photo.description")}
        </p>
        <div className="mt-4">
          <AvatarUpload
            initialImageUrl={
              customer?.profile_image_url || profile.profile_image_url
            }
            fallbackName={fallbackName}
          />
        </div>
      </section>

      <ProfileStatusCard
        emailVerified={profile.is_email_verified}
        authMethods={profile.auth_methods}
      />

      <ProfileForm profile={profile} customer={customer} />
    </div>
  );
}

async function ProfileStatusCard({
  emailVerified,
  authMethods,
}: {
  emailVerified: boolean;
  authMethods: string[];
}) {
  const t = await getTranslations("panel.settings.profile.status");
  const tProviders = await getTranslations("account.providers");

  return (
    <section
      aria-labelledby="profile-status-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <h2
        id="profile-status-heading"
        className="text-sm font-semibold text-foreground"
      >
        {t("title")}
      </h2>
      <dl className="mt-4 divide-y divide-border">
        <Row
          label={t("login_method_label")}
          value={
            <div className="flex flex-wrap items-center gap-2">
              {authMethods.length === 0 ? (
                <ProviderPill provider="email" label={tProviders("email")} />
              ) : (
                authMethods.map((provider) => (
                  <ProviderPill
                    key={provider}
                    provider={provider}
                    label={
                      (
                        ["email", "google", "apple"] as const
                      ).includes(provider as "email" | "google" | "apple")
                        ? tProviders(provider as "email" | "google" | "apple")
                        : provider
                    }
                  />
                ))
              )}
            </div>
          }
        />
        <Row
          label={t("email_verified_label")}
          value={
            emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={12}
                  strokeWidth={2.5}
                />
                {t("email_verified_yes")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-action/15 px-2.5 py-0.5 text-xs font-semibold text-action-foreground">
                <HugeiconsIcon
                  icon={MailAdd01Icon}
                  size={12}
                  strokeWidth={2.5}
                />
                {t("email_verified_no")}
              </span>
            )
          }
        />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ProviderPill({
  provider,
  label,
}: {
  provider: string;
  label: string;
}) {
  const icon = PROVIDER_ICON[provider] ?? Mail01Icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <HugeiconsIcon icon={icon} size={12} strokeWidth={2} />
      {label}
    </span>
  );
}
