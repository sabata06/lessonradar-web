import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  MessageAdd01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { CustomerLeadsSection } from "@/components/panel/CustomerLeadsSection";
import { CustomerMiniProfile } from "@/components/panel/CustomerMiniProfile";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchAccountSummary } from "@/lib/account/server";
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

  const user = await requireAuth({
    role: ["customer", "admin"],
    next: "/panel",
  });

  const t = await getTranslations("panel.customer");
  const tCommon = await getTranslations("panel.common");
  const [leads, summary] = await Promise.all([
    fetchCustomerLeads(),
    fetchAccountSummary(),
  ]);

  const greetingName = user.firstName?.trim() || user.email.split("@")[0];
  const profile = summary.kind === "ok" ? summary.data.profile : null;
  const customer = summary.kind === "ok" ? summary.data.customer : null;

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
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

        {profile ? (
          <CustomerMiniProfile profile={profile} customer={customer} />
        ) : null}

        <CustomerLeadsSection data={leads} locale={locale} />

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

interface ActionRowProps {
  icon: typeof MessageAdd01Icon;
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
