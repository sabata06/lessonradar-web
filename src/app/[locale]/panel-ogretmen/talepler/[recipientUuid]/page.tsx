import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { ThreadView } from "@/components/messages/ThreadView";
import { DeclineLeadButton } from "@/components/panel-teacher/DeclineLeadButton";
import { TeacherLeadDeclinedBanner } from "@/components/panel-teacher/TeacherLeadDeclinedBanner";
import { TeacherLeadDetailSummary } from "@/components/panel-teacher/TeacherLeadDetailSummary";
import {
  TeacherLeadRespond,
  type TeacherLeadRespondLabels,
} from "@/components/panel-teacher/TeacherLeadRespond";
import { TeacherInboxLockNotice } from "@/components/panel-teacher/TeacherInboxRowParts";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { fetchThreadServer } from "@/lib/messages/server";
import { fetchTeacherLeadByRecipient } from "@/lib/teacher-leads/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * `/panel-ogretmen/talepler/[recipientUuid]` — single lead detail with state
 * branching:
 *   - `pending` & `can_respond=true`   → Respond panel (inline mobile, Sheet desktop) + Decline button
 *   - `pending` & `can_respond=false`  → Lock notice (e.g. quota_exceeded, not_visible_yet)
 *   - `responded` & `thread_uuid`      → Embedded ThreadView (viewerRole="teacher")
 *   - `declined`                       → DeclinedBanner
 *   - `expired`                        → Lock notice variant
 *
 * 404 collapse on not_found/forbidden/unauthorized — enumeration-safe.
 * Network errors render a soft state card. Mirrors the customer detail page.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; recipientUuid: string }>;
}): Promise<Metadata> {
  const { locale, recipientUuid } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.teacher.lead",
  });
  return buildPageMetadata({
    locale,
    path: `/panel-ogretmen/talepler/${recipientUuid}`,
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale; recipientUuid: string }>;
}

export default async function TeacherLeadDetailPage({ params }: PageProps) {
  const { locale, recipientUuid } = await params;
  setRequestLocale(locale);

  await requireAuth({
    role: ["teacher", "admin"],
    next: `/panel-ogretmen/talepler/${recipientUuid}`,
  });

  const outcome = await fetchTeacherLeadByRecipient(recipientUuid);
  if (!outcome.ok) {
    if (
      outcome.reason === "not_found" ||
      outcome.reason === "forbidden" ||
      outcome.reason === "unauthorized"
    ) {
      notFound();
    }
    return <NetworkErrorState locale={locale} />;
  }

  const row = outcome.row;
  const t = await getTranslations("panel.teacher.lead");
  const tInbox = await getTranslations("panel.teacher.inbox");
  const tRespond = await getTranslations("panel.teacher.respond");
  const tDecline = await getTranslations("panel.teacher.decline");
  const tThread = await getTranslations("panel.teacher.thread");

  const responded = row.status === "responded";
  const declined = row.status === "declined";
  const expired = row.status === "expired";
  const showRespond = !responded && !declined && !expired && row.can_respond;
  const showLockNotice =
    !responded &&
    !declined &&
    !expired &&
    !row.can_respond &&
    Boolean(row.response_locked_reason);

  // SSR-prefetch thread when responded so the embedded ThreadView paints with
  // server-rendered messages. Defensive: if backend says responded but no
  // thread_uuid (invariant violation), we render the declined-banner pattern
  // with a debug ref so the user isn't left on a blank screen.
  const threadOutcome =
    responded && row.thread_uuid
      ? await fetchThreadServer(row.thread_uuid)
      : null;

  const respondLabels: TeacherLeadRespondLabels = {
    title: tRespond("title"),
    subtitle: tRespond("subtitle"),
    openCta: tRespond("open_cta"),
    sheetTitle: tRespond("sheet_title"),
    label: tRespond("label"),
    placeholder: tRespond("placeholder"),
    hint: tRespond("hint"),
    charCount: tRespond("char_count"),
    submit: tRespond("submit"),
    submitting: tRespond("submitting"),
    errors: {
      unauthorized: tRespond("errors.unauthorized"),
      forbidden: tRespond("errors.forbidden"),
      email_unverified: tRespond("errors.email_unverified"),
      not_found: tRespond("errors.not_found"),
      empty_body: tRespond("errors.empty_body"),
      body_too_long: tRespond("errors.body_too_long"),
      quota_exceeded: tRespond("errors.quota_exceeded"),
      lead_cancelled: tRespond("errors.lead_cancelled"),
      lead_completed: tRespond("errors.lead_completed"),
      lead_expired: tRespond("errors.lead_expired"),
      already_responded: tRespond("errors.already_responded"),
      already_declined: tRespond("errors.already_declined"),
      not_visible_yet: tRespond("errors.not_visible_yet"),
      recipient_inactive: tRespond("errors.recipient_inactive"),
      throttle_respond: tRespond("errors.throttle_respond"),
      validation_failed: tRespond("errors.validation_failed"),
      upstream_error: tRespond("errors.upstream_error"),
      network_error: tRespond("errors.network_error"),
    },
  };

  const declineLabels = {
    trigger: tDecline("trigger"),
    title: tDecline("title"),
    description: tDecline("description"),
    reason_label: tDecline("reason_label"),
    reason_placeholder: tDecline("reason_placeholder"),
    reason_hint: tDecline("reason_hint"),
    cancel: tDecline("cancel"),
    confirm: tDecline("confirm"),
    confirming: tDecline("confirming"),
    error: {
      unauthorized: tDecline("errors.unauthorized"),
      forbidden: tDecline("errors.forbidden"),
      not_found: tDecline("errors.not_found"),
      already_declined: tDecline("errors.already_declined"),
      already_responded: tDecline("errors.already_responded"),
      lead_cancelled: tDecline("errors.lead_cancelled"),
      lead_completed: tDecline("errors.lead_completed"),
      lead_expired: tDecline("errors.lead_expired"),
      recipient_inactive: tDecline("errors.recipient_inactive"),
      validation_failed: tDecline("errors.validation_failed"),
      upstream_error: tDecline("errors.upstream_error"),
      network_error: tDecline("errors.network_error"),
    },
  };

  return (
    <Container className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <TeacherLeadDetailSummary row={row} locale={locale} />

        {showRespond ? (
          <div className="space-y-3">
            <TeacherLeadRespond
              recipientUuid={row.uuid}
              labels={respondLabels}
            />
            <div className="flex justify-end">
              <DeclineLeadButton
                recipientUuid={row.uuid}
                variant="detail"
                labels={declineLabels}
              />
            </div>
          </div>
        ) : null}

        {showLockNotice ? (
          <TeacherInboxLockNotice
            label={tInbox(
              `lock_reason.${row.response_locked_reason}`,
              { defaultValue: row.response_locked_reason },
            )}
          />
        ) : null}

        {expired && !showLockNotice ? (
          <TeacherInboxLockNotice
            label={tInbox("lock_reason.lead_expired")}
          />
        ) : null}

        {declined ? <TeacherLeadDeclinedBanner /> : null}

        {responded && threadOutcome?.ok ? (
          <ThreadView
            initial={threadOutcome.data}
            leadUuid={row.lead_uuid}
            recipientUuid={row.uuid}
            viewerRole="teacher"
            backHref={`/panel-ogretmen/talepler/${row.uuid}`}
            labels={{
              backToLead: tThread("back_to_lead"),
              headerTitleWith: tThread("header_title_with"),
              connectionState: {
                in_app: tThread("connection_state.in_app"),
                revealed: tThread("connection_state.revealed"),
                closed: tThread("connection_state.closed"),
              },
              placeholder: tThread("placeholder"),
              placeholderClosed: tThread("placeholder_closed"),
              send: tThread("send"),
              sending: tThread("sending"),
              charCount: tThread("char_count"),
              empty: tThread("empty"),
              you: tThread("you"),
              seen: tThread("seen"),
              moderation: {
                title: tThread("moderation.title"),
                description: tThread("moderation.description"),
                flagPhone: tThread("moderation.flag_phone"),
                flagIban: tThread("moderation.flag_iban"),
                flagEmail: tThread("moderation.flag_email"),
                cancel: tThread("moderation.cancel"),
                confirm: tThread("moderation.confirm"),
                confirming: tThread("moderation.confirming"),
              },
              errors: {
                empty_body: tThread("errors.empty_body"),
                body_too_long: tThread("errors.body_too_long"),
                thread_closed: tThread("errors.thread_closed"),
                lead_cancelled: tThread("errors.lead_cancelled"),
                throttle_message_send: tThread(
                  "errors.throttle_message_send",
                ),
                unauthorized: tThread("errors.unauthorized"),
                forbidden: tThread("errors.forbidden"),
                not_found: tThread("errors.not_found"),
                network_error: tThread("errors.network_error"),
                upstream_error: tThread("errors.upstream_error"),
                validation_failed: tThread("errors.validation_failed"),
              },
            }}
          />
        ) : null}

        {responded && threadOutcome && !threadOutcome.ok ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-semibold">{tThread("network_error_title")}</p>
            <p className="mt-1">{tThread("network_error_body")}</p>
            <p className="mt-2 text-[11px] font-mono text-destructive/70">
              ref: {row.uuid.slice(0, 8)}
            </p>
          </div>
        ) : null}
      </div>
    </Container>
  );
}

async function NetworkErrorState({ locale }: { locale: Locale }) {
  const t = await getTranslations({
    locale,
    namespace: "panel.teacher.lead",
  });
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">
          {t("network_error_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("network_error_body")}</p>
      </div>
    </Container>
  );
}
