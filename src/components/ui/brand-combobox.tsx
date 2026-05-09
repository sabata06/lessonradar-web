"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePopoverPortalContainer } from "@/components/ui/popover-portal-context";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional section header — items sharing a `group` are grouped together. */
  group?: string;
}

interface BrandComboboxProps {
  value: string;
  onChange: (next: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Optional reset row label. When set, an item that clears the field appears at the top. */
  allLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Trigger button class override — for custom heights / pill styling. */
  triggerClassName?: string;
}

/**
 * Searchable, grouped, brand-aware single-select.
 *
 * Renders one of two layouts depending on context:
 *
 *   - **Popover mode (default)** — desktop sidebars + homepage hero
 *     search bar. The dropdown floats over the page, keyboard nav and
 *     scroll-into-view come from cmdk + Radix collision detection.
 *   - **Inline expand mode** — when the combobox is rendered inside a
 *     `<PopoverPortalProvider>` (i.e. a Radix Sheet/Dialog), we drop
 *     the popover entirely and inline-expand the search + list right
 *     under the trigger card. Mobile keyboards open over the bottom
 *     half of the viewport, and a popover would either stay anchored
 *     above the keyboard (cutting off the list) or jump around as
 *     Radix re-collision-tests. Inlining the list makes the surrounding
 *     Sheet body responsible for scrolling — the browser's native
 *     "scroll focused input into view" behaviour does the right thing.
 *
 * Both modes share filter logic (Turkish-aware diacritic fold), the
 * cmdk `<Command>` tree, and the trigger button styling.
 */
export function BrandCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  allLabel,
  ariaLabel,
  disabled,
  triggerClassName,
}: BrandComboboxProps) {
  const [open, setOpen] = React.useState(false);
  // The presence of a portal container means this combobox sits inside
  // a modal Sheet/Dialog — see `<PopoverPortalProvider>` in
  // `SearchFilterSheet`. Use it both as the popover portal target AND
  // as the signal to switch into inline-expand mode for mobile UX.
  const portalContainer = usePopoverPortalContainer();
  const inlineMode = portalContainer !== null;

  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  // Group items into sections preserving the input order. Items without
  // a `group` field collapse into a single anonymous group rendered first.
  const sections = React.useMemo(() => {
    const order: string[] = [];
    const buckets = new Map<string, ComboboxOption[]>();
    for (const opt of options) {
      const key = opt.group ?? "";
      if (!buckets.has(key)) {
        buckets.set(key, []);
        order.push(key);
      }
      buckets.get(key)!.push(opt);
    }
    return order.map((key) => ({ heading: key, items: buckets.get(key)! }));
  }, [options]);

  const hasValue = value !== "";

  const triggerButton = (
    <button
      type="button"
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={open}
      disabled={disabled}
      onClick={inlineMode ? () => setOpen((v) => !v) : undefined}
      className={cn(
        "flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        hasValue
          ? "border-brand/50 bg-brand-soft/40 text-foreground"
          : "border-border bg-card text-foreground hover:border-brand/40",
        disabled && "cursor-not-allowed opacity-50 hover:border-border",
        triggerClassName,
      )}
    >
      <span className={cn("truncate", !selected && "text-muted-foreground")}>
        {selected ? selected.label : placeholder}
      </span>
      <HugeiconsIcon
        icon={UnfoldMoreIcon}
        size={16}
        strokeWidth={2}
        aria-hidden
        className="shrink-0 text-muted-foreground"
      />
    </button>
  );

  // Shared inner list — same JSX for popover + inline modes.
  const commandBody = (
    <Command
      // cmdk's default fuzzy filter stumbles on Turkish diacritics
      // ("gazi" should match "Gaziantep"). Apply a fold before
      // comparing to make ASCII queries hit Turkish labels.
      filter={(itemValue: string, search: string) =>
        foldTr(itemValue).includes(foldTr(search)) ? 1 : 0
      }
    >
      <CommandInput placeholder={searchPlaceholder ?? "Ara…"} />
      <CommandList>
        <CommandEmpty>{emptyText ?? "Sonuç yok"}</CommandEmpty>

        {allLabel ? (
          <CommandGroup>
            <CommandItem
              value={allLabel}
              onSelect={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(!hasValue && "bg-brand-soft/50 font-medium")}
            >
              <span className="flex-1">{allLabel}</span>
              {!hasValue && (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={16}
                  strokeWidth={2.4}
                  aria-hidden
                  className="text-brand"
                />
              )}
            </CommandItem>
          </CommandGroup>
        ) : null}

        {sections.map((section) => (
          <CommandGroup
            key={section.heading || "ungrouped"}
            heading={section.heading || undefined}
          >
            {section.items.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <CommandItem
                  key={opt.value}
                  // cmdk filters on `value`; include the label so search
                  // matches the human-readable text, not just the slug.
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    isSelected &&
                      "bg-brand-soft/60 font-medium text-brand-soft-foreground",
                  )}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={16}
                      strokeWidth={2.4}
                      aria-hidden
                      className="text-brand"
                    />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );

  if (inlineMode) {
    // Inline expand mode — used inside mobile filter Sheet so the
    // mobile keyboard doesn't fight a floating popover.
    return (
      <div>
        {triggerButton}
        {open && (
          <div
            // `mt-2` puts a clear gap below the trigger; the surrounding
            // Sheet body owns the scroll, so we don't need an inner
            // overflow shell here. `min-h-0` is harmless on a sized
            // container but keeps the cmdk content tree happy.
            className="mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-card"
          >
            {/* The inner list is bounded by 50dvh so it never claims
                more than half the *visible* viewport — `dvh` recalcs
                automatically when the mobile keyboard opens, leaving
                the search input visible above the keyboard. */}
            <div className="[&_[cmdk-list]]:max-h-[50dvh] [&_[cmdk-list]]:!h-auto">
              {commandBody}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Popover mode — default for desktop + homepage hero.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        // `max-h: --radix-popover-content-available-height` is the CSS
        // variable Radix exposes; combined with `flex flex-col` and the
        // child Command's `min-h-0`, the inner list scrolls while the
        // search row stays pinned at the top — even when the popover
        // flips up against the viewport.
        // `collisionPadding` keeps a small gap from the browser chrome.
        className="flex w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden p-0 max-h-[var(--radix-popover-content-available-height)] min-w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={6}
        collisionPadding={12}
      >
        {commandBody}
      </PopoverContent>
    </Popover>
  );
}

const TR_FOLD: Record<string, string> = {
  İ: "i",
  I: "i",
  Ş: "s",
  Ğ: "g",
  Ü: "u",
  Ö: "o",
  Ç: "c",
  ş: "s",
  ğ: "g",
  ü: "u",
  ö: "o",
  ç: "c",
  ı: "i",
};

function foldTr(value: string): string {
  return value
    .split("")
    .map((ch) => TR_FOLD[ch] ?? ch)
    .join("")
    .toLowerCase()
    .trim();
}
