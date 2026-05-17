import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Calendar01Icon,
  Coins01Icon,
  InboxIcon,
} from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Link } from "@/i18n/navigation";
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
  const t = await getTranslations({ locale, namespace: "panel.teacher" });
  return buildPageMetadata({
    locale,
    path: "/panel-ogretmen",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function TeacherPanelPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Teacher-or-admin only. Customers bounce to /panel via roleHomepage.
  const user = await requireAuth({
    role: ["teacher", "admin"],
    next: "/panel-ogretmen",
  });

  const t = await getTranslations("panel.teacher");
  const tCommon = await getTranslations("panel.common");

  const greetingName = user.firstName?.trim() || user.email.split("@")[0];
  const supportEmail = t("support_email");

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
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCardLink
              href="/panel-ogretmen/talepler"
              icon={InboxIcon}
              title={t("features.requests_title")}
              description={t("features.requests_description")}
              actionLabel={t("features.requests_cta")}
            />
            <FeatureCard
              icon={Calendar01Icon}
              title={t("features.schedule_title")}
              description={t("features.schedule_description")}
              soonLabel={tCommon("soon_pill")}
            />
            <FeatureCard
              icon={Coins01Icon}
              title={t("features.earnings_title")}
              description={t("features.earnings_description")}
              soonLabel={tCommon("soon_pill")}
            />
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          {t("support_prefix")}{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
      </div>
    </Container>
  );
}

interface FeatureCardProps {
  icon: typeof InboxIcon;
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

/**
 * Live-feature variant of FeatureCard — replaces the "Yakında" pill with an
 * arrow CTA and wraps the whole tile in a Link. Used for the inbox card once
 * B7+B8 ships.
 */
interface FeatureCardLinkProps {
  href: string;
  icon: typeof InboxIcon;
  title: string;
  description: string;
  actionLabel: string;
}

function FeatureCardLink({
  href,
  icon,
  title,
  description,
  actionLabel,
}: FeatureCardLinkProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-primary/40 hover:bg-card/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition group-hover:translate-x-0.5">
          {actionLabel}
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2.5} />
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}
