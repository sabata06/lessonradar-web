"use client";

import { useState } from "react";
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
  children: React.ReactNode;
}

/**
 * Mobile-only filter trigger + sheet wrapper. Receives the rendered
 * `<SearchFilters compact />` form as children so this client island
 * stays tiny — the form's submit closes the sheet by navigating, and
 * we never need to keep filter selections in client state.
 *
 * The trigger button surfaces the active filter count so users can see
 * at a glance whether a filter is still narrowing their results.
 */
export function SearchFilterSheet({
  appliedFilterCount,
  children,
}: SearchFilterSheetProps) {
  const t = useTranslations("search.filters");
  const [open, setOpen] = useState(false);

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
        className="max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-card text-card-foreground"
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <div
          className="flex-1 overflow-y-auto px-6 pb-6"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
