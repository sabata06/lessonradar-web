import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  LockPasswordIcon,
  Notification03Icon,
  TranslateIcon,
  UserEdit01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { routing, type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
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
  const t = await getTranslations({ locale, namespace: "panel.settings" });
  return buildPageMetadata({
    locale,
    path: "/ayarlar",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Any authenticated role — settings is a shared surface for customer/teacher/admin.
  const user = await requireAuth({ next: "/ayarlar" });

  const t = await getTranslations("panel.settings");
  const tCommon = await getTranslations("panel.common");

  const greetingName = user.firstName?.trim() || user.email.split("@")[0];
  const supportEmail = t("danger_cta");

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {tCommon("greeting", { name: greetingName })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <section aria-labelledby="features-heading" className="space-y-4">
          <h2
            id="features-heading"
            className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("features_heading")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={UserEdit01Icon}
              title={t("features.profile_title")}
              description={t("features.profile_description")}
              soonLabel={tCommon("soon_pill")}
            />
            <FeatureCard
              icon={LockPasswordIcon}
              title={t("features.password_title")}
              description={t("features.password_description")}
              soonLabel={tCommon("soon_pill")}
            />
            <FeatureCard
              icon={Notification03Icon}
              title={t("features.notifications_title")}
              description={t("features.notifications_description")}
              soonLabel={tCommon("soon_pill")}
            />
            <FeatureCard
              icon={TranslateIcon}
              title={t("features.language_title")}
              description={t("features.language_description")}
              soonLabel={tCommon("soon_pill")}
            />
          </div>
        </section>

        <section
          aria-labelledby="danger-heading"
          className="space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-6 md:p-8"
        >
          <h2
            id="danger-heading"
            className="text-sm font-semibold uppercase tracking-wider text-destructive"
          >
            {t("danger_heading")}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <HugeiconsIcon icon={UserRemove01Icon} size={20} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t("danger_title")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("danger_description")}
                </p>
              </div>
            </div>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-card px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              {supportEmail}
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.5} />
            </a>
          </div>
        </section>
      </div>
    </Container>
  );
}

interface FeatureCardProps {
  icon: typeof UserEdit01Icon;
  title: string;
  description: string;
  soonLabel: string;
}

function FeatureCard({ icon, title, description, soonLabel }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
        </span>
        <span className="rounded-full bg-action/15 px-2.5 py-0.5 text-xs font-semibold text-action-foreground">
          {soonLabel}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
