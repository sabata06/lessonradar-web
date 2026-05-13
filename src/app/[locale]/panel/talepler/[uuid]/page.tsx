import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { CancelLeadSection } from "@/components/panel/CancelLeadSection";
import { LeadDetailSummary } from "@/components/panel/LeadDetailSummary";
import { LeadOffersList } from "@/components/panel/LeadOffersList";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchCustomerLeadDetail } from "@/lib/lead/customer-lead-detail";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * `/panel/talepler/[uuid]` — authenticated customer's single-lead detail with
 * offer comparison + cancel surface.
 *
 * Notes
 * - `force-dynamic`: payload is per-user and includes recipient-status data
 *   we never want cached at the CDN layer.
 * - `noindex`: every panel surface is private. Even though `requireAuth` would
 *   bounce a crawler away, the explicit meta prevents the URL appearing in
 *   any leaked referrer chain or accidental sitemap.
 * - 404 collapses to `notFound()` — backend already enforces BOLA scoping,
 *   so "you cannot see this" and "this doesn't exist" surface identically
 *   (enumeration safe).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; uuid: string }>;
}): Promise<Metadata> {
  const { locale, uuid } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.customer.leads.detail",
  });
  return buildPageMetadata({
    locale,
    path: `/panel/talepler/${uuid}`,
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale; uuid: string }>;
}

export default async function CustomerLeadDetailPage({ params }: PageProps) {
  const { locale, uuid } = await params;
  setRequestLocale(locale);

  await requireAuth({
    role: ["customer", "admin"],
    next: `/panel/talepler/${uuid}`,
  });

  const outcome = await fetchCustomerLeadDetail(uuid);
  if (!outcome.ok) {
    if (outcome.reason === "not_found" || outcome.reason === "forbidden") {
      notFound();
    }
    if (outcome.reason === "unauthorized") {
      // Edge case: session valid for requireAuth but Django re-rejected the
      // bearer (e.g. user just deleted on the server). Treat as 404 for the
      // customer — they shouldn't see internal session details.
      notFound();
    }
    return <NetworkErrorState locale={locale} uuid={uuid} />;
  }

  const lead = outcome.data;
  const nowIso = new Date().toISOString();

  return (
    <Container className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <LeadDetailSummary lead={lead} locale={locale} />
        <LeadOffersList lead={lead} locale={locale} nowIso={nowIso} />
        <CancelLeadSection lead={lead} />
      </div>
    </Container>
  );
}

async function NetworkErrorState({
  locale,
  uuid,
}: {
  locale: Locale;
  uuid: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "panel.customer.leads.detail",
  });
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">
          {t("network_error_title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("network_error_body")}
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/70">
          ref: {uuid.slice(0, 8)}
        </p>
      </div>
    </Container>
  );
}
