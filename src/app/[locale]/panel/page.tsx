import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ClipboardIcon,
  Coins01Icon,
  InboxIcon,
  MessageAdd01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { CustomerLeadsSection } from "@/components/panel/CustomerLeadsSection";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchCustomerLeads } from "@/lib/lead/customer-leads";
import { buildPageMetadata } from "@/lib/seo/metadata";

// Auth-gated + per-user lead data; cannot be statically prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "panel.customer" });
  return buildPageMetadata({
    locale,
    path: "/panel",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function CustomerPanelPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Customer-or-admin only. Teachers bounce to /panel-ogretmen via roleHomepage.
  const user = await requireAuth({
    role: ["customer", "admin"],
    next: "/panel",
  });

  const t = await getTranslations("panel.customer");
  const tCommon = await getTranslations("panel.common");
  const leads = await fetchCustomerLeads();

  const greetingName = user.firstName?.trim() || user.email.split("@")[0];

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

        <CustomerLeadsSection data={leads} locale={locale} />

        <section aria-labelledby="features-heading" className="space-y-4">
          <h2
            id="features-heading"
            className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("features_heading")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              icon={InboxIcon}
              title={t("features.offers_title")}
              description={t("features.offers_description")}
              soonLabel={tCommon("soon_pill")}
            />
            <FeatureCard
              icon={ClipboardIcon}
              title={t("features.history_title")}
              description={t("features.history_description")}
              soonLabel={tCommon("soon_pill")}
            />
            <FeatureCard
              icon={Coins01Icon}
              title={t("features.payments_title")}
              description={t("features.payments_description")}
              soonLabel={tCommon("soon_pill")}
            />
          </div>
        </section>

        <section
          aria-labelledby="actions-heading"
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <h2
            id="actions-heading"
            className="text-base font-semibold text-foreground"
          >
            {t("actions_heading")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ActionRow
              icon={MessageAdd01Icon}
              title={t("action_request_title")}
              description={t("action_request_description")}
              cta={t("action_request_cta")}
              href="/ders-talebi"
              tone="action"
            />
            <ActionRow
              icon={Search01Icon}
              title={t("action_search_title")}
              description={t("action_search_description")}
              cta={t("action_search_cta")}
              href="/ara"
              tone="brand"
            />
          </div>
        </section>
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

interface ActionRowProps {
  icon: typeof InboxIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
  tone: "action" | "brand";
}

function ActionRow({
  icon,
  title,
  description,
  cta,
  href,
  tone,
}: ActionRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Button
        asChild
        className={
          tone === "action"
            ? "bg-action text-action-foreground shadow-action hover:bg-action/90"
            : "border border-primary/30 bg-card text-primary hover:bg-primary/5"
        }
      >
        <Link href={href}>
          <span className="inline-flex items-center gap-2">
            {cta}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.5} />
          </span>
        </Link>
      </Button>
    </div>
  );
}
