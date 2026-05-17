import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatIcon } from "@hugeicons/core-free-icons";

import { Container } from "@/components/layout/Container";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { requireAuth } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { fetchThreadList } from "@/lib/messages/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { ThreadListItem } from "@/lib/messages/types";

/**
 * `/mesajlar` — WhatsApp-style global "Mesajlarım" inbox. Lists every
 * conversation the authenticated user is a participant in (both customer
 * and teacher threads), newest first by activity. Tap a row → navigate to
 * the role-specific thread route:
 *
 *   - Customer viewer (other_role === "teacher")
 *       → `/panel/talepler/[lead_uuid]/mesaj/[recipient_uuid]`
 *   - Teacher viewer (other_role === "customer")
 *       → `/panel-ogretmen/talepler/[recipient_uuid]` (thread embedded)
 *
 * Backend already symmetrizes — same endpoint, role inferred from session.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "panel.messages",
  });
  return buildPageMetadata({
    locale,
    path: "/mesajlar",
    title: `${t("meta_title")} · LessonRadar`,
    description: t("meta_description"),
    noindex: true,
  });
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function MessagesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAuth({
    role: ["customer", "teacher", "admin"],
    next: "/mesajlar",
  });

  const t = await getTranslations("panel.messages");

  const outcome = await fetchThreadList();
  if (!outcome.ok) {
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

  const threads = outcome.data.results;

  return (
    <Container className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </header>

        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                size={22}
                strokeWidth={1.8}
              />
            </span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {t("empty.title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty.body")}
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {threads.map((thread, idx) => (
              <li
                key={thread.uuid}
                className={cn(
                  idx > 0 ? "border-t border-border" : undefined,
                )}
              >
                <ThreadRow thread={thread} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

function ThreadRow({
  thread,
  locale,
}: {
  thread: ThreadListItem;
  locale: Locale;
}) {
  // other_role tells us which side the OTHER party is on, so we deduce the
  // viewer's URL by inversion.
  const isCustomerViewer = thread.other_role === "teacher";
  const href = isCustomerViewer
    ? `/panel/talepler/${thread.lead_uuid}/mesaj/${thread.recipient_uuid}`
    : `/panel-ogretmen/talepler/${thread.recipient_uuid}`;

  const initials = getInitials(thread.other_display_name);
  const relativeTime = formatRelativeTime(thread.last_message_at, locale);
  const hasUnread = thread.unread_count > 0;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none md:px-5",
        hasUnread ? "bg-brand-soft/20" : undefined,
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {thread.other_avatar_url ? (
          <Image
            src={thread.other_avatar_url}
            alt={thread.other_display_name}
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-foreground">
            {initials}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={cn(
              "min-w-0 truncate text-sm",
              hasUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground",
            )}
          >
            {thread.other_display_name}
          </h3>
          {relativeTime ? (
            <time
              dateTime={thread.last_message_at ?? undefined}
              className={cn(
                "shrink-0 text-[11px]",
                hasUnread
                  ? "font-semibold text-brand"
                  : "text-muted-foreground",
              )}
            >
              {relativeTime}
            </time>
          ) : null}
        </div>
        {thread.lead_discipline_name ? (
          <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
            {thread.lead_discipline_name}
          </p>
        ) : null}
        <div className="mt-1 flex items-start justify-between gap-2">
          <p
            className={cn(
              "line-clamp-1 flex-1 text-sm",
              hasUnread
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {thread.last_message_preview ?? "—"}
          </p>
          {hasUnread ? (
            <span className="inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-action px-1.5 text-[11px] font-bold text-action-foreground">
              {thread.unread_count}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeTime(
  iso: string | null,
  locale: Locale,
): string | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return locale === "tr" ? "şimdi" : "now";
    if (diffMs < hour) {
      const m = Math.floor(diffMs / minute);
      return locale === "tr" ? `${m} dk` : `${m}m`;
    }
    if (diffMs < day) {
      const h = Math.floor(diffMs / hour);
      return locale === "tr" ? `${h} sa` : `${h}h`;
    }
    if (diffMs < 7 * day) {
      const d = Math.floor(diffMs / day);
      return locale === "tr" ? `${d}g` : `${d}d`;
    }
    return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return null;
  }
}
