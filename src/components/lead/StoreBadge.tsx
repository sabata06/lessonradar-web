"use client";

import type { SupportedLocale } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StoreBadgeProps {
  platform: "ios" | "android";
  locale: SupportedLocale;
  /** Apps not yet in stores — visually mark as coming soon and inert. */
  comingSoon?: boolean;
}

/**
 * App Store / Google Play badge.
 * Client island because the badge is intentionally inert until store URLs land
 * (apps not yet published) — onClick suppresses navigation.
 * Once URLs are real, swap href + drop the handler + remove `comingSoon`.
 */
export function StoreBadge({
  platform,
  locale,
  comingSoon = true,
}: StoreBadgeProps) {
  const labels = LABELS[locale][platform];

  return (
    <a
      href="#"
      aria-disabled={comingSoon}
      onClick={(e) => {
        if (comingSoon) e.preventDefault();
      }}
      className={cn(
        "group relative inline-flex h-12 items-center gap-3 rounded-xl border border-foreground/15 bg-foreground px-4 text-background shadow-sm transition-all",
        comingSoon
          ? "cursor-not-allowed opacity-80"
          : "hover:-translate-y-0.5 hover:shadow-elevated",
      )}
    >
      <span aria-hidden className="shrink-0">
        {platform === "ios" ? <AppleMark /> : <GooglePlayMark />}
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium uppercase tracking-wider text-background/70">
          {labels.tagline}
        </span>
        <span className="mt-0.5 text-sm font-semibold tracking-tight">
          {labels.store}
        </span>
      </span>
      {comingSoon && (
        <span
          aria-label={locale === "tr" ? "Yakında" : "Coming soon"}
          className="ml-1 rounded-full bg-action px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-action-foreground"
        >
          {locale === "tr" ? "Yakında" : "Soon"}
        </span>
      )}
    </a>
  );
}

const LABELS = {
  tr: {
    ios: { tagline: "İndir", store: "App Store" },
    android: { tagline: "Edinin", store: "Google Play" },
  },
  en: {
    ios: { tagline: "Download on the", store: "App Store" },
    android: { tagline: "Get it on", store: "Google Play" },
  },
} as const;

function AppleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GooglePlayMark() {
  // Stylized monochrome triangle so it sits cleanly on the dark badge.
  // Replace with multi-color official mark once apps are live.
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <defs>
        <linearGradient id="gp-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <path
        d="M4 2.4v19.2c0 .65.7 1.05 1.27.74L20.55 13.6a1.27 1.27 0 0 0 0-2.2L5.27 1.66A.86.86 0 0 0 4 2.4z"
        fill="url(#gp-grad)"
      />
      <path
        d="M4 2.4 14.5 12 4 21.6"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="0.6"
        fill="none"
      />
    </svg>
  );
}
