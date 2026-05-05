"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu02Icon } from "@hugeicons/core-free-icons";

import { Link } from "@/i18n/navigation";
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
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

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
