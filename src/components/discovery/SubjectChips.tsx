"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Atom02Icon,
  Basketball01Icon,
  BookOpen01Icon,
  BrushIcon,
  Calculator01Icon,
  CodeIcon,
  DnaIcon,
  Globe02Icon,
  GraduationScrollIcon,
  MicroscopeIcon,
  Mortarboard02Icon,
  MusicNote01Icon,
  PaintBrushIcon,
  PencilIcon,
  Robot01Icon,
  TennisBallIcon,
  TestTubeIcon,
  TranslateIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import { Link } from "@/i18n/navigation";
import type { MarketplaceDiscipline, SupportedLocale } from "@/lib/types";
import { pickLocalized } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SubjectChipsProps {
  disciplines: MarketplaceDiscipline[];
  citySlug: string;
  locale: SupportedLocale;
  className?: string;
}

// Slug-specific icon picks for the most common subjects, then a domain
// fallback, then a generic book icon. Keeps the carousel visually
// distinctive even when the catalog grows past the slugs we hand-pick.
const ICON_BY_SLUG: Record<string, IconSvgElement> = {
  matematik: Calculator01Icon,
  geometri: Calculator01Icon,
  fizik: Atom02Icon,
  kimya: TestTubeIcon,
  biyoloji: DnaIcon,
  "fen-bilimleri": MicroscopeIcon,
  tarih: GraduationScrollIcon,
  cografya: Globe02Icon,
  felsefe: BookOpen01Icon,
  ingilizce: TranslateIcon,
  almanca: TranslateIcon,
  fransizca: TranslateIcon,
  ispanyolca: TranslateIcon,
  arapca: TranslateIcon,
  rusca: TranslateIcon,
  cince: TranslateIcon,
  italyanca: TranslateIcon,
  "yks-matematik": Mortarboard02Icon,
  "ib-matematik": Mortarboard02Icon,
  "lgs-hazirlik": Mortarboard02Icon,
  "yds-hazirlik": Mortarboard02Icon,
  "ielts-hazirlik": Mortarboard02Icon,
  "toefl-hazirlik": Mortarboard02Icon,
  "sat-hazirlik": Mortarboard02Icon,
  "python-programlama": CodeIcon,
  "bilgisayar-bilimi": CodeIcon,
  "web-gelistirme": CodeIcon,
  "bilisim-teknolojileri": CodeIcon,
  robotik: Robot01Icon,
  "robotik-kodlama": Robot01Icon,
  piyano: MusicNote01Icon,
  gitar: MusicNote01Icon,
  keman: MusicNote01Icon,
  tenis: TennisBallIcon,
  basketbol: Basketball01Icon,
  cizim: PencilIcon,
  resim: PaintBrushIcon,
  "grafik-tasarim": BrushIcon,
};

const ICON_BY_DOMAIN: Record<string, IconSvgElement> = {
  akademik: BookOpen01Icon,
  diller: TranslateIcon,
  "sinav-hazirlik": Mortarboard02Icon,
  teknoloji: CodeIcon,
  muzik: MusicNote01Icon,
  spor: Basketball01Icon,
  "sanat-tasarim": BrushIcon,
  "kisisel-gelisim": BookOpen01Icon,
};

function pickIcon(d: MarketplaceDiscipline): IconSvgElement {
  return (
    ICON_BY_SLUG[d.slug] ?? ICON_BY_DOMAIN[d.domainSlug] ?? BookOpen01Icon
  );
}

export function SubjectChips({
  disciplines,
  citySlug,
  locale,
  className,
}: SubjectChipsProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Track scroll edges so the chevron buttons can fade in/out.
  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll one viewport-width worth of items at a time — matches the
    // Superprof "page" feel where pressing the chevron advances the
    // visible window without skipping past unseen items.
    const delta = el.clientWidth * 0.8 * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (disciplines.length === 0) return null;

  return (
    <nav
      aria-label={locale === "tr" ? "Popüler branşlar" : "Popular subjects"}
      className={cn("relative", className)}
    >
      <div className="relative rounded-full bg-brand-soft/30 px-2 py-2 sm:px-3">
        {/* Left chevron — desktop only; mobile relies on touch swipe */}
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label={locale === "tr" ? "Sola kaydır" : "Scroll left"}
          tabIndex={canScrollLeft ? 0 : -1}
          className={cn(
            "absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-elevated ring-1 ring-border transition-opacity sm:flex",
            "size-9 hover:bg-brand-soft hover:text-brand",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            !canScrollLeft &&
              "pointer-events-none opacity-0",
          )}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.2} aria-hidden />
        </button>

        <ul
          ref={scrollerRef}
          className={cn(
            "flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth py-1 sm:gap-2 sm:px-10",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "[touch-action:pan-x]",
          )}
        >
          {disciplines.map((d) => {
            const icon = pickIcon(d);
            return (
              <li key={d.slug} className="snap-start shrink-0">
                <Link
                  href={`/${citySlug}/${d.slug}`}
                  className={cn(
                    "group inline-flex min-w-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center text-xs font-medium text-foreground transition-colors sm:min-w-[100px] sm:gap-2 sm:text-sm",
                    "hover:bg-card hover:shadow-card",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-card text-brand transition-transform group-hover:scale-105 sm:size-10">
                    <HugeiconsIcon
                      icon={icon}
                      size={20}
                      strokeWidth={1.7}
                      aria-hidden
                    />
                  </span>
                  <span className="line-clamp-1">
                    {pickLocalized(d.name, locale)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right chevron */}
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label={locale === "tr" ? "Sağa kaydır" : "Scroll right"}
          tabIndex={canScrollRight ? 0 : -1}
          className={cn(
            "absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-elevated ring-1 ring-border transition-opacity sm:flex",
            "size-9 hover:bg-brand-soft hover:text-brand",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            !canScrollRight &&
              "pointer-events-none opacity-0",
          )}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.2} aria-hidden />
        </button>

        {/* Edge fade masks — soften where chips disappear under the chevron buttons */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-2 left-2 hidden w-12 rounded-l-full bg-gradient-to-r from-brand-soft/80 to-transparent transition-opacity sm:block",
            !canScrollLeft && "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-2 right-2 hidden w-12 rounded-r-full bg-gradient-to-l from-brand-soft/80 to-transparent transition-opacity sm:block",
            !canScrollRight && "opacity-0",
          )}
        />
      </div>
    </nav>
  );
}
