import type { ReactNode } from "react";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { LegalDocumentView } from "@/lib/data/legal";

import { LegalContent } from "./LegalContent";
import { LegalDraftBanner } from "./LegalDraftBanner";
import { LegalMeta } from "./LegalMeta";
import { LegalSummary } from "./LegalSummary";
import { LegalToc } from "./LegalToc";

interface LegalLayoutProps {
  doc: LegalDocumentView;
  /** Optional slot rendered after the body — e.g., related-page links. */
  footer?: ReactNode;
}

/**
 * Top-level scaffold for `/yasal/<slug>` routes. Composes:
 *   - A breadcrumb row (Anasayfa › Yasal › <Title>)
 *   - The page title + meta strip
 *   - A draft banner (only when `doc.isDraft`)
 *   - A plain-language summary panel
 *   - A two-column grid: ToC sidebar (sticky on lg+) + prose body
 *
 * Reading column is capped at ~720px (Calm Editorial: 65–75ch line
 * length) regardless of viewport size; the sidebar floats outside that
 * column on desktop.
 */
export function LegalLayout({ doc, footer }: LegalLayoutProps) {
  const t = useTranslations("legal");

  return (
    <article className="container-page py-10 sm:py-14 lg:py-16">
      <nav
        aria-label={t("breadcrumb_aria_label")}
        className="mb-6 text-xs text-muted-foreground"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href="/"
              className="underline-offset-4 hover:text-brand hover:underline"
            >
              {t("breadcrumb_home")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{t("breadcrumb_legal")}</li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground/80">{doc.title}</li>
        </ol>
      </nav>

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {doc.title}
        </h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,720px)] lg:gap-16">
        <div className="order-2 lg:order-1">
          <LegalToc items={doc.toc} />
        </div>

        <div className="order-1 lg:order-2">
          <LegalMeta version={doc.version} contactEmail={doc.contactEmail} />
          {doc.isDraft && <LegalDraftBanner contactEmail={doc.contactEmail} />}
          <LegalSummary slug={doc.slug} />
          <LegalContent html={doc.bodyHtml} />
          {footer}
        </div>
      </div>
    </article>
  );
}
