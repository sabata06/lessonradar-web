import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon, Time04Icon } from "@hugeicons/core-free-icons";

import type { Locale } from "@/i18n/routing";
import type { LeadDetail } from "@/lib/lead/customer-lead-detail";

import { LeadOfferCard } from "./LeadOfferCard";

interface Props {
  lead: LeadDetail;
  locale: Locale;
  nowIso: string;
}

/**
 * Orchestrates the offers section: heading + summary line + empty state OR
 * cards list. The empty state copy differs depending on whether the lead is
 * fresh (still receiving responses), cancelled, or simply has no offers yet.
 */
export async function LeadOffersList({ lead, locale, nowIso }: Props) {
  const t = await getTranslations("panel.customer.leads.detail.offers");
  const count = lead.offers.length;
  const isCancelled = lead.status === "cancelled";

  return (
    <section aria-labelledby="lead-offers-heading" className="space-y-5">
      <header className="space-y-1">
        <h2
          id="lead-offers-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {count > 0
            ? t("count_intro", { count })
            : isCancelled
              ? t("empty_cancelled_subtitle")
              : t("empty_waiting_subtitle")}
        </p>
      </header>

      {count === 0 ? (
        <EmptyState
          icon={isCancelled ? InboxIcon : Time04Icon}
          title={
            isCancelled
              ? t("empty_cancelled_title")
              : t("empty_waiting_title")
          }
          body={
            isCancelled
              ? t("empty_cancelled_body")
              : t("empty_waiting_body")
          }
        />
      ) : (
        <ul className="space-y-4">
          {lead.offers.map((offer, idx) => (
            <li key={offer.uuid}>
              <LeadOfferCard
                offer={offer}
                leadUuid={lead.uuid}
                disciplineSlug={lead.discipline_slug}
                contactPreference={lead.customer_contact_preference}
                locale={locale}
                nowIso={nowIso}
                emphasizeFirst={idx === 0}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: typeof InboxIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-dashed border-border bg-background p-6">
      <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
