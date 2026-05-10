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
import { toPseoDisciplinePathSlug } from "@/lib/seo/pseo-slugs";
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

  // Threshold of 4px tolerates sub-pixel scroll values in some browsers
  // — without it the right chevron flickers near the very end.
  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Defer the first measurement to the next frame so layout has
    // settled (icons + labels) before we decide whether right-chevron
    // should appear. Without this the edge state can be stale on mount
    // — long content correctly overflows but `scrollWidth` reads as
    // `clientWidth` on the very first paint.
    const raf = requestAnimationFrame(updateEdges);
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll one viewport-width worth of items so each chevron press
    // advances a full "page" — matches the Superprof rhythm where the
    // visible window slides without skipping past unseen items.
    const delta = el.clientWidth * 0.8 * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (disciplines.length === 0) return null;

  return (
    <nav
      aria-label={locale === "tr" ? "Popüler branşlar" : "Popular subjects"}
      className={cn("relative", className)}
    >
      {/* Scrolling track. No padding on the scroller itself — padding
          inside an `overflow-x-auto` container with `snap-mandatory`
          gets folded into `scrollWidth` and lets the browser auto-snap
          past the leading edge on first paint, which is what made the
          first chip clip and the left chevron flash on mount.
          Chevron buttons sit *above* this track via absolute
          positioning, with edge fade masks softening the overlap. */}
      <ul
        ref={scrollerRef}
        className={cn(
          "flex snap-x snap-mandatory gap-2.5 overflow-x-auto py-1 sm:gap-3",
          "scroll-smooth motion-reduce:scroll-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "[touch-action:pan-x]",
        )}
      >
        {disciplines.map((d) => {
          const icon = pickIcon(d);
          return (
            <li key={d.slug} className="snap-start shrink-0">
              <Link
                href={`/${citySlug}/${toPseoDisciplinePathSlug(d.slug)}`}
                className={cn(
                  // Card sized like Superprof: ~100px wide on mobile,
                  // ~112px on desktop. Fixed height keeps the row
                  // visually even when one label wraps to two lines.
                  "group flex h-[104px] w-[96px] flex-col items-center justify-center gap-2 rounded-2xl bg-card px-2 py-3 text-center shadow-card ring-1 ring-border/60 transition-all sm:h-[116px] sm:w-[112px] sm:gap-2.5",
                  "hover:-translate-y-0.5 hover:ring-brand/40 hover:shadow-elevated",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-full bg-brand-soft/70 text-brand transition-colors group-hover:bg-brand-soft"
                >
                  <HugeiconsIcon
                    icon={icon}
                    size={20}
                    strokeWidth={1.7}
                  />
                </span>
                <span className="line-clamp-2 break-words text-[11px] font-medium leading-tight text-foreground sm:text-xs">
                  {pickLocalized(d.name, locale)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Edge fade masks. Sit on top of the scrolling track to soften
          where chips disappear under the chevron buttons. Page surface
          is `--background` (cream), so the gradient fades to that
          token, not to a brand tint. Hidden on mobile — touch users
          rely on the swipe gesture, no chevron buttons. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-background via-background/95 to-transparent transition-opacity duration-200 sm:block",
          !canScrollLeft && "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-background via-background/95 to-transparent transition-opacity duration-200 sm:block",
          !canScrollRight && "opacity-0",
        )}
      />

      {/* Floating chevrons. `-left-3` / `-right-3` lets them bridge the
          carousel edge like Superprof's pattern: half over the content,
          half hovering off the side. Hidden on mobile (touch users
          swipe). `aria-hidden` when inactive so screen readers don't
          announce a stale "scroll left" affordance. */}
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        aria-label={locale === "tr" ? "Sola kaydır" : "Scroll left"}
        aria-hidden={!canScrollLeft}
        tabIndex={canScrollLeft ? 0 : -1}
        className={cn(
          "absolute -left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-elevated ring-1 ring-border transition-all duration-200 sm:flex",
          "hover:-translate-x-0.5 hover:-translate-y-1/2 hover:bg-brand-soft hover:text-brand hover:ring-brand/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          !canScrollLeft && "pointer-events-none scale-90 opacity-0",
        )}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.2} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => scrollByPage(1)}
        aria-label={locale === "tr" ? "Sağa kaydır" : "Scroll right"}
        aria-hidden={!canScrollRight}
        tabIndex={canScrollRight ? 0 : -1}
        className={cn(
          "absolute -right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-elevated ring-1 ring-border transition-all duration-200 sm:flex",
          "hover:translate-x-0.5 hover:-translate-y-1/2 hover:bg-brand-soft hover:text-brand hover:ring-brand/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          !canScrollRight && "pointer-events-none scale-90 opacity-0",
        )}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.2} aria-hidden />
      </button>
    </nav>
  );
}
