"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Link, usePathname } from "@/i18n/navigation";

/**
 * Mobile-only sticky bottom CTA. Reinforces the web lead conversion priority
 * without occupying screen real estate on desktop.
 *
 * Auto-hides on:
 *   - /ders-talebi          → already on the lead form, no CTA-on-CTA
 *   - /ogretmen/*           → profile page renders its own teacher-scoped CTA
 *   - /ogretmen-ol          → tutor-facing, the student lead CTA is contextually wrong
 *   - auth flows            → user is mid-task; "request a lesson" distracts
 */
const HIDDEN_PATHS = [
  "/ders-talebi",
  "/ogretmen",
  "/ogretmen-ol",
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/eposta-dogrula",
  "/rol-sec",
];

export function MobileBottomBar() {
  const t = useTranslations("cta");
  const pathname = usePathname();

  const hidden = HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  return (
    <div
      role="region"
      aria-label="Quick action"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <Link
        href="/ders-talebi"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-action px-5 text-sm font-semibold text-action-foreground shadow-action transition-colors hover:bg-action-hover"
      >
        {t("request_lesson")}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
      </Link>
    </div>
  );
}
