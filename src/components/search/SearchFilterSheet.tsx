"use client";

import { cloneElement, isValidElement, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterIcon } from "@hugeicons/core-free-icons";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface SearchFilterSheetProps {
  appliedFilterCount: number;
  /**
   * Expected to be a single `<SearchFilters compact ... />` element.
   * The sheet injects an `onApplied` callback so that pressing Apply
   * also closes the sheet (URL navigation already happens inside the
   * filters component itself).
   */
  children: ReactElement<{ onApplied?: () => void }>;
}

/**
 * Mobile-only filter trigger + sheet wrapper. Layout: fixed header,
 * scrollable filter body, and a sticky-bottom Apply button rendered
 * inside the form (handled by SearchFilters in compact mode).
 */
export function SearchFilterSheet({
  appliedFilterCount,
  children,
}: SearchFilterSheetProps) {
  const t = useTranslations("search.filters");
  const [open, setOpen] = useState(false);

  const enhancedChildren = isValidElement(children)
    ? cloneElement(children, { onApplied: () => setOpen(false) })
    : children;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 gap-2 rounded-xl border-border bg-card font-medium text-foreground lg:hidden"
        >
          <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={2} aria-hidden />
          {appliedFilterCount > 0
            ? t("open_button_with_count", { count: appliedFilterCount })
            : t("open_button")}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[88dvh] w-full max-w-none flex-col rounded-t-3xl bg-card p-0 text-card-foreground"
      >
        <SheetHeader className="border-b border-border/60 px-6 pb-4 pt-6">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <div
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {enhancedChildren}
        </div>
      </SheetContent>
    </Sheet>
  );
}
