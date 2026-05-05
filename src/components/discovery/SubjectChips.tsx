import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calculator01Icon,
  Atom02Icon,
  TranslateIcon,
  MusicNote01Icon,
  Mortarboard02Icon,
  BookOpen01Icon,
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

const ICON_MAP: Record<string, IconSvgElement> = {
  "matematik-ozel-ders": Calculator01Icon,
  "fizik-ozel-ders": Atom02Icon,
  "yks-matematik": Mortarboard02Icon,
  "ingilizce-ozel-ders": TranslateIcon,
  "piyano-dersi": MusicNote01Icon,
};

export function SubjectChips({
  disciplines,
  citySlug,
  locale,
  className,
}: SubjectChipsProps) {
  return (
    <nav
      aria-label={locale === "tr" ? "Popüler branşlar" : "Popular subjects"}
      className={cn(
        "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ul className="flex gap-2 sm:flex-wrap sm:gap-2.5">
        {disciplines.map((d) => {
          const icon = ICON_MAP[d.slug] ?? BookOpen01Icon;
          return (
            <li key={d.slug} className="shrink-0">
              <Link
                href={`/${citySlug}/${d.slug}`}
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-card transition-all hover:border-brand/40 hover:bg-brand-soft hover:text-brand-soft-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <HugeiconsIcon
                  icon={icon}
                  size={16}
                  strokeWidth={1.8}
                  className="text-muted-foreground transition-colors group-hover:text-brand-soft-foreground"
                />
                {pickLocalized(d.name, locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
