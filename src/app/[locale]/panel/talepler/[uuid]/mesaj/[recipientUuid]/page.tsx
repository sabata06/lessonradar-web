import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { ThreadView } from "@/components/messages/ThreadView";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchCustomerLeadDetail } from "@/lib/lead/customer-lead-detail";
import { fetchThreadServer } from "@/lib/messages/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * `/panel/talepler/[uuid]/mesaj/[recipientUuid]` — single B8 thread view.
 *
 * Server pre-fetches the first messages page so the user sees content on
 * initial paint. Client polls every 10s after that via the BFF. Connect
 * state is owned by the parent lead detail page; this view's only job is
 * messaging.
 *
 * Authorization model: requireAuth (customer/admin) → load lead → confirm
 * the recipient belongs to it → look up the corresponding offer (responded
 * status) → use its thread.uuid to fetch the messages. 404 collapses
 * unauthorized and missing alike, matching the parent page.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; uuid: string; recipientUuid: string }>;
}): Promise<Metadata> {
  const { locale, uuid, recipientUuid } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.customer.leads.detail.thread",
  });
  return buildPageMetadata({
    locale,
    path: `/panel/talepler/${uuid}/mesaj/${recipientUuid}`,
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale; uuid: string; recipientUuid: string }>;
}

export default async function CustomerLeadThreadPage({ params }: PageProps) {
  const { locale, uuid, recipientUuid } = await params;
  setRequestLocale(locale);

  await requireAuth({
    role: ["customer", "admin"],
    next: `/panel/talepler/${uuid}/mesaj/${recipientUuid}`,
  });

  // First resolve the lead so we can find the recipient's thread uuid
  // without exposing a separate lookup endpoint. Lead BOLA scoping at the
  // backend already prevents cross-customer enumeration.
  const leadOutcome = await fetchCustomerLeadDetail(uuid);
  if (!leadOutcome.ok) {
    if (
      leadOutcome.reason === "not_found" ||
      leadOutcome.reason === "forbidden" ||
      leadOutcome.reason === "unauthorized"
    ) {
      notFound();
    }
    return <NetworkErrorState locale={locale} />;
  }
  const lead = leadOutcome.data;
  const offer = lead.offers.find((o) => o.uuid === recipientUuid);
  if (!offer || !offer.thread) {
    notFound();
  }

  const threadOutcome = await fetchThreadServer(offer.thread.uuid);
  if (!threadOutcome.ok) {
    if (
      threadOutcome.reason === "not_found" ||
      threadOutcome.reason === "forbidden" ||
      threadOutcome.reason === "unauthorized"
    ) {
      notFound();
    }
    return <NetworkErrorState locale={locale} />;
  }

  const t = await getTranslations({
    locale,
    namespace: "panel.customer.leads.detail.thread",
  });

  return (
    <Container className="py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <ThreadView
          initial={threadOutcome.data}
          leadUuid={uuid}
          recipientUuid={recipientUuid}
          labels={{
            backToLead: t("back_to_lead"),
            headerTitleWith: t("header_title_with"),
            connectionState: {
              in_app: t("connection_state.in_app"),
              revealed: t("connection_state.revealed"),
              closed: t("connection_state.closed"),
            },
            placeholder: t("placeholder"),
            placeholderClosed: t("placeholder_closed"),
            send: t("send"),
            sending: t("sending"),
            charCount: t("char_count"),
            empty: t("empty"),
            you: t("you"),
            seen: t("seen"),
            moderation: {
              title: t("moderation.title"),
              description: t("moderation.description"),
              flagPhone: t("moderation.flag_phone"),
              flagIban: t("moderation.flag_iban"),
              flagEmail: t("moderation.flag_email"),
              cancel: t("moderation.cancel"),
              confirm: t("moderation.confirm"),
              confirming: t("moderation.confirming"),
            },
            errors: {
              empty_body: t("errors.empty_body"),
              body_too_long: t("errors.body_too_long"),
              thread_closed: t("errors.thread_closed"),
              lead_cancelled: t("errors.lead_cancelled"),
              throttle_message_send: t("errors.throttle_message_send"),
              unauthorized: t("errors.unauthorized"),
              forbidden: t("errors.forbidden"),
              not_found: t("errors.not_found"),
              network_error: t("errors.network_error"),
              upstream_error: t("errors.upstream_error"),
              validation_failed: t("errors.validation_failed"),
            },
          }}
        />
      </div>
    </Container>
  );
}

async function NetworkErrorState({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "panel.customer.leads.detail.thread",
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
      </div>
    </Container>
  );
}
