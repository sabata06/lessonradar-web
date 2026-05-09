"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Search01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
 * Why this exists alongside shadcn `<Select>`:
 *   - `<Select>` is best for short, fixed lists where users won't search.
 *   - This combobox (Popover + filterable list) is correct for long
 *     lists (50+ items) where typing-to-filter is faster than scrolling,
 *     like the 78-discipline taxonomy or the 81-province city list.
 *
 * Implementation notes:
 *   - Filter is computed locally with a Turkish-aware diacritic fold so
 *     "gazi" matches "Gaziantep". No external `cmdk` dependency.
 *   - The popover uses Radix's collision detection — on a packed screen
 *     the panel still flips to whichever side has space, but the inner
 *     `<ul>` is bounded by `max-h` so it never overflows the viewport.
 *   - Keyboard navigation: ↑/↓ moves the active row, Enter picks it,
 *     Escape closes. Mouse hover also updates the active row so visual
 *     feedback stays in sync regardless of input modality.
 *   - Active / selected rows carry the brand-soft tint so the affordance
 *     matches the surrounding form's "filter is set" indicator.
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
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  // Filter + flatten the option list. The filtered output preserves
  // input order so groups stay in their original layout.
  const filteredOptions = React.useMemo(() => {
    const folded = foldTr(query);
    if (!folded) return options;
    return options.filter(
      (opt) =>
        foldTr(opt.label).includes(folded) ||
        foldTr(opt.value).includes(folded),
    );
  }, [options, query]);

  // Group filtered items by `group` field, preserving first-seen order.
  const sections = React.useMemo(() => {
    const order: string[] = [];
    const buckets = new Map<string, ComboboxOption[]>();
    for (const opt of filteredOptions) {
      const key = opt.group ?? "";
      if (!buckets.has(key)) {
        buckets.set(key, []);
        order.push(key);
      }
      buckets.get(key)!.push(opt);
    }
    return order.map((key) => ({ heading: key, items: buckets.get(key)! }));
  }, [filteredOptions]);

  const hasValue = value !== "";
  const hasReset = Boolean(allLabel);

  // Build a flat list of selectable rows (reset row + each option) for
  // keyboard navigation. Indices line up with the rendered DOM order.
  const flatRows = React.useMemo(() => {
    const rows: Array<{ kind: "reset" } | { kind: "item"; option: ComboboxOption }> = [];
    if (hasReset) rows.push({ kind: "reset" });
    for (const section of sections) {
      for (const item of section.items) {
        rows.push({ kind: "item", option: item });
      }
    }
    return rows;
  }, [hasReset, sections]);

  // Reset filter + active index whenever the popover toggles open.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Defer focus so the popover's mount animation can finish first.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (activeIndex >= flatRows.length) {
      setActiveIndex(Math.max(0, flatRows.length - 1));
    }
  }, [flatRows, activeIndex]);

  // Keep the active row scrolled into view during keyboard nav.
  React.useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const target = list.querySelector<HTMLElement>(
      `[data-index='${activeIndex}']`,
    );
    target?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function commitRow(index: number) {
    const row = flatRows[index];
    if (!row) return;
    if (row.kind === "reset") {
      onChange("");
    } else {
      onChange(row.option.value);
    }
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((idx) => Math.min(flatRows.length - 1, idx + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((idx) => Math.max(0, idx - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitRow(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
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
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="flex h-10 items-center gap-2 border-b border-border/60 px-3">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            strokeWidth={2}
            aria-hidden
            className="shrink-0 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder ?? "Ara…"}
            className="h-10 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={searchPlaceholder ?? "Temizle"}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={14}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        <ul
          ref={listRef}
          role="listbox"
          className="max-h-[320px] overflow-y-auto p-1"
        >
          {flatRows.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              {emptyText ?? "Sonuç yok"}
            </li>
          ) : (
            <ComboboxRows
              hasReset={hasReset}
              allLabel={allLabel}
              sections={sections}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              commitRow={commitRow}
              hasValue={hasValue}
              selectedValue={value}
            />
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// Pulled out so the index-tracking pass that maps DOM order to `flatRows`
// stays readable. Keeping it inline made the parent component too noisy.
function ComboboxRows({
  hasReset,
  allLabel,
  sections,
  activeIndex,
  setActiveIndex,
  commitRow,
  hasValue,
  selectedValue,
}: {
  hasReset: boolean;
  allLabel?: string;
  sections: { heading: string; items: ComboboxOption[] }[];
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  commitRow: (idx: number) => void;
  hasValue: boolean;
  selectedValue: string;
}) {
  let cursor = 0;
  const elements: React.ReactElement[] = [];

  if (hasReset && allLabel) {
    const idx = cursor++;
    elements.push(
      <Row
        key="__reset__"
        index={idx}
        isActive={idx === activeIndex}
        isSelected={!hasValue}
        onMouseEnter={() => setActiveIndex(idx)}
        onClick={() => commitRow(idx)}
        label={allLabel}
        muted
      />,
    );
  }

  for (const section of sections) {
    if (section.heading) {
      elements.push(
        <li
          key={`heading-${section.heading}`}
          className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          aria-hidden
        >
          {section.heading}
        </li>,
      );
    }
    for (const item of section.items) {
      const idx = cursor++;
      const isSelected = item.value === selectedValue;
      elements.push(
        <Row
          key={item.value}
          index={idx}
          isActive={idx === activeIndex}
          isSelected={isSelected}
          onMouseEnter={() => setActiveIndex(idx)}
          onClick={() => commitRow(idx)}
          label={item.label}
        />,
      );
    }
  }

  return <>{elements}</>;
}

function Row({
  index,
  isActive,
  isSelected,
  onMouseEnter,
  onClick,
  label,
  muted,
}: {
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
  label: string;
  muted?: boolean;
}) {
  return (
    <li
      data-index={index}
      role="option"
      aria-selected={isSelected}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
        muted && "text-muted-foreground",
        isActive && "bg-accent text-accent-foreground",
        isSelected && "bg-brand-soft/60 font-medium text-brand-soft-foreground",
        isActive && isSelected && "bg-brand-soft text-brand-soft-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      {isSelected && (
        <HugeiconsIcon
          icon={Tick02Icon}
          size={16}
          strokeWidth={2.4}
          aria-hidden
          className="shrink-0 text-brand"
        />
      )}
    </li>
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
