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
 * Pattern:
 *   - Trigger: brand-aware pill button with chevron + selected label.
 *   - Popover: anchored panel with cmdk Command (search + grouped list).
 *   - Inside a Sheet/Dialog the popover portals into the dialog's
 *     content (`<PopoverPortalProvider>` advertises the target node)
 *     so mobile touch scroll stays inside the modal scope.
 *
 * Mobile keyboard rules:
 *   - `<CommandInput>` uses 16px font (see `command.tsx`) — anything
 *     smaller triggers iOS Safari's auto-zoom on focus, which is
 *     disorienting and shifts the popover off-screen.
 *   - The host Sheet sets `max-h: 88dvh`; `dvh` recalculates as the
 *     keyboard opens, shrinking the sheet so the popover's
 *     `--radix-popover-content-available-height` follows. The cmdk
 *     list inside scrolls instead of being clipped.
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
  // When this combobox is rendered inside a modal Sheet/Dialog, the
  // wrapping `<PopoverPortalProvider>` advertises the dialog's content
  // node as our portal target so touch scroll stays inside the modal
  // scope. Outside such a wrapper the value is null and we fall back
  // to the default body portal.
  const portalContainer = usePopoverPortalContainer();

  // Desktop locks the popover direction "always below" (Superprof
  // pattern — predictable, page scrolls if it overflows). Mobile keeps
  // Radix's collision-aware flip because cramped viewports + mobile
  // keyboards make a fixed-direction popover flop off the screen.
  // Default to mobile until we hydrate so SSR markup matches the most
  // restrictive layout.
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
  // Mobile + inside a Sheet → inline-expand mode. Popover doesn't work
  // here because Radix positions it absolutely, so the Sheet's
  // scrollHeight never grows to include the panel — users can't reach
  // list content the keyboard hides. Inline expansion makes the panel
  // part of the Sheet's natural flow, so the Sheet's `overflow-y-auto`
  // body actually scrolls.
  const isInlineMode = !isDesktop && portalContainer !== null;

  const triggerClass = cn(
    "flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    hasValue
      ? "border-brand/50 bg-brand-soft/40 text-foreground"
      : "border-border bg-card text-foreground hover:border-brand/40",
    disabled && "cursor-not-allowed opacity-50 hover:border-border",
    triggerClassName,
  );

  const chevronIcon = (
    <HugeiconsIcon
      icon={UnfoldMoreIcon}
      size={16}
      strokeWidth={2}
      aria-hidden
      className="shrink-0 text-muted-foreground"
    />
  );

  const triggerLabel = (
    <span className={cn("truncate", !selected && "text-muted-foreground")}>
      {selected ? selected.label : placeholder}
    </span>
  );

  if (isInlineMode) {
    return (
      <div>
        <button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={triggerClass}
        >
          {triggerLabel}
          {chevronIcon}
        </button>
        {open && (
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-card">
            <Command
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
          </div>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={triggerClass}
        >
          {triggerLabel}
          {chevronIcon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        // Direction strategy:
        //   - Desktop: lock to `side="bottom"` + `avoidCollisions={false}`.
        //     Predictable Superprof-style downward open; if the panel
        //     overflows the viewport, the user scrolls the page.
        //   - Mobile: keep Radix's default collision-aware flip so a
        //     trigger near the bottom of a cramped viewport doesn't
        //     drag the popover off-screen.
        //
        // Height cap:
        //   - Desktop: hard ceiling `min(420px, 70dvh)` so the panel
        //     stays a reasonable size even when the page is tall.
        //   - Mobile: bound by `--radix-popover-content-available-height`
        //     so the keyboard-aware visible area drives it.
        //
        // `container` retargets the Portal when this combobox sits
        // inside a Radix modal (Sheet/Dialog) — without it the popover
        // lands outside the modal scope and mobile touch scroll fails.
        className={cn(
          "flex w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden p-0 min-w-[var(--radix-popover-trigger-width)]",
          isDesktop
            ? "max-h-[min(420px,70dvh)]"
            : "max-h-[var(--radix-popover-content-available-height)]",
        )}
        side="bottom"
        align="start"
        sideOffset={6}
        avoidCollisions={!isDesktop}
        collisionPadding={isDesktop ? undefined : 12}
        container={portalContainer}
      >
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
