"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LockPasswordIcon,
  Notification03Icon,
  Settings02Icon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: "/ayarlar/profil" | "/ayarlar/sifre" | "/ayarlar/bildirimler" | "/ayarlar/hesap";
  labelKey: "nav.profile" | "nav.password" | "nav.notifications" | "nav.account";
  icon: typeof UserEdit01Icon;
}

const ITEMS: NavItem[] = [
  { href: "/ayarlar/profil", labelKey: "nav.profile", icon: UserEdit01Icon },
  { href: "/ayarlar/sifre", labelKey: "nav.password", icon: LockPasswordIcon },
  {
    href: "/ayarlar/bildirimler",
    labelKey: "nav.notifications",
    icon: Notification03Icon,
  },
  { href: "/ayarlar/hesap", labelKey: "nav.account", icon: Settings02Icon },
];

/**
 * Sol-nav for /ayarlar/*.
 *
 * Desktop: sticky vertical list (Linear/Vercel/Stripe pattern).
 * Mobile: horizontal scroll tab strip with active underline.
 *
 * Active state is purely visual — the underlying server routes own auth and
 * data, so a stale active highlight during route transition is acceptable.
 */
export function AccountNav() {
  const t = useTranslations("panel.settings");
  const pathname = usePathname();

  return (
    <nav aria-label={t("nav.aria_label")} className="lg:sticky lg:top-24">
      {/* Mobile: horizontal scroll tabs */}
      <div className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <ul className="flex min-w-max items-center gap-1 border-b border-border pb-px">
          {ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={item.icon} size={16} strokeWidth={2} />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Desktop: vertical sticky list */}
      <ul className="hidden flex-col gap-1 lg:flex">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={18}
                  strokeWidth={2}
                  className="shrink-0"
                />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
