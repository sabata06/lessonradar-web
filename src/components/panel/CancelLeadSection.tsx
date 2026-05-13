import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";

import type { LeadDetail } from "@/lib/lead/customer-lead-detail";
import { CancelLeadButton } from "./CancelLeadButton";

interface Props {
  lead: LeadDetail;
}

/**
 * Server-side wrapper around the client cancel button. Suppresses the section
 * entirely when the backend says `can_cancel === false` so a converted/closed
 * lead never even shows the destructive surface.
 */
export async function CancelLeadSection({ lead }: Props) {
  const t = await getTranslations("panel.customer.leads.detail.cancel");

  if (!lead.can_cancel) return null;

  // Pre-fetch all client-rendered strings so the dialog doesn't need
  // next-intl on the client.
  const labels = {
    trigger: t("trigger"),
    title: t("dialog.title"),
    description: t("dialog.description"),
    reason_label: t("dialog.reason_label"),
    reason_placeholder: t("dialog.reason_placeholder"),
    reason_hint: t("dialog.reason_hint"),
    cancel: t("dialog.cancel"),
    confirm: t("dialog.confirm"),
    confirming: t("dialog.confirming"),
    error: {
      unauthorized: t("error.unauthorized"),
      forbidden: t("error.forbidden"),
      not_found: t("error.not_found"),
      not_cancellable: t("error.not_cancellable"),
      validation_failed: t("error.validation_failed"),
      network_error: t("error.network_error"),
      upstream_error: t("error.upstream_error"),
      unknown: t("error.unknown"),
    },
  };

  return (
    <section
      aria-labelledby="cancel-lead-heading"
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <header className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={16}
            strokeWidth={2}
          />
        </span>
        <div className="min-w-0 space-y-1">
          <h2
            id="cancel-lead-heading"
            className="text-base font-semibold text-foreground"
          >
            {t("title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </header>
      <div>
        <CancelLeadButton leadUuid={lead.uuid} labels={labels} />
      </div>
    </section>
  );
}
