"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Logout03Icon,
  Menu02Icon,
  Settings02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * Client island: holds the mobile navigation drawer.
 * Kept separate from the async server Header so radix portal/slot logic
 * does not cause SSR/CSR hydration drift.
 */
export function MobileMenu() {
  const t = useTranslations();
  const tAuth = useTranslations("auth.header");
  const router = useRouter();
  const { user, isHydrated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const close = () => setOpen(false);

  const handleLogout = async () => {
    close();
    await logout();
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("nav.menu")}
          className="inline-flex size-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
        >
          <HugeiconsIcon icon={Menu02Icon} size={22} strokeWidth={1.6} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle>
            <Logo />
          </SheetTitle>
          <SheetDescription className="sr-only">{t("nav.menu")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 p-4">
          <MobileNavItem href="/ara" onClick={close}>
            {t("nav.discover")}
          </MobileNavItem>
          <MobileNavItem href="/ders-talebi" onClick={close}>
            {t("nav.request")}
          </MobileNavItem>
          <MobileNavItem href="/ogretmen-ol" onClick={close}>
            {t("nav.become_teacher")}
          </MobileNavItem>
          <MobileNavItem href="/fiyatlar" onClick={close}>
            {t("nav.pricing")}
          </MobileNavItem>
        </div>
        {isHydrated && user && (
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
              <Avatar className="size-10">
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                )}
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {`${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
                    user.email[0]?.toUpperCase() ||
                    "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <MobileMenuItem href="/panel" icon={UserIcon} onClick={close}>
                {tAuth("menu_dashboard")}
              </MobileMenuItem>
              <MobileMenuItem href="/ayarlar" icon={Settings02Icon} onClick={close}>
                {tAuth("menu_settings")}
              </MobileMenuItem>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
              >
                <HugeiconsIcon icon={Logout03Icon} size={18} strokeWidth={2} />
                {tAuth("menu_logout")}
              </button>
            </div>
          </div>
        )}

        {isHydrated && !user && (
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
            <Button
              asChild
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/5"
            >
              <Link href="/giris" onClick={close}>
                {tAuth("login")}
              </Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/kayit" onClick={close}>
                {tAuth("register")}
              </Link>
            </Button>
          </div>
        )}

        <div className="space-y-3 border-t border-border p-4">
          <LocaleSwitcher />
          <Button
            asChild
            className="w-full bg-action text-action-foreground hover:bg-action-hover"
          >
            <Link href="/ders-talebi" onClick={close}>
              {t("cta.request_lesson")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavItem({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}

function MobileMenuItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: typeof UserIcon;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
      {children}
    </Link>
  );
}
