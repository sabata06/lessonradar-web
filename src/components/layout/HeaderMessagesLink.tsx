"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatIcon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/client";

/**
 * Auth-gated direct entry into the global "Mesajlarım" inbox.
 *
 * Desktop-only icon button shown next to HeaderAuth. Mobile users reach the
 * same destination through MobileMenu's account block — see MobileMenu.tsx.
 *
 * Unread badge is intentionally V2: rendering it here would force a
 * `/api/messages/threads/` round-trip on every page hydration (Header is
 * present on every route). The Settings → Mesajlarım entry and the Pages
 * Header → mesajlar icon are enough to surface the inbox in V1.
 */
export function HeaderMessagesLink() {
  const t = useTranslations("nav");
  const { user, isHydrated } = useAuth();

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <Link
      href="/mesajlar"
      aria-label={t("messages")}
      title={t("messages")}
      className="hidden size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:inline-flex"
    >
      <HugeiconsIcon icon={BubbleChatIcon} size={20} strokeWidth={1.6} />
    </Link>
  );
}
