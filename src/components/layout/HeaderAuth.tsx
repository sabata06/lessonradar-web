"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Logout03Icon,
  Mortarboard01Icon,
  Presentation01Icon,
  Settings02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function HeaderAuth() {
  const t = useTranslations("auth.header");
  const { user, isHydrated, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Avoid hydration-time CTA flicker: reserve the slot until /api/auth/me lands.
  if (!isHydrated) {
    return <div aria-hidden className="hidden h-10 w-[10rem] lg:block" />;
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Button
          asChild
          variant="ghost"
          className="text-foreground hover:bg-muted"
        >
          <Link href="/giris">{t("login")}</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/5"
        >
          <Link href="/kayit">{t("register")}</Link>
        </Button>
      </div>
    );
  }

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    "?";
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-card px-1 py-1 pr-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={displayName}
        >
          <Avatar className="size-7">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[8rem] truncate font-medium text-foreground md:inline">
            {user.firstName || user.email}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-60 p-0"
      >
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <nav className="flex flex-col p-1">
          {/* Role-aware dashboard: teachers see "Öğretmen Panelim" (single
              operational hub), customers see "Panelim" (request/lesson list). */}
          {user.role === "teacher" ? (
            <MenuItem
              href="/panel-ogretmen"
              icon={Presentation01Icon}
              onClick={() => setOpen(false)}
            >
              {t("menu_teacher_panel")}
            </MenuItem>
          ) : (
            <MenuItem
              href="/panel"
              icon={UserIcon}
              onClick={() => setOpen(false)}
            >
              {t("menu_dashboard")}
            </MenuItem>
          )}
          <MenuItem
            href="/ayarlar"
            icon={Settings02Icon}
            onClick={() => setOpen(false)}
          >
            {t("menu_settings")}
          </MenuItem>
          {/* Customer-only nudge to teacher onboarding (hybrid C). */}
          {user.role !== "teacher" && (
            <MenuItem
              href="/ogretmen-ol"
              icon={Mortarboard01Icon}
              onClick={() => setOpen(false)}
            >
              {t("menu_become_teacher")}
            </MenuItem>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="mt-1 flex items-center gap-3 rounded-md border-t border-border px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <HugeiconsIcon icon={Logout03Icon} size={16} strokeWidth={2} />
            {t("menu_logout")}
          </button>
        </nav>
      </PopoverContent>
    </Popover>
  );
}

interface MenuItemProps {
  href: string;
  icon: typeof UserIcon;
  onClick: () => void;
  children: React.ReactNode;
}

function MenuItem({ href, icon, onClick, children }: MenuItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <HugeiconsIcon icon={icon} size={16} strokeWidth={2} />
      {children}
    </Link>
  );
}
