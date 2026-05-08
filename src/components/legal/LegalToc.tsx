"use client";

import { useTranslations } from "next-intl";

import type { LegalTocItem } from "@/lib/data/legal";

interface LegalTocProps {
  items: LegalTocItem[];
}

/**
 * Sticky desktop sidebar (`lg:` breakpoint and up); collapsible
 * `<details>` accordion on mobile. Anchors point to the slugified IDs
 * that `processHtml()` injected onto each `<h2>` in the document body.
 *
 * Keyboard + screen reader path: each link is plain `<a href="#id">` so
 * focus moves naturally; the accordion is native `<details>` so it
 * announces expanded/collapsed state without ARIA work.
 */
export function LegalToc({ items }: LegalTocProps) {
  const t = useTranslations("legal.toc");

  if (items.length === 0) return null;

  return (
    <>
      {/* Mobile: collapsible accordion. Hidden on lg+. */}
      <details className="mb-8 rounded-2xl border border-border bg-card p-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>{t("heading")}</span>
          <svg
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-200 [details[open]_&]:rotate-180"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="m4 6 4 4 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <ol className="mt-4 space-y-2 text-sm">
          {items.map((item, i) => (
            <li key={item.id} className="flex gap-3">
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <a
                href={`#${item.id}`}
                className="text-foreground/80 underline-offset-4 hover:text-brand hover:underline"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </details>

      {/* Desktop: sticky sidebar. Hidden below lg. */}
      <nav
        aria-label={t("heading")}
        className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto"
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("heading")}
        </p>
        <ol className="space-y-2.5 text-sm">
          {items.map((item, i) => (
            <li key={item.id} className="flex gap-3">
              <span
                className="shrink-0 tabular-nums text-muted-foreground"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <a
                href={`#${item.id}`}
                className="leading-snug text-foreground/75 underline-offset-4 hover:text-brand hover:underline"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
